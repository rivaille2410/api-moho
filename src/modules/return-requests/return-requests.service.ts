import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import {
  Prisma,
  OrderStatus,
  ReturnStatus,
  RefundMethod,
  PaymentStatus,
} from '@prisma/client';
import { randomBytes } from 'crypto';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '@/prisma/prisma.service';

import { ProcessRefundDto } from './dto/process-refund.dto';
import { CreateReturnRequestDto } from './dto/create-return-request.dto';
import { RejectReturnRequestDto } from './dto/reject-return-request.dto';
import { QueryReturnRequestsDto } from './dto/query-return-requests.dto';
import { ApproveReturnRequestDto } from './dto/approve-return-request.dto';

import { AppEvent } from '@/common/events/event-names';
import { CloudinaryService } from '@/common/cloudinary/cloudinary.service';
import { ReturnRequestCreatedEvent } from '@/common/events/return-request.events';

const RETURN_INCLUDE = {
  items: {
    include: {
      orderItem: {
        include: {
          product: { select: { slug: true } },
          variant: { select: { colorHex: true, colorName: true } },
        },
      },
    },
  },
  images: true,
  order: { select: { orderNumber: true } },
  user: { select: { id: true, name: true, email: true, avatar: true } },
} satisfies Prisma.ReturnRequestInclude;

const RETURNABLE_ORDER_STATUSES: OrderStatus[] = [OrderStatus.DELIVERED];

const NON_ACTIONABLE_STATUSES: ReturnStatus[] = [
  ReturnStatus.REJECTED,
  ReturnStatus.COMPLETED,
  ReturnStatus.CANCELLED,
];

@Injectable()
export class ReturnRequestsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cloudinary: CloudinaryService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async findByIdOrThrow(id: string) {
    const returnRequest = await this.prisma.returnRequest.findUnique({
      where: { id },
      include: RETURN_INCLUDE,
    });
    if (!returnRequest) {
      throw new NotFoundException('Return request not found');
    }
    return returnRequest;
  }

  async findByIdForUserOrThrow(id: string, userId: string) {
    const returnRequest = await this.findByIdOrThrow(id);
    if (returnRequest.userId !== userId) {
      throw new ForbiddenException(
        'You do not have access to this return request',
      );
    }
    return returnRequest;
  }

  async findAll(query: QueryReturnRequestsDto, userId?: string) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;

    const where: Prisma.ReturnRequestWhereInput = {
      ...(userId && { userId }),
      ...(query.status && { status: query.status }),
      ...(query.search && {
        OR: [
          {
            code: {
              contains: query.search,
              mode: Prisma.QueryMode.insensitive,
            },
          },
          {
            order: {
              orderNumber: {
                contains: query.search,
                mode: Prisma.QueryMode.insensitive,
              },
            },
          },
        ],
      }),
    };

    const [data, totalItems] = await this.prisma.$transaction([
      this.prisma.returnRequest.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: RETURN_INCLUDE,
      }),
      this.prisma.returnRequest.count({ where }),
    ]);

    const totalPages = limit > 0 ? Math.ceil(totalItems / limit) : 0;

    return {
      data,
      meta: {
        page,
        limit,
        totalItems,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
    };
  }

  async create(userId: string, dto: CreateReturnRequestDto) {
    const order = await this.prisma.order.findFirst({
      where: { id: dto.orderId, userId },
      include: { items: true },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (!RETURNABLE_ORDER_STATUSES.includes(order.status)) {
      throw new BadRequestException({
        code: 'ORDER_NOT_ELIGIBLE_FOR_RETURN',
        message: 'Only delivered orders can be returned',
      });
    }

    const orderItemIds = dto.items.map((i) => i.orderItemId);
    const orderItems = order.items.filter((item) =>
      orderItemIds.includes(item.id),
    );

    if (orderItems.length !== orderItemIds.length) {
      throw new BadRequestException({
        code: 'ORDER_ITEM_NOT_FOUND',
        message: 'One or more items do not belong to this order',
      });
    }

    const existingReturnedQty = await this.prisma.returnRequestItem.groupBy({
      by: ['orderItemId'],
      where: {
        orderItemId: { in: orderItemIds },
        returnRequest: {
          status: { notIn: [ReturnStatus.REJECTED, ReturnStatus.CANCELLED] },
        },
      },
      _sum: { quantity: true },
    });
    const returnedQtyMap = new Map(
      existingReturnedQty.map((r) => [r.orderItemId, r._sum.quantity ?? 0]),
    );

    let refundAmount = new Prisma.Decimal(0);
    const itemsToCreate = dto.items.map((input) => {
      const orderItem = orderItems.find((i) => i.id === input.orderItemId)!;
      const alreadyReturned = returnedQtyMap.get(orderItem.id) ?? 0;
      const remaining = orderItem.quantity - alreadyReturned;

      if (input.quantity > remaining) {
        throw new BadRequestException({
          code: 'RETURN_QUANTITY_EXCEEDS_PURCHASED',
          message: `Requested quantity for "${orderItem.productName}" exceeds the remaining returnable quantity (${remaining})`,
        });
      }

      refundAmount = refundAmount.add(orderItem.price.mul(input.quantity));

      return {
        orderItemId: orderItem.id,
        quantity: input.quantity,
        unitPrice: orderItem.price,
      };
    });

    const code = await this.generateUniqueCode();

    const returnRequest = await this.prisma.returnRequest.create({
      data: {
        code,
        orderId: order.id,
        userId,
        reason: dto.reason,
        reasonNote: dto.reasonNote,
        refundAmount,
        items: { create: itemsToCreate },
      },
      include: RETURN_INCLUDE,
    });

    this.eventEmitter.emit(
      AppEvent.RETURN_REQUEST_CREATED,
      new ReturnRequestCreatedEvent(
        returnRequest.id,
        returnRequest.code,
        returnRequest.orderId,
        returnRequest.order.orderNumber,
        userId,
        refundAmount.toNumber(),
      ),
    );

    return returnRequest;
  }

  async addImages(id: string, userId: string, files: Express.Multer.File[]) {
    const returnRequest = await this.findByIdForUserOrThrow(id, userId);

    if (returnRequest.status !== ReturnStatus.PENDING) {
      throw new BadRequestException({
        code: 'RETURN_NOT_EDITABLE',
        message:
          'Evidence images can only be added while the request is pending review',
      });
    }

    const uploadResults = await Promise.all(
      files.map((file) => this.cloudinary.uploadProductImage(file)),
    );

    await this.prisma.returnRequestImage.createMany({
      data: uploadResults.map((result) => ({
        returnRequestId: id,
        url: result.secure_url,
      })),
    });

    return this.findByIdOrThrow(id);
  }

  async cancel(id: string, userId: string) {
    const returnRequest = await this.findByIdForUserOrThrow(id, userId);

    if (returnRequest.status !== ReturnStatus.PENDING) {
      throw new BadRequestException({
        code: 'RETURN_NOT_CANCELLABLE',
        message: 'Only requests awaiting review can be cancelled',
      });
    }

    await this.prisma.returnRequest.update({
      where: { id },
      data: { status: ReturnStatus.CANCELLED, cancelledAt: new Date() },
    });

    return this.findByIdOrThrow(id);
  }

  async approve(id: string, dto: ApproveReturnRequestDto) {
    const returnRequest = await this.assertTransition(id, ReturnStatus.PENDING);

    await this.prisma.returnRequest.update({
      where: { id: returnRequest.id },
      data: {
        status: ReturnStatus.APPROVED,
        adminNote: dto.adminNote,
        approvedAt: new Date(),
      },
    });

    return this.findByIdOrThrow(id);
  }

  async reject(id: string, dto: RejectReturnRequestDto) {
    const returnRequest = await this.assertTransition(id, ReturnStatus.PENDING);

    await this.prisma.returnRequest.update({
      where: { id: returnRequest.id },
      data: {
        status: ReturnStatus.REJECTED,
        rejectReason: dto.rejectReason,
      },
    });

    return this.findByIdOrThrow(id);
  }

  async markItemReceived(id: string) {
    const returnRequest = await this.assertTransition(
      id,
      ReturnStatus.APPROVED,
    );

    await this.prisma.returnRequest.update({
      where: { id: returnRequest.id },
      data: {
        status: ReturnStatus.ITEM_RECEIVED,
        itemReceivedAt: new Date(),
      },
    });

    return this.findByIdOrThrow(id);
  }

  async processRefund(
    id: string,
    adminId: string,
    dto: ProcessRefundDto,
    file?: Express.Multer.File,
  ) {
    const returnRequest = await this.assertTransition(
      id,
      ReturnStatus.ITEM_RECEIVED,
    );

    if (dto.refundMethod === RefundMethod.BANK_TRANSFER && !file) {
      throw new BadRequestException({
        code: 'REFUND_PROOF_REQUIRED',
        message: 'Vui lòng đính kèm ảnh chứng minh đã chuyển tiền',
      });
    }

    const uploadResult = file
      ? await this.cloudinary.uploadProductImage(file)
      : null;

    await this.prisma.$transaction(async (tx) => {
      await tx.returnRequest.update({
        where: { id: returnRequest.id },
        data: {
          status: ReturnStatus.REFUNDED,
          refundMethod: dto.refundMethod,
          refundBankName: dto.refundBankName,
          refundBankAccountNumber: dto.refundBankAccountNumber,
          refundBankAccountHolder: dto.refundBankAccountHolder,
          refundProofImageUrl: uploadResult?.secure_url,
          refundedById: adminId,
          refundedAt: new Date(),
        },
      });

      const payment = await tx.payment.findFirst({
        where: { orderId: returnRequest.orderId },
      });

      if (payment) {
        const isFullRefund = returnRequest.refundAmount.gte(payment.amount);
        await tx.payment.update({
          where: { id: payment.id },
          data: {
            status: isFullRefund
              ? PaymentStatus.REFUNDED
              : PaymentStatus.PARTIALLY_REFUNDED,
          },
        });
      }
    });

    return this.findByIdOrThrow(id);
  }

  async complete(id: string) {
    const returnRequest = await this.assertTransition(
      id,
      ReturnStatus.REFUNDED,
    );

    await this.prisma.returnRequest.update({
      where: { id: returnRequest.id },
      data: { status: ReturnStatus.COMPLETED, completedAt: new Date() },
    });

    return this.findByIdOrThrow(id);
  }

  private async assertTransition(
    id: string,
    expectedCurrentStatus: ReturnStatus,
  ) {
    const returnRequest = await this.findByIdOrThrow(id);

    if (NON_ACTIONABLE_STATUSES.includes(returnRequest.status)) {
      throw new ConflictException({
        code: 'RETURN_ALREADY_FINALIZED',
        message: `This return request is already ${returnRequest.status.toLowerCase()}`,
      });
    }

    if (returnRequest.status !== expectedCurrentStatus) {
      throw new ConflictException({
        code: 'INVALID_RETURN_STATUS_TRANSITION',
        message: `Expected status ${expectedCurrentStatus}, but current status is ${returnRequest.status}`,
      });
    }

    return returnRequest;
  }

  private async generateUniqueCode(): Promise<string> {
    for (let attempt = 0; attempt < 5; attempt++) {
      const code = `RT-${randomBytes(4).toString('hex').toUpperCase()}`;
      const existing = await this.prisma.returnRequest.findUnique({
        where: { code },
      });
      if (!existing) return code;
    }
    throw new BadRequestException('Unable to generate a unique return code');
  }
}

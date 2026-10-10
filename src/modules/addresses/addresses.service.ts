import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { Address, Prisma } from '@prisma/client';

import { PrismaService } from '@/prisma/prisma.service';

import { CreateAddressDto } from './dto/create-address.dto';
import { UpdateAddressDto } from './dto/update-address.dto';

const MAX_ADDRESSES_PER_USER = 10;

const ADDRESS_ORDER_BY: Prisma.AddressOrderByWithRelationInput[] = [
  { isDefault: 'desc' },
  { updatedAt: 'desc' },
];

@Injectable()
export class AddressesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAllForUser(userId: string): Promise<Address[]> {
    return this.prisma.address.findMany({
      where: { userId },
      orderBy: ADDRESS_ORDER_BY,
    });
  }

  async findByIdForUser(id: string, userId: string): Promise<Address> {
    const address = await this.prisma.address.findFirst({
      where: { id, userId },
    });
    if (!address) {
      throw new NotFoundException('Address not found');
    }
    return address;
  }

  async create(userId: string, dto: CreateAddressDto): Promise<Address> {
    const count = await this.prisma.address.count({ where: { userId } });
    if (count >= MAX_ADDRESSES_PER_USER) {
      throw new ConflictException({
        code: 'ADDRESS_LIMIT_REACHED',
        message: `You can save at most ${MAX_ADDRESSES_PER_USER} addresses`,
      });
    }

    // The very first address is always the default one.
    const isDefault = count === 0 ? true : (dto.isDefault ?? false);

    return this.prisma.$transaction(async (tx) => {
      if (isDefault) {
        await this.clearDefault(tx, userId);
      }
      return tx.address.create({
        data: { ...dto, userId, isDefault },
      });
    });
  }

  async update(
    id: string,
    userId: string,
    dto: UpdateAddressDto,
  ): Promise<Address> {
    const current = await this.findByIdForUser(id, userId);

    if (dto.isDefault === false && current.isDefault) {
      throw new BadRequestException({
        code: 'DEFAULT_ADDRESS_REQUIRED',
        message:
          'Cannot unset the default address. Set another address as default instead.',
      });
    }

    return this.prisma.$transaction(async (tx) => {
      if (dto.isDefault === true && !current.isDefault) {
        await this.clearDefault(tx, userId);
      }
      return tx.address.update({
        where: { id },
        data: dto,
      });
    });
  }

  async setDefault(id: string, userId: string): Promise<Address> {
    await this.findByIdForUser(id, userId);

    return this.prisma.$transaction(async (tx) => {
      await this.clearDefault(tx, userId, id);
      return tx.address.update({
        where: { id },
        data: { isDefault: true },
      });
    });
  }

  async remove(id: string, userId: string): Promise<void> {
    const address = await this.findByIdForUser(id, userId);

    await this.prisma.$transaction(async (tx) => {
      // Orders keep their shippingAddress snapshot; addressId becomes null
      // thanks to onDelete: SetNull on the relation.
      await tx.address.delete({ where: { id } });

      if (!address.isDefault) return;

      // Promote the most recently updated remaining address to default.
      const next = await tx.address.findFirst({
        where: { userId },
        orderBy: { updatedAt: 'desc' },
        select: { id: true },
      });
      if (next) {
        await tx.address.update({
          where: { id: next.id },
          data: { isDefault: true },
        });
      }
    });
  }

  private async clearDefault(
    tx: Prisma.TransactionClient,
    userId: string,
    exceptId?: string,
  ): Promise<void> {
    await tx.address.updateMany({
      where: {
        userId,
        isDefault: true,
        ...(exceptId && { id: { not: exceptId } }),
      },
      data: { isDefault: false },
    });
  }
}

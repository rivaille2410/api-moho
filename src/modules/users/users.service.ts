import {
  Injectable,
  ConflictException,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import * as argon2 from 'argon2';
import * as ExcelJS from 'exceljs';
import { PrismaService } from '@/prisma/prisma.service';
import { AuthProvider, Prisma, Role } from '@prisma/client';

import { QueryUsersDto } from './dto/query-users.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { CreateUserDto } from './dto/create-user.dto';
import { ChangePasswordDto } from './dto/change-password.dto';

import { CloudinaryService } from '@/common/cloudinary/cloudinary.service';

interface CreateUserInput {
  name: string;
  email: string;
  avatar?: string;
  googleId?: string;
  provider?: AuthProvider;
  password?: string | null;
}

interface UpdateUserInput {
  avatar?: string;
  googleId?: string;
  password?: string;
  emailVerified?: boolean;
}

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cloudinary: CloudinaryService,
  ) {}

  async findByEmail(email: string) {
    return this.prisma.user.findFirst({
      where: { email, deletedAt: null },
    });
  }

  async findById(id: string) {
    return this.prisma.user.findFirst({
      where: { id, deletedAt: null },
    });
  }

  async findByIdOrThrow(id: string) {
    const user = await this.findById(id);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
  }

  async findAll(query: QueryUsersDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const { search, role, emailVerified, banned } = query;

    const where: Prisma.UserWhereInput = {
      deletedAt: null,
      ...(role && { role }),
      ...(emailVerified !== undefined && { emailVerified }),
      ...(banned !== undefined && {
        bannedAt: banned ? { not: null } : null,
      }),
      ...(search && {
        OR: [
          { name: { contains: search, mode: Prisma.QueryMode.insensitive } },
          { email: { contains: search, mode: Prisma.QueryMode.insensitive } },
        ],
      }),
    };

    const [data, totalItems] = await this.prisma.$transaction([
      this.prisma.user.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.user.count({ where }),
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

  async exportToExcel(query: QueryUsersDto): Promise<Buffer> {
    const { search, role, emailVerified, banned } = query;

    const where: Prisma.UserWhereInput = {
      deletedAt: null,
      ...(role && { role }),
      ...(emailVerified !== undefined && { emailVerified }),
      ...(banned !== undefined && {
        bannedAt: banned ? { not: null } : null,
      }),
      ...(search && {
        OR: [
          { name: { contains: search, mode: Prisma.QueryMode.insensitive } },
          { email: { contains: search, mode: Prisma.QueryMode.insensitive } },
        ],
      }),
    };

    const users = await this.prisma.user.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Users');

    sheet.columns = [
      { header: 'Tên', key: 'name', width: 25 },
      { header: 'Email', key: 'email', width: 30 },
      { header: 'Vai trò', key: 'role', width: 15 },
      { header: 'Trạng thái', key: 'status', width: 15 },
      { header: 'Xác thực email', key: 'emailVerified', width: 18 },
      { header: 'Ngày tham gia', key: 'createdAt', width: 20 },
    ];
    sheet.getRow(1).font = { bold: true };

    users.forEach((user) => {
      sheet.addRow({
        name: user.name,
        email: user.email,
        role: user.role === Role.ADMIN ? 'Quản trị viên' : 'Người dùng',
        status: user.bannedAt ? 'Đã khoá' : 'Hoạt động',
        emailVerified: user.emailVerified ? 'Đã xác thực' : 'Chưa xác thực',
        createdAt: user.createdAt.toLocaleDateString('vi-VN'),
      });
    });

    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }

  async create(data: CreateUserInput) {
    return this.prisma.user.create({
      data: {
        name: data.name,
        email: data.email,
        password: data.password ?? null,
        googleId: data.googleId,
        avatar: data.avatar,
        provider: data.provider ?? AuthProvider.LOCAL,
      },
    });
  }

  async createByAdmin(dto: CreateUserDto) {
    try {
      const hashedPassword = await argon2.hash(dto.password);

      return await this.prisma.user.create({
        data: {
          name: dto.name,
          email: dto.email,
          password: hashedPassword,
          provider: AuthProvider.LOCAL,
          emailVerified: true,
          role: dto.role ?? Role.CUSTOMER,
        },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException({
          code: 'EMAIL_ALREADY_IN_USE',
          message: 'Email is already in use',
        });
      }
      throw error;
    }
  }

  async update(id: string, data: UpdateUserInput) {
    return this.prisma.user.update({
      where: { id },
      data,
    });
  }

  async updateProfile(id: string, dto: UpdateUserDto) {
    await this.findByIdOrThrow(id);
    return this.prisma.user.update({
      where: { id },
      data: dto,
    });
  }

  async updateRole(id: string, role: Role, currentUserId?: string) {
    if (currentUserId && id === currentUserId) {
      throw new ForbiddenException({
        code: 'CANNOT_CHANGE_OWN_ROLE',
        message: 'You cannot change your own role',
      });
    }

    const user = await this.findByIdOrThrow(id);

    if (user.role === Role.ADMIN && role !== Role.ADMIN) {
      const adminCount = await this.prisma.user.count({
        where: { role: Role.ADMIN, deletedAt: null },
      });

      if (adminCount <= 1) {
        throw new BadRequestException({
          code: 'LAST_ADMIN',
          message: 'Cannot demote the last remaining admin',
        });
      }
    }

    return this.prisma.user.update({
      where: { id },
      data: { role },
    });
  }

  async ban(id: string, currentUserId: string) {
    if (id === currentUserId) {
      throw new ForbiddenException({
        code: 'CANNOT_BAN_SELF',
        message: 'You cannot ban your own account',
      });
    }

    const user = await this.findByIdOrThrow(id);

    if (user.role === Role.ADMIN) {
      throw new ForbiddenException({
        code: 'CANNOT_BAN_ADMIN',
        message: 'Cannot ban an admin account',
      });
    }

    if (user.bannedAt) {
      throw new BadRequestException({
        code: 'ALREADY_BANNED',
        message: 'User is already banned',
      });
    }

    const banned = await this.prisma.user.update({
      where: { id },
      data: { bannedAt: new Date() },
    });

    await this.prisma.refreshToken.updateMany({
      where: { userId: id, revoked: false },
      data: { revoked: true },
    });

    return banned;
  }

  async unban(id: string) {
    const user = await this.findByIdOrThrow(id);

    if (!user.bannedAt) {
      throw new BadRequestException({
        code: 'NOT_BANNED',
        message: 'User is not banned',
      });
    }

    return this.prisma.user.update({
      where: { id },
      data: { bannedAt: null },
    });
  }

  async updateAvatar(id: string, file: Express.Multer.File) {
    const user = await this.findByIdOrThrow(id);

    const uploadResult = await this.cloudinary.uploadAvatar(file);

    if (user.avatar) {
      const previousPublicId = this.cloudinary.extractPublicId(user.avatar);
      if (previousPublicId) {
        await this.cloudinary
          .deleteAsset(previousPublicId)
          .catch(() => undefined);
      }
    }

    return this.prisma.user.update({
      where: { id },
      data: { avatar: uploadResult.secure_url },
    });
  }

  async changePassword(id: string, dto: ChangePasswordDto) {
    const user = await this.findByIdOrThrow(id);

    if (!user.password) {
      throw new BadRequestException({
        code: 'NO_PASSWORD_SET',
        message: 'This account has no password set (signed in via Google)',
      });
    }

    const isMatch = await argon2.verify(user.password, dto.currentPassword);
    if (!isMatch) {
      throw new UnauthorizedException({
        code: 'INVALID_PASSWORD',
        message: 'Current password is incorrect',
      });
    }

    if (dto.newPassword === dto.currentPassword) {
      throw new BadRequestException({
        code: 'SAME_PASSWORD',
        message: 'New password must be different from the current password',
      });
    }

    const hashedPassword = await argon2.hash(dto.newPassword, {
      type: argon2.argon2id,
    });

    await this.prisma.user.update({
      where: { id },
      data: { password: hashedPassword },
    });
  }

  async remove(id: string) {
    const user = await this.findByIdOrThrow(id);
    await this.prisma.user.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        email: `deleted_${Date.now()}_${user.email}`,
      },
    });
  }

  async bulkRemove(ids: string[], currentUserId: string) {
    if (ids.includes(currentUserId)) {
      throw new ForbiddenException({
        code: 'CANNOT_DELETE_SELF',
        message: 'You cannot delete your own account',
      });
    }

    const users = await this.prisma.user.findMany({
      where: { id: { in: ids }, deletedAt: null },
    });

    const foundIds = users.map((user) => user.id);
    const notFoundIds = ids.filter((id) => !foundIds.includes(id));

    if (notFoundIds.length > 0) {
      throw new NotFoundException({
        code: 'USERS_NOT_FOUND',
        message: `The following user IDs were not found: ${notFoundIds.join(', ')}`,
      });
    }

    const adminIds = users
      .filter((user) => user.role === Role.ADMIN)
      .map((user) => user.id);

    if (adminIds.length > 0) {
      throw new ForbiddenException({
        code: 'CANNOT_DELETE_ADMIN',
        message: `Cannot delete admin accounts: ${adminIds.join(', ')}`,
      });
    }

    const now = new Date();
    const result = await this.prisma.$transaction(
      users.map((user) =>
        this.prisma.user.update({
          where: { id: user.id },
          data: {
            deletedAt: now,
            email: `deleted_${now.getTime()}_${user.email}`,
          },
        }),
      ),
    );

    return { deletedCount: result.length };
  }

  async restore(id: string) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user || !user.deletedAt) {
      throw new NotFoundException('Deleted user not found');
    }
    return this.prisma.user.update({
      where: { id },
      data: { deletedAt: null },
    });
  }
}

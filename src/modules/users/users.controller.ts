import {
  Get,
  Res,
  Post,
  Body,
  Param,
  Patch,
  Query,
  Delete,
  HttpCode,
  HttpStatus,
  Controller,
  UploadedFile,
  ParseUUIDPipe,
  UseInterceptors,
  ParseFilePipeBuilder,
} from '@nestjs/common';
import type { Response } from 'express';
import { ApiTags } from '@nestjs/swagger';
import type { User } from '@prisma/client';
import { FileInterceptor } from '@nestjs/platform-express';

import {
  ApiBanUser,
  ApiUnbanUser,
  ApiListUsers,
  ApiCreateUser,
  ApiDeleteUser,
  ApiGetUserById,
  ApiExportUsers,
  ApiUpdateAvatar,
  ApiChangeUserRole,
  ApiChangePassword,
  ApiBulkDeleteUsers,
  ApiUpdateCurrentUser,
} from './users.swagger';
import { UsersService } from './users.service';

import { QueryUsersDto } from './dto/query-users.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { CreateUserDto } from './dto/create-user.dto';
import { UserResponseDto } from './dto/user-response.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { UpdateUserRoleDto } from './dto/update-user-role.dto';
import { BulkDeleteUsersDto } from './dto/bulk-delete-users.dto';
import { Admin, CurrentUser } from '@/common/decorators';

@ApiTags('Users')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @Admin()
  @ApiListUsers()
  async findAll(@Query() query: QueryUsersDto) {
    const { data, meta } = await this.usersService.findAll(query);
    return {
      data: data.map((user) => new UserResponseDto(user)),
      meta,
    };
  }

  @Post()
  @Admin()
  @ApiCreateUser()
  async create(@Body() dto: CreateUserDto) {
    const user = await this.usersService.createByAdmin(dto);
    return new UserResponseDto(user);
  }

  @Patch('me')
  @ApiUpdateCurrentUser()
  async updateMe(@CurrentUser() user: User, @Body() dto: UpdateUserDto) {
    const updated = await this.usersService.updateProfile(user.id, dto);
    return new UserResponseDto(updated);
  }

  @Patch('me/avatar')
  @UseInterceptors(FileInterceptor('file'))
  @ApiUpdateAvatar()
  async updateAvatar(
    @CurrentUser() user: User,
    @UploadedFile(
      new ParseFilePipeBuilder()
        .addFileTypeValidator({ fileType: /(jpg|jpeg|png|webp)$/ })
        .addMaxSizeValidator({ maxSize: 5 * 1024 * 1024 })
        .build({ errorHttpStatusCode: HttpStatus.UNPROCESSABLE_ENTITY }),
    )
    file: Express.Multer.File,
  ) {
    const updated = await this.usersService.updateAvatar(user.id, file);
    return new UserResponseDto(updated);
  }

  @Patch('me/password')
  @ApiChangePassword()
  async changePassword(
    @CurrentUser() user: User,
    @Body() dto: ChangePasswordDto,
  ) {
    await this.usersService.changePassword(user.id, dto);
    return { message: 'Password updated successfully' };
  }

  @Get('export')
  @Admin()
  @ApiExportUsers()
  async exportUsers(@Query() query: QueryUsersDto, @Res() res: Response) {
    const buffer = await this.usersService.exportToExcel(query);

    res.set({
      'Content-Type':
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="users-${Date.now()}.xlsx"`,
    });
    res.send(buffer);
  }

  @Get(':id')
  @Admin()
  @ApiGetUserById()
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    const user = await this.usersService.findByIdOrThrow(id);
    return new UserResponseDto(user);
  }

  @Patch(':id/role')
  @Admin()
  @ApiChangeUserRole()
  async changeRole(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateUserRoleDto,
    @CurrentUser() currentUser: User,
  ) {
    const updated = await this.usersService.updateRole(
      id,
      dto.role,
      currentUser.id,
    );
    return new UserResponseDto(updated);
  }

  @Patch(':id/ban')
  @Admin()
  @ApiBanUser()
  async ban(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() currentUser: User,
  ) {
    const banned = await this.usersService.ban(id, currentUser.id);
    return new UserResponseDto(banned);
  }

  @Patch(':id/unban')
  @Admin()
  @ApiUnbanUser()
  async unban(@Param('id', ParseUUIDPipe) id: string) {
    const unbanned = await this.usersService.unban(id);
    return new UserResponseDto(unbanned);
  }

  @Delete('bulk')
  @Admin()
  @ApiBulkDeleteUsers()
  async bulkRemove(
    @Body() dto: BulkDeleteUsersDto,
    @CurrentUser() currentUser: User,
  ) {
    return this.usersService.bulkRemove(dto.ids, currentUser.id);
  }

  @Delete(':id')
  @Admin()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiDeleteUser()
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    await this.usersService.remove(id);
  }
}

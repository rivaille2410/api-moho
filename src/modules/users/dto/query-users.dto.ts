import {
  Max,
  Min,
  IsInt,
  IsEnum,
  IsString,
  IsBoolean,
  IsOptional,
} from 'class-validator';
import { Role } from '@prisma/client';
import { Transform, Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class QueryUsersDto {
  @ApiPropertyOptional({
    example: 1,
    default: 1,
    minimum: 1,
    description: 'Page number',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({
    example: 10,
    default: 10,
    minimum: 1,
    maximum: 100,
    description: 'Number of items per page',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 10;

  @ApiPropertyOptional({
    example: 'john',
    description: 'Search by name or email',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    enum: Role,
    example: Role.CUSTOMER,
    description: 'Filter by role',
  })
  @IsOptional()
  @IsEnum(Role)
  role?: Role;

  @ApiPropertyOptional({
    example: true,
    description: 'Filter by email verification status',
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
  })
  @IsBoolean()
  emailVerified?: boolean;

  @ApiPropertyOptional({
    example: false,
    description: 'Filter by banned status',
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
  })
  @IsBoolean()
  banned?: boolean;
}

import {
  IsEnum,
  IsEmail,
  Matches,
  IsString,
  MaxLength,
  MinLength,
  IsOptional,
} from 'class-validator';
import { Role } from '@prisma/client';
import { Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateUserDto {
  @ApiProperty({ example: 'John Doe' })
  @IsString()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @MinLength(2, { message: 'Full name must be at least 2 characters long' })
  @MaxLength(50, { message: 'Full name must not exceed 50 characters' })
  @Matches(/^[\p{L}\s]+$/u, {
    message: 'Full name must only contain letters and spaces',
  })
  @Matches(/^(?!.*\s{2,}).*$/, {
    message: 'Full name must not contain consecutive spaces',
  })
  name: string;

  @ApiProperty({ example: 'user@example.com' })
  @IsEmail({}, { message: 'Invalid email address' })
  email: string;

  @ApiProperty({ example: 'Password123!', minLength: 8, maxLength: 72 })
  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters long' })
  @MaxLength(72, { message: 'Password must not exceed 72 characters' })
  @Matches(/[a-z]/, {
    message: 'Password must contain at least 1 lowercase letter',
  })
  @Matches(/[A-Z]/, {
    message: 'Password must contain at least 1 uppercase letter',
  })
  @Matches(/[0-9]/, { message: 'Password must contain at least 1 number' })
  @Matches(/[^a-zA-Z0-9]/, {
    message: 'Password must contain at least 1 special character',
  })
  password: string;

  @ApiPropertyOptional({
    enum: Role,
    example: Role.CUSTOMER,
    default: Role.CUSTOMER,
  })
  @IsOptional()
  @IsEnum(Role)
  role?: Role;
}

import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MinLength } from 'class-validator';

export class CreateAdminDto {
  @ApiProperty({ example: 'John Doe' })
  @IsString()
  name: string;

  @ApiProperty({ example: 'admin@company.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'SecureP@ss2024', minLength: 8 })
  @IsString()
  @MinLength(8)
  password: string;
}

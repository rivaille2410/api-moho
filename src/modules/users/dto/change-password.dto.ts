import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class ChangePasswordDto {
  @ApiProperty({ example: 'CurrentP@ss2024' })
  @IsString()
  currentPassword: string;

  @ApiProperty({ example: 'NewSecureP@ss2024', minLength: 8 })
  @IsString()
  @MinLength(8)
  newPassword: string;
}

import { ApiProperty } from '@nestjs/swagger';
import { AuthProvider, Role, User } from '@prisma/client';

export class UserResponseDto {
  @ApiProperty({ example: 'b3f1a2c4-5d6e-4f7a-8b9c-0d1e2f3a4b5c' })
  id: string;

  @ApiProperty({ example: 'John Doe' })
  name: string;

  @ApiProperty({ example: 'user@example.com' })
  email: string;

  @ApiProperty({
    example:
      'https://res.cloudinary.com/demo/image/upload/v1690000000/avatars/abc123.jpg',
    nullable: true,
  })
  avatar: string | null;

  @ApiProperty({ enum: Role, example: Role.CUSTOMER })
  role: Role;

  @ApiProperty({ enum: AuthProvider, example: AuthProvider.LOCAL })
  provider: AuthProvider;

  @ApiProperty({ example: true })
  emailVerified: boolean;

  @ApiProperty({ example: null, nullable: true })
  bannedAt: Date | null;

  @ApiProperty({ example: '2025-01-01T00:00:00.000Z' })
  createdAt: Date;

  constructor(user: User) {
    this.id = user.id;
    this.name = user.name;
    this.email = user.email;
    this.avatar = user.avatar;
    this.role = user.role;
    this.provider = user.provider;
    this.emailVerified = user.emailVerified;
    this.bannedAt = user.bannedAt;
    this.createdAt = user.createdAt;
  }
}

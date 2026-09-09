import { Role } from '@prisma/client';

export interface CurrentUserPayload {
  id: string;
  name: string;
  email: string;
  avatar: string | null;
  role: Role;
}

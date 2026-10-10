import { Role } from '@prisma/client';

export type CurrentUserPayload = {
  id: string;
  name: string;
  email: string;
  avatar: string | null;
  role: Role;
};

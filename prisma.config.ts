import 'dotenv/config';
import { defineConfig, env } from 'prisma/config';

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    seed: 'node -r ts-node/register -r tsconfig-paths/register src/prisma/seed.ts',
  },
  datasource: {
    url: env('DIRECT_URL'),
  },
});

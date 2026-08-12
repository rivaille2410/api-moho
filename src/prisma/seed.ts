import 'dotenv/config';
import * as argon2 from 'argon2';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient, Role, AuthProvider } from '@prisma/client';

const FIRST_NAMES = [
  'An',
  'Bình',
  'Chi',
  'Dũng',
  'Giang',
  'Hà',
  'Hải',
  'Hùng',
  'Huy',
  'Khánh',
  'Lan',
  'Linh',
  'Long',
  'Mai',
  'Minh',
  'Nam',
  'Ngọc',
  'Nhung',
  'Phong',
  'Phương',
  'Quân',
  'Quang',
  'Sơn',
  'Thảo',
  'Thắng',
  'Thu',
  'Thủy',
  'Trang',
  'Trung',
  'Tuấn',
  'Tú',
  'Việt',
  'Vy',
  'Xuân',
  'Yến',
];
const LAST_NAMES = [
  'Nguyễn',
  'Trần',
  'Lê',
  'Phạm',
  'Hoàng',
  'Huỳnh',
  'Phan',
  'Vũ',
  'Võ',
  'Đặng',
  'Bùi',
  'Đỗ',
  'Hồ',
  'Ngô',
  'Dương',
];

function randomItem<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function generateName(): string {
  return `${randomItem(LAST_NAMES)} ${randomItem(FIRST_NAMES)}`;
}

function slugify(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '.')
    .replace(/^\.+|\.+$/g, '');
}

const USER_COUNT = Number(process.env.SEED_USER_COUNT ?? 50);
const DEFAULT_PASSWORD = process.env.SEED_USER_PASSWORD ?? 'Password123!';
const EMAIL_DOMAIN = process.env.SEED_USER_EMAIL_DOMAIN ?? 'example.com';

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL must be set in .env');
  }

  const adapter = new PrismaPg({ connectionString });
  const prisma = new PrismaClient({ adapter });

  try {
    const hashedPassword = await argon2.hash(DEFAULT_PASSWORD);

    let created = 0;
    let skipped = 0;

    for (let i = 0; i < USER_COUNT; i++) {
      const name = generateName();
      const email = `${slugify(name)}.${i + 1}@${EMAIL_DOMAIN}`;

      const existing = await prisma.user.findFirst({ where: { email } });
      if (existing) {
        skipped++;
        continue;
      }

      const role = Math.random() < 0.1 ? Role.ADMIN : Role.CUSTOMER;
      const emailVerified = Math.random() < 0.8;

      const user = await prisma.user.create({
        data: {
          name,
          email,
          password: hashedPassword,
          role,
          emailVerified,
          provider: AuthProvider.LOCAL,
        },
      });

      created++;
      console.log(`  [${created}] ${user.email} (${role})`);
    }

    console.log(`✅ Đã tạo ${created} user, bỏ qua ${skipped} (đã tồn tại).`);
    console.log(`ℹ️  Mật khẩu mặc định cho tất cả: ${DEFAULT_PASSWORD}`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error('❌ Seed failed:', e);
  process.exit(1);
});

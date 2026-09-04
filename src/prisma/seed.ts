import 'dotenv/config';
import * as argon2 from 'argon2';
import { PrismaPg } from '@prisma/adapter-pg';
import {
  PrismaClient,
  ProductStatus,
  Role,
  AuthProvider,
} from '@prisma/client';

function slugify(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomPick<T>(arr: T[]): T {
  return arr[randomInt(0, arr.length - 1)];
}

function randomSample<T>(arr: T[], count: number): T[] {
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(count, arr.length));
}

function roundPrice(value: number): number {
  return Math.round(value / 10_000) * 10_000;
}

async function seedAdmin(prisma: PrismaClient) {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;
  const name = process.env.ADMIN_NAME ?? 'Admin';

  if (!email || !password) {
    console.log(
      '⚠️  Bỏ qua seed admin: thiếu ADMIN_EMAIL / ADMIN_PASSWORD trong .env',
    );
    return;
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    console.log(`ℹ️  User admin (${email}) đã tồn tại, bỏ qua.\n`);
    return;
  }

  const passwordHash = await argon2.hash(password);

  await prisma.user.create({
    data: {
      name,
      email,
      password: passwordHash,
      provider: AuthProvider.LOCAL,
      role: Role.ADMIN,
      emailVerified: true,
    },
  });

  console.log(`✅ Đã tạo user admin: ${email}\n`);
}

const CATEGORY_TREE: Record<string, string[]> = {
  'Phòng khách': ['Sofa', 'Bàn trà', 'Kệ tivi', 'Ghế thư giãn'],
  'Phòng ngủ': ['Giường ngủ', 'Tủ quần áo', 'Bàn trang điểm', 'Nệm'],
  'Phòng ăn & Nhà bếp': ['Bàn ăn', 'Ghế ăn', 'Tủ bếp', 'Kệ gia vị'],
  'Phòng làm việc': ['Bàn làm việc', 'Ghế văn phòng', 'Kệ sách'],
  'Nội thất phòng tắm': ['Tủ lavabo', 'Gương phòng tắm', 'Kệ phòng tắm'],
  'Ngoại thất & Sân vườn': ['Bàn ghế sân vườn', 'Xích đu', 'Ô dù che nắng'],
  'Đèn & Chiếu sáng': ['Đèn trần', 'Đèn bàn', 'Đèn sàn'],
  'Trang trí nội thất': ['Tranh treo tường', 'Bình hoa', 'Gương trang trí'],
  'Rèm & Thảm': ['Rèm cửa', 'Thảm trải sàn'],
  'Lưu trữ & Tủ kệ': ['Kệ đa năng', 'Tủ lưu trữ', 'Kệ giày'],
  'Nội thất trẻ em': ['Giường tầng trẻ em', 'Bàn học trẻ em', 'Tủ đồ chơi'],
  'Nội thất văn phòng & Dự án': [
    'Bàn họp',
    'Ghế hội trường',
    'Vách ngăn văn phòng',
  ],
  'Vật liệu & Phụ kiện nội thất': [
    'Phụ kiện tủ',
    'Tay nắm nội thất',
    'Bánh xe đồ nội thất',
  ],
};

async function seedCategories(prisma: PrismaClient) {
  console.log('🗂️  Seeding categories...');
  let createdCount = 0;

  for (const [parentName, children] of Object.entries(CATEGORY_TREE)) {
    const parentSlug = slugify(parentName);

    const parent = await prisma.category.upsert({
      where: { slug: parentSlug },
      update: {},
      create: { name: parentName, slug: parentSlug },
    });

    for (const childName of children) {
      const childSlug = slugify(`${parentName}-${childName}`);

      const existing = await prisma.category.findUnique({
        where: { slug: childSlug },
      });

      if (!existing) {
        await prisma.category.create({
          data: { name: childName, slug: childSlug, parentId: parent.id },
        });
        createdCount++;
      }
    }
  }

  console.log(`✅ Categories ready (${createdCount} danh mục con mới tạo).\n`);
}

const STYLE_ADJECTIVES = [
  'Hiện đại',
  'Tối giản',
  'Cổ điển',
  'Sang trọng',
  'Phong cách Bắc Âu',
  'Phong cách Nhật Bản',
  'Phong cách Indochine',
  'Phong cách Industrial',
  'Cao cấp',
  'Thanh lịch',
];

const MATERIALS_POOL = [
  'Gỗ sồi tự nhiên',
  'Gỗ óc chó',
  'Gỗ cao su',
  'Gỗ công nghiệp phủ Melamine',
  'Thép sơn tĩnh điện',
  'Vải nỉ Hàn Quốc',
  'Da PU cao cấp',
  'Mây tự nhiên',
  'Nhựa PP nguyên sinh',
  'Kính cường lực',
  'Đá cẩm thạch nhân tạo',
  'Nhôm hợp kim',
];

const COLOR_VARIANTS = [
  { name: 'Trắng', hex: '#F5F5F0' },
  { name: 'Đen', hex: '#1A1A1A' },
  { name: 'Nâu gỗ tự nhiên', hex: '#8B5E3C' },
  { name: 'Be', hex: '#E8DCC8' },
  { name: 'Xám', hex: '#8C8C8C' },
  { name: 'Xanh rêu', hex: '#5B6B4E' },
  { name: 'Vàng đồng', hex: '#B8860B' },
  { name: 'Xanh navy', hex: '#1F2A44' },
];

const PRICE_RANGES: Record<string, [number, number]> = {
  'Phòng khách': [1_500_000, 25_000_000],
  'Phòng ngủ': [2_000_000, 30_000_000],
  'Phòng ăn & Nhà bếp': [1_000_000, 20_000_000],
  'Phòng làm việc': [800_000, 12_000_000],
  'Nội thất phòng tắm': [500_000, 8_000_000],
  'Ngoại thất & Sân vườn': [700_000, 15_000_000],
  'Đèn & Chiếu sáng': [200_000, 5_000_000],
  'Trang trí nội thất': [100_000, 3_000_000],
  'Rèm & Thảm': [150_000, 4_000_000],
  'Lưu trữ & Tủ kệ': [500_000, 10_000_000],
  'Nội thất trẻ em': [800_000, 12_000_000],
  'Nội thất văn phòng & Dự án': [1_000_000, 20_000_000],
  'Vật liệu & Phụ kiện nội thất': [50_000, 2_000_000],
};
const DEFAULT_PRICE_RANGE: [number, number] = [500_000, 10_000_000];

const HAS_DIMENSIONS = new Set([
  'Phòng khách',
  'Phòng ngủ',
  'Phòng ăn & Nhà bếp',
  'Phòng làm việc',
  'Nội thất phòng tắm',
  'Ngoại thất & Sân vườn',
  'Lưu trữ & Tủ kệ',
  'Nội thất trẻ em',
  'Nội thất văn phòng & Dự án',
]);

const PRODUCTS_PER_CATEGORY = 3;

function randomStatus(): ProductStatus {
  const roll = Math.random();
  if (roll < 0.75) return ProductStatus.ACTIVE;
  if (roll < 0.9) return ProductStatus.DRAFT;
  return ProductStatus.ARCHIVED;
}

async function generateUniqueSku(
  prisma: PrismaClient,
  categorySlug: string,
): Promise<string> {
  const prefix = categorySlug
    .split('-')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 4);

  for (let attempt = 0; attempt < 10; attempt++) {
    const random = Math.random().toString(36).slice(2, 8).toUpperCase();
    const sku = `${prefix}-${random}`;
    const existing = await prisma.product.findUnique({ where: { sku } });
    if (!existing) return sku;
  }

  throw new Error(`Unable to generate unique SKU for prefix ${prefix}`);
}

async function generateUniqueSlug(
  prisma: PrismaClient,
  name: string,
): Promise<string> {
  const baseSlug = slugify(name);
  let slug = baseSlug;
  let suffix = 1;

  while (await prisma.product.findUnique({ where: { slug } })) {
    slug = `${baseSlug}-${suffix}`;
    suffix += 1;
  }

  return slug;
}

async function buildProductData(
  prisma: PrismaClient,
  category: { id: string; name: string; slug: string; parentName: string },
) {
  const adjective = randomPick(STYLE_ADJECTIVES);
  const name = `${category.name} ${adjective}`;

  const [minPrice, maxPrice] =
    PRICE_RANGES[category.parentName] ?? DEFAULT_PRICE_RANGE;
  const price = roundPrice(randomInt(minPrice, maxPrice));

  const hasDiscount = Math.random() < 0.4;
  const compareAtPrice = hasDiscount
    ? roundPrice(price * (1 + randomInt(10, 30) / 100))
    : undefined;

  const hasDimensions = HAS_DIMENSIONS.has(category.parentName);
  const dimensions = hasDimensions
    ? {
        length: randomInt(40, 220),
        width: randomInt(30, 120),
        height: randomInt(30, 200),
      }
    : {};

  const materials = randomSample(MATERIALS_POOL, randomInt(1, 3)).map(
    (material, i) => ({
      label: i === 0 ? 'Chất liệu chính' : 'Chất liệu phụ',
      value: material,
      sortOrder: i,
    }),
  );

  const status = randomStatus();

  const colorVariants = randomSample(COLOR_VARIANTS, randomInt(2, 4));
  const variants = colorVariants.map((color, i) => ({
    name: color.name,
    colorHex: color.hex,
    colorName: color.name,
    priceOverride: undefined,
    stock: status === ProductStatus.ARCHIVED ? 0 : randomInt(0, 50),
    sortOrder: i,
  }));

  const sku = await generateUniqueSku(prisma, category.slug);
  const slug = await generateUniqueSlug(prisma, name);

  return {
    name,
    slug,
    sku,
    description: `${name} thuộc danh mục ${category.name}, chất liệu ${materials[0]?.value.toLowerCase() ?? 'cao cấp'}, phù hợp với không gian ${adjective.toLowerCase()}.`,
    price,
    compareAtPrice,
    ...dimensions,
    categoryId: category.id,
    status,
    soldCount:
      status === ProductStatus.ACTIVE ? randomInt(0, 300) : randomInt(0, 20),
    materials: { create: materials },
    variants: { create: variants },
  };
}

async function seedProducts(prisma: PrismaClient) {
  const leafCategories = await prisma.category.findMany({
    where: { parentId: { not: null }, deletedAt: null },
    include: { parent: true },
  });

  if (leafCategories.length === 0) {
    console.log(
      '⚠️  Vẫn chưa có danh mục con nào sau khi seed category, dừng lại.',
    );
    return;
  }

  let created = 0;

  for (const category of leafCategories) {
    console.log(`\n📁 ${category.parent?.name} / ${category.name}`);

    for (let i = 0; i < PRODUCTS_PER_CATEGORY; i++) {
      const data = await buildProductData(prisma, {
        id: category.id,
        name: category.name,
        slug: category.slug,
        parentName: category.parent?.name ?? '',
      });

      await prisma.product.create({ data });
      created++;
      console.log(`  ✅ ${data.name} (${data.sku})`);
    }
  }

  console.log(`\n✅ Đã tạo ${created} sản phẩm.`);
  console.log('ℹ️  Ảnh sản phẩm chưa được seed, thêm sau qua API upload.');
}

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL must be set in .env');
  }

  const adapter = new PrismaPg({ connectionString });
  const prisma = new PrismaClient({ adapter });

  try {
    await seedAdmin(prisma);
    await seedCategories(prisma);
    await seedProducts(prisma);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error('❌ Seed failed:', e);
  process.exit(1);
});

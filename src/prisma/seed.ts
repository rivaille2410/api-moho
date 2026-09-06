import {
  Role,
  PostStatus,
  VoucherType,
  OrderStatus,
  VoucherScope,
  PrismaClient,
  AuthProvider,
  ProductStatus,
  VoucherStatus,
  PaymentMethod,
  PaymentStatus,
  ConfirmationType,
} from '@prisma/client';
import 'dotenv/config';
import * as argon2 from 'argon2';
import { PrismaPg } from '@prisma/adapter-pg';

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

function randomPastDate(maxDaysAgo: number, minDaysAgo = 0): Date {
  const day = 24 * 60 * 60 * 1000;
  const offset = randomInt(minDaysAgo, maxDaysAgo);
  const jitterMs = randomInt(0, day - 1);
  return new Date(Date.now() - offset * day - jitterMs);
}

function randomToken(length = 40): string {
  const chars =
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let out = '';
  for (let i = 0; i < length; i++) {
    out += chars[randomInt(0, chars.length - 1)];
  }
  return out;
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
}

type VoucherSeedDef = {
  code: string;
  name: string;
  description?: string;
  type: VoucherType;
  value: number;
  maxDiscount?: number;
  minOrderValue?: number;
  scope: VoucherScope;
  usageLimit?: number;
  usageLimitPerUser?: number;
  startOffsetDays: number;
  endOffsetDays: number;
  isPublic?: boolean;
  status: VoucherStatus;
};

const VOUCHER_DEFS: VoucherSeedDef[] = [
  {
    code: 'CHAOMOI10',
    name: 'Chào mừng thành viên mới',
    description: 'Giảm 10% cho đơn hàng đầu tiên, tối đa 100.000đ.',
    type: VoucherType.PERCENT,
    value: 10,
    maxDiscount: 100_000,
    minOrderValue: 300_000,
    scope: VoucherScope.ALL,
    usageLimit: 500,
    usageLimitPerUser: 1,
    startOffsetDays: -30,
    endOffsetDays: 60,
    isPublic: true,
    status: VoucherStatus.ACTIVE,
  },
  {
    code: 'FREESHIP50',
    name: 'Giảm phí vận chuyển',
    description: 'Giảm trực tiếp 50.000đ cho đơn từ 500.000đ.',
    type: VoucherType.FIXED,
    value: 50_000,
    minOrderValue: 500_000,
    scope: VoucherScope.ALL,
    usageLimit: 1000,
    usageLimitPerUser: 2,
    startOffsetDays: -10,
    endOffsetDays: 20,
    isPublic: true,
    status: VoucherStatus.ACTIVE,
  },
  {
    code: 'SALE20PK',
    name: 'Ưu đãi phòng khách',
    description: 'Giảm 20% cho các danh mục phòng khách được chọn.',
    type: VoucherType.PERCENT,
    value: 20,
    maxDiscount: 500_000,
    minOrderValue: 1_000_000,
    scope: VoucherScope.CATEGORY,
    usageLimit: 200,
    usageLimitPerUser: 1,
    startOffsetDays: -5,
    endOffsetDays: 15,
    isPublic: true,
    status: VoucherStatus.ACTIVE,
  },
  {
    code: 'VIP500K',
    name: 'Ưu đãi khách hàng thân thiết',
    description: 'Giảm 500.000đ cho đơn hàng từ 5.000.000đ, không công khai.',
    type: VoucherType.FIXED,
    value: 500_000,
    minOrderValue: 5_000_000,
    scope: VoucherScope.ALL,
    usageLimit: 50,
    usageLimitPerUser: 1,
    startOffsetDays: -1,
    endOffsetDays: 45,
    isPublic: false,
    status: VoucherStatus.ACTIVE,
  },
  {
    code: 'FLASH15',
    name: 'Flash sale sản phẩm nổi bật',
    description:
      'Giảm 15% cho một số sản phẩm được chọn trong thời gian giới hạn.',
    type: VoucherType.PERCENT,
    value: 15,
    maxDiscount: 300_000,
    minOrderValue: 0,
    scope: VoucherScope.PRODUCT,
    usageLimit: 100,
    usageLimitPerUser: 1,
    startOffsetDays: -2,
    endOffsetDays: 3,
    isPublic: true,
    status: VoucherStatus.ACTIVE,
  },
  {
    code: 'SUMMER2025',
    name: 'Khuyến mãi hè đã kết thúc',
    description: 'Chương trình giảm giá mùa hè, đã hết hạn.',
    type: VoucherType.PERCENT,
    value: 25,
    maxDiscount: 400_000,
    minOrderValue: 500_000,
    scope: VoucherScope.ALL,
    usageLimit: 300,
    usageLimitPerUser: 1,
    startOffsetDays: -90,
    endOffsetDays: -60,
    isPublic: true,
    status: VoucherStatus.EXPIRED,
  },
  {
    code: 'TAMNGUNG',
    name: 'Voucher tạm ngưng',
    description: 'Voucher đang được tạm ngưng để điều chỉnh chính sách.',
    type: VoucherType.FIXED,
    value: 100_000,
    minOrderValue: 300_000,
    scope: VoucherScope.ALL,
    usageLimit: 100,
    usageLimitPerUser: 1,
    startOffsetDays: -20,
    endOffsetDays: 40,
    isPublic: true,
    status: VoucherStatus.PAUSED,
  },
  {
    code: 'BLACKFRIDAY',
    name: 'Black Friday sắp diễn ra',
    description: 'Chương trình khuyến mãi lớn nhất năm, sắp bắt đầu.',
    type: VoucherType.PERCENT,
    value: 30,
    maxDiscount: 1_000_000,
    minOrderValue: 1_000_000,
    scope: VoucherScope.ALL,
    usageLimit: 1000,
    usageLimitPerUser: 1,
    startOffsetDays: 20,
    endOffsetDays: 25,
    isPublic: true,
    status: VoucherStatus.DRAFT,
  },
  {
    code: 'DEPLETED01',
    name: 'Voucher đã hết lượt dùng',
    description: 'Voucher đã được sử dụng hết số lượt cho phép.',
    type: VoucherType.FIXED,
    value: 200_000,
    minOrderValue: 1_000_000,
    scope: VoucherScope.ALL,
    usageLimit: 10,
    usageLimitPerUser: 1,
    startOffsetDays: -15,
    endOffsetDays: 15,
    isPublic: true,
    status: VoucherStatus.DEPLETED,
  },
];

async function seedVouchers(prisma: PrismaClient) {
  console.log('🎟️  Seeding vouchers...');

  const categories = await prisma.category.findMany({
    where: { deletedAt: null },
  });
  const products = await prisma.product.findMany({
    where: { deletedAt: null },
  });

  const now = Date.now();
  const day = 24 * 60 * 60 * 1000;

  let created = 0;
  let skipped = 0;

  for (const def of VOUCHER_DEFS) {
    const existing = await prisma.voucher.findUnique({
      where: { code: def.code },
    });

    if (existing) {
      skipped++;
      continue;
    }

    const startAt = new Date(now + def.startOffsetDays * day);
    const endAt = new Date(now + def.endOffsetDays * day);

    const usedCount =
      def.status === VoucherStatus.DEPLETED
        ? (def.usageLimit ?? 10)
        : def.status === VoucherStatus.EXPIRED
          ? randomInt(0, def.usageLimit ?? 50)
          : randomInt(0, Math.floor((def.usageLimit ?? 100) * 0.3));

    const voucher = await prisma.voucher.create({
      data: {
        code: def.code,
        name: def.name,
        description: def.description,
        type: def.type,
        value: def.value,
        maxDiscount: def.maxDiscount,
        minOrderValue: def.minOrderValue ?? 0,
        scope: def.scope,
        usageLimit: def.usageLimit,
        usageLimitPerUser: def.usageLimitPerUser ?? 1,
        usedCount,
        startAt,
        endAt,
        status: def.status,
        isPublic: def.isPublic ?? true,
      },
    });

    if (def.scope === VoucherScope.CATEGORY && categories.length > 0) {
      const picked = randomSample(
        categories,
        randomInt(1, Math.min(3, categories.length)),
      );
      await prisma.voucherCategory.createMany({
        data: picked.map((c) => ({
          voucherId: voucher.id,
          categoryId: c.id,
        })),
        skipDuplicates: true,
      });
    }

    if (def.scope === VoucherScope.PRODUCT && products.length > 0) {
      const picked = randomSample(
        products,
        randomInt(1, Math.min(5, products.length)),
      );
      await prisma.voucherProduct.createMany({
        data: picked.map((p) => ({
          voucherId: voucher.id,
          productId: p.id,
        })),
        skipDuplicates: true,
      });
    }

    created++;
    console.log(`  ✅ ${def.code} - ${def.name} (${def.status})`);
  }

  console.log(
    `\n✅ Vouchers: đã tạo ${created}, bỏ qua ${skipped} (đã tồn tại).\n`,
  );
}

const FIRST_NAMES = [
  'Nguyễn Văn',
  'Trần Thị',
  'Lê Văn',
  'Phạm Thị',
  'Hoàng Văn',
  'Huỳnh Thị',
  'Vũ Văn',
  'Đặng Thị',
  'Bùi Văn',
  'Đỗ Thị',
  'Ngô Văn',
  'Dương Thị',
];

const LAST_NAMES = [
  'An',
  'Bình',
  'Cường',
  'Dung',
  'Em',
  'Giang',
  'Hà',
  'Hùng',
  'Khánh',
  'Linh',
  'Minh',
  'Nga',
  'Oanh',
  'Phúc',
  'Quân',
  'Thảo',
  'Trang',
  'Tuấn',
  'Uyên',
  'Vy',
];

const CITY_ADDRESSES = [
  { ward: 'Phường Bến Nghé', district: 'Quận 1', city: 'TP. Hồ Chí Minh' },
  {
    ward: 'Phường Thảo Điền',
    district: 'TP. Thủ Đức',
    city: 'TP. Hồ Chí Minh',
  },
  { ward: 'Phường Tân Định', district: 'Quận 1', city: 'TP. Hồ Chí Minh' },
  { ward: 'Phường 15', district: 'Quận Tân Bình', city: 'TP. Hồ Chí Minh' },
  { ward: 'Phường Trúc Bạch', district: 'Quận Ba Đình', city: 'Hà Nội' },
  { ward: 'Phường Dịch Vọng', district: 'Quận Cầu Giấy', city: 'Hà Nội' },
  { ward: 'Phường Mỹ An', district: 'Quận Ngũ Hành Sơn', city: 'Đà Nẵng' },
  { ward: 'Phường An Hải Bắc', district: 'Quận Sơn Trà', city: 'Đà Nẵng' },
  { ward: 'Phường Hưng Lợi', district: 'Quận Ninh Kiều', city: 'Cần Thơ' },
  { ward: 'Phường Vĩnh Hải', district: 'TP. Nha Trang', city: 'Khánh Hòa' },
];

function randomVietnameseName(): string {
  return `${randomPick(FIRST_NAMES)} ${randomPick(LAST_NAMES)}`;
}

function randomPhone(): string {
  const heads = [
    '090',
    '091',
    '093',
    '096',
    '097',
    '098',
    '032',
    '033',
    '035',
    '070',
    '079',
  ];
  const rest = String(randomInt(1000000, 9999999));
  return `${randomPick(heads)}${rest}`;
}

function randomAddress(): string {
  const a = randomPick(CITY_ADDRESSES);
  const houseNo = randomInt(1, 300);
  const street = randomPick([
    'Nguyễn Huệ',
    'Lê Lợi',
    'Điện Biên Phủ',
    'Hai Bà Trưng',
    'Trần Hưng Đạo',
    'Nguyễn Thị Minh Khai',
    'Phạm Văn Đồng',
    'Võ Văn Kiệt',
    'Cách Mạng Tháng 8',
  ]);
  return `${houseNo} đường ${street}, ${a.ward}, ${a.district}, ${a.city}`;
}

const CUSTOMERS_COUNT = 40;

async function seedCustomers(prisma: PrismaClient) {
  console.log('👥 Seeding customers...');

  const countExisting = await prisma.user.count({
    where: { role: Role.CUSTOMER },
  });
  if (countExisting >= CUSTOMERS_COUNT) {
    console.log(
      `ℹ️  Đã có ${countExisting} khách hàng, bỏ qua seed customers.\n`,
    );
    return;
  }

  const passwordHash = await argon2.hash('Customer@123');
  let created = 0;

  for (let i = countExisting; i < CUSTOMERS_COUNT; i++) {
    const name = randomVietnameseName();
    const email = `${slugify(name)}${i}@example.com`;
    const isGoogle = Math.random() < 0.25;
    const isBanned = Math.random() < 0.05;
    const createdAt = randomPastDate(240, 1);

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) continue;

    await prisma.user.create({
      data: {
        name,
        email,
        password: isGoogle ? null : passwordHash,
        provider: isGoogle ? AuthProvider.GOOGLE : AuthProvider.LOCAL,
        googleId: isGoogle
          ? `google-${Math.random().toString(36).slice(2, 12)}`
          : null,
        role: Role.CUSTOMER,
        emailVerified: Math.random() < 0.9,
        bannedAt: isBanned ? randomPastDate(30, 1) : null,
        createdAt,
        updatedAt: createdAt,
      },
    });
    created++;
  }

  console.log(
    `✅ Đã tạo ${created} khách hàng (mật khẩu mặc định: Customer@123).\n`,
  );
}

async function seedRefreshTokens(prisma: PrismaClient) {
  console.log('🔑 Seeding refresh tokens...');

  const users = await prisma.user.findMany();
  if (users.length === 0) {
    console.log('⚠️  Chưa có user nào, dừng seed refresh tokens.\n');
    return;
  }

  const holders = randomSample(users, Math.min(20, users.length));
  let created = 0;

  for (const user of holders) {
    const tokenCount = randomInt(1, 2);
    for (let i = 0; i < tokenCount; i++) {
      const issuedAt = randomPastDate(30, 0);
      const revoked = Math.random() < 0.2;
      await prisma.refreshToken.create({
        data: {
          userId: user.id,
          tokenHash: randomToken(48),
          expiresAt: new Date(issuedAt.getTime() + 30 * 24 * 60 * 60 * 1000),
          revoked,
          createdAt: issuedAt,
        },
      });
      created++;
    }
  }

  console.log(`✅ Đã tạo ${created} refresh tokens.\n`);
}

const POST_TOPICS = [
  '5 xu hướng nội thất phòng khách năm nay',
  'Cách chọn sofa phù hợp với không gian nhỏ',
  'Bí quyết phối màu nội thất phong cách Bắc Âu',
  'Mẹo bố trí phòng ngủ giúp ngủ ngon hơn',
  'Gỗ tự nhiên hay gỗ công nghiệp: nên chọn loại nào?',
  'Trang trí nhà bếp nhỏ gọn, tiện nghi',
  'Phong cách Indochine trong thiết kế nội thất hiện đại',
  'Cách chăm sóc và bảo quản đồ nội thất bằng da',
  'Gợi ý bàn làm việc tối giản cho không gian home office',
  'Chọn đèn chiếu sáng theo từng khu vực trong nhà',
  'Nội thất trẻ em an toàn: những điều cần lưu ý',
  'Cách tận dụng không gian lưu trữ trong căn hộ nhỏ',
  'Xu hướng rèm cửa và thảm trải sàn được ưa chuộng',
  'Thiết kế sân vườn nhỏ xinh cho nhà phố',
  'Kinh nghiệm chọn nệm phù hợp với thể trạng',
  'Cách vệ sinh và bảo dưỡng sofa vải định kỳ',
  'Bố trí nội thất văn phòng tối ưu năng suất làm việc',
  'Những sai lầm thường gặp khi decor phòng khách',
];

async function seedPosts(prisma: PrismaClient) {
  console.log('📝 Seeding posts...');

  let created = 0;

  for (const title of POST_TOPICS) {
    const slug = slugify(title);
    const existing = await prisma.post.findUnique({ where: { slug } });
    if (existing) continue;

    const roll = Math.random();
    const status: PostStatus =
      roll < 0.7
        ? PostStatus.PUBLISHED
        : roll < 0.9
          ? PostStatus.DRAFT
          : PostStatus.ARCHIVED;

    const createdAt = randomPastDate(200, 1);
    const publishedAt =
      status === PostStatus.PUBLISHED || status === PostStatus.ARCHIVED
        ? new Date(createdAt.getTime() + randomInt(0, 3) * 24 * 60 * 60 * 1000)
        : null;

    await prisma.post.create({
      data: {
        title,
        slug,
        excerpt: `${title} - những gợi ý và kinh nghiệm thực tế giúp bạn có không gian sống đẹp và tiện nghi hơn.`,
        content: `<p>${title}</p><p>Đây là nội dung mẫu cho bài viết "${title}". Nội dung này được seed tự động phục vụ mục đích hiển thị dữ liệu mẫu trên trang blog và dashboard quản trị.</p>`,
        status,
        publishedAt,
        viewCount:
          status === PostStatus.PUBLISHED
            ? randomInt(20, 5000)
            : randomInt(0, 50),
        createdAt,
        updatedAt: createdAt,
      },
    });
    created++;
  }

  console.log(`✅ Đã tạo ${created} bài viết.\n`);
}

const ORDERS_COUNT = 150;
const CANCEL_REASONS = [
  'Khách hàng đổi ý không mua nữa',
  'Đặt nhầm sản phẩm',
  'Thời gian giao hàng quá lâu',
  'Tìm được sản phẩm tốt hơn ở nơi khác',
  'Không liên lạc được với khách hàng',
];

const COURIER_NAMES = [
  'Giao Hàng Nhanh',
  'Giao Hàng Tiết Kiệm',
  'Viettel Post',
  'J&T Express',
  'Ninja Van',
];

// Payment method dùng cổng thứ 3 (webhook), tạm để seed đa dạng dữ liệu
// cho PaymentWebhookEvent dù thực tế dự án chưa bật cổng nào.
const GATEWAY_METHODS = [
  PaymentMethod.VNPAY,
  PaymentMethod.MOMO,
  PaymentMethod.ZALOPAY,
];

function pickOrderStatusByAge(daysAgo: number): OrderStatus {
  if (daysAgo > 20) {
    const roll = Math.random();
    if (roll < 0.78) return OrderStatus.DELIVERED;
    if (roll < 0.9) return OrderStatus.CANCELLED;
    return OrderStatus.SHIPPED;
  }
  if (daysAgo > 7) {
    const roll = Math.random();
    if (roll < 0.4) return OrderStatus.DELIVERED;
    if (roll < 0.6) return OrderStatus.SHIPPED;
    if (roll < 0.8) return OrderStatus.PROCESSING;
    if (roll < 0.92) return OrderStatus.CONFIRMED;
    return OrderStatus.CANCELLED;
  }
  const roll = Math.random();
  if (roll < 0.3) return OrderStatus.PENDING;
  if (roll < 0.55) return OrderStatus.CONFIRMED;
  if (roll < 0.75) return OrderStatus.PROCESSING;
  if (roll < 0.9) return OrderStatus.SHIPPED;
  return OrderStatus.DELIVERED;
}

function computeVoucherDiscount(
  voucher: { type: VoucherType; value: any; maxDiscount: any | null },
  subtotal: number,
): number {
  const value = Number(voucher.value);
  if (voucher.type === VoucherType.PERCENT) {
    const raw = Math.round((subtotal * value) / 100);
    const cap = voucher.maxDiscount ? Number(voucher.maxDiscount) : Infinity;
    return Math.min(raw, cap, subtotal);
  }
  return Math.min(value, subtotal);
}

async function seedPaymentForOrder(
  prisma: PrismaClient,
  order: { id: string; orderNumber: string; total: any; createdAt: Date },
  orderStatus: OrderStatus,
  adminId: string | undefined,
) {
  const amount = Number(order.total);
  const roll = Math.random();
  const method: PaymentMethod =
    roll < 0.55
      ? PaymentMethod.COD
      : roll < 0.85
        ? PaymentMethod.BANK_TRANSFER
        : randomPick(GATEWAY_METHODS);

  const isCancelled = orderStatus === OrderStatus.CANCELLED;
  const fulfilledStatuses: OrderStatus[] = [
    OrderStatus.CONFIRMED,
    OrderStatus.PROCESSING,
    OrderStatus.SHIPPED,
    OrderStatus.DELIVERED,
  ];
  const isFulfilled = fulfilledStatuses.includes(orderStatus);

  if (method === PaymentMethod.COD) {
    const isDelivered = orderStatus === OrderStatus.DELIVERED;
    const status: PaymentStatus = isCancelled
      ? PaymentStatus.FAILED
      : isDelivered
        ? PaymentStatus.CONFIRMED
        : PaymentStatus.PENDING;

    await prisma.payment.create({
      data: {
        orderId: order.id,
        method,
        confirmationType: ConfirmationType.COD_COLLECTION,
        status,
        amount,
        collectedAmount: status === PaymentStatus.CONFIRMED ? amount : null,
        courierName:
          isFulfilled || isCancelled ? randomPick(COURIER_NAMES) : null,
        confirmedById: status === PaymentStatus.CONFIRMED ? adminId : null,
        confirmedAt:
          status === PaymentStatus.CONFIRMED
            ? new Date(
                order.createdAt.getTime() +
                  randomInt(1, 5) * 24 * 60 * 60 * 1000,
              )
            : null,
        createdAt: order.createdAt,
        updatedAt: order.createdAt,
      },
    });
    return;
  }

  if (method === PaymentMethod.BANK_TRANSFER) {
    let status: PaymentStatus;
    if (isCancelled) {
      status =
        Math.random() < 0.5 ? PaymentStatus.REFUNDED : PaymentStatus.FAILED;
    } else if (isFulfilled) {
      status = PaymentStatus.CONFIRMED;
    } else {
      status =
        Math.random() < 0.5
          ? PaymentStatus.AWAITING_CONFIRM
          : PaymentStatus.PENDING;
    }

    const isConfirmedLike =
      status === PaymentStatus.CONFIRMED || status === PaymentStatus.REFUNDED;

    await prisma.payment.create({
      data: {
        orderId: order.id,
        method,
        confirmationType: ConfirmationType.MANUAL,
        status,
        amount,
        transferNote: order.orderNumber,
        confirmedById: isConfirmedLike ? adminId : null,
        confirmedAt: isConfirmedLike
          ? new Date(
              order.createdAt.getTime() + randomInt(0, 2) * 24 * 60 * 60 * 1000,
            )
          : null,
        createdAt: order.createdAt,
        updatedAt: order.createdAt,
      },
    });
    return;
  }

  // Cổng thanh toán bên thứ 3 (webhook) — chưa dùng thực tế, chỉ seed cho đa dạng dữ liệu.
  let status: PaymentStatus;
  if (isCancelled) {
    status =
      Math.random() < 0.5 ? PaymentStatus.REFUNDED : PaymentStatus.FAILED;
  } else if (isFulfilled) {
    status = PaymentStatus.CONFIRMED;
  } else {
    status = PaymentStatus.AWAITING_CONFIRM;
  }

  const gatewayTxnId = `${method}-${order.orderNumber}-${randomInt(100000, 999999)}`;

  const payment = await prisma.payment.create({
    data: {
      orderId: order.id,
      method,
      confirmationType: ConfirmationType.WEBHOOK,
      status,
      amount,
      gatewayTxnId,
      createdAt: order.createdAt,
      updatedAt: order.createdAt,
    },
  });

  const eventType =
    status === PaymentStatus.CONFIRMED
      ? 'payment.success'
      : status === PaymentStatus.REFUNDED
        ? 'payment.refunded'
        : status === PaymentStatus.AWAITING_CONFIRM
          ? 'payment.pending'
          : 'payment.failed';

  await prisma.paymentWebhookEvent.create({
    data: {
      paymentId: payment.id,
      provider: method,
      eventType,
      externalEventId: `${gatewayTxnId}-evt`,
      rawPayload: {
        orderNumber: order.orderNumber,
        amount,
        status: eventType,
      },
      processedAt: new Date(
        order.createdAt.getTime() + randomInt(1, 30) * 60 * 1000,
      ),
      createdAt: order.createdAt,
    },
  });
}

async function seedOrdersAndVoucherUsages(prisma: PrismaClient) {
  console.log('🧾 Seeding orders...');

  const existingOrders = await prisma.order.count();
  if (existingOrders >= ORDERS_COUNT) {
    console.log(`ℹ️  Đã có ${existingOrders} đơn hàng, bỏ qua seed orders.\n`);
    return;
  }

  const customers = await prisma.user.findMany({
    where: { role: Role.CUSTOMER },
  });
  const variants = await prisma.productVariant.findMany({
    include: { product: true },
  });
  const usableVouchers = await prisma.voucher.findMany({
    where: { status: { in: [VoucherStatus.ACTIVE, VoucherStatus.EXPIRED] } },
  });
  const admin = await prisma.user.findFirst({ where: { role: Role.ADMIN } });

  if (customers.length === 0 || variants.length === 0) {
    console.log(
      '⚠️  Chưa có khách hàng hoặc biến thể sản phẩm, dừng seed orders.\n',
    );
    return;
  }

  let createdOrders = 0;
  let createdItems = 0;
  let createdVoucherUsages = 0;
  let createdPayments = 0;

  for (let i = 0; i < ORDERS_COUNT; i++) {
    const customer = randomPick(customers);
    const itemCount = randomInt(1, 4);
    const chosenVariants = randomSample(variants, itemCount);

    const itemsData = chosenVariants.map((variant) => {
      const unitPrice = variant.priceOverride
        ? Number(variant.priceOverride)
        : Number(variant.product.price);
      const quantity = randomInt(1, 3);
      return {
        productId: variant.productId,
        variantId: variant.id,
        productName: variant.product.name,
        variantName: variant.name,
        price: unitPrice,
        quantity,
        lineTotal: unitPrice * quantity,
      };
    });

    const subtotal = itemsData.reduce((sum, it) => sum + it.lineTotal, 0);
    const shippingFee = subtotal >= 2_000_000 ? 0 : 30_000;

    let discount = 0;
    let voucherId: string | undefined;
    let voucherCode: string | undefined;

    if (usableVouchers.length > 0 && Math.random() < 0.3) {
      const candidate = randomPick(usableVouchers);
      if (subtotal >= Number(candidate.minOrderValue)) {
        discount = computeVoucherDiscount(candidate, subtotal);
        voucherId = candidate.id;
        voucherCode = candidate.code;
      }
    }

    const total = Math.max(subtotal + shippingFee - discount, 0);

    const createdAt = randomPastDate(180, 0);
    const daysAgo = Math.floor(
      (Date.now() - createdAt.getTime()) / (24 * 60 * 60 * 1000),
    );
    const status = pickOrderStatusByAge(daysAgo);

    const orderNumber = `DH${createdAt.getFullYear()}${String(createdAt.getMonth() + 1).padStart(2, '0')}${String(createdAt.getDate()).padStart(2, '0')}-${String(i + 1).padStart(4, '0')}`;

    const order = await prisma.order.create({
      data: {
        orderNumber,
        userId: customer.id,
        status,
        subtotal,
        shippingFee,
        discount,
        total,
        recipientName: customer.name,
        recipientPhone: randomPhone(),
        shippingAddress: randomAddress(),
        note:
          Math.random() < 0.15
            ? 'Giao hàng giờ hành chính, gọi trước khi giao.'
            : null,
        cancelReason:
          status === OrderStatus.CANCELLED ? randomPick(CANCEL_REASONS) : null,
        voucherId,
        voucherCode,
        createdAt,
        updatedAt: createdAt,
        items: {
          create: itemsData.map(({ lineTotal: _lineTotal, ...rest }) => rest),
        },
      },
    });

    createdOrders++;
    createdItems += itemsData.length;

    await seedPaymentForOrder(prisma, order, status, admin?.id);
    createdPayments++;

    if (voucherId) {
      await prisma.voucherUsage.create({
        data: {
          voucherId,
          userId: customer.id,
          orderId: order.id,
          discountApplied: discount,
          createdAt,
        },
      });
      await prisma.voucher.update({
        where: { id: voucherId },
        data: { usedCount: { increment: 1 } },
      });
      createdVoucherUsages++;
    }
  }

  console.log(
    `✅ Đã tạo ${createdOrders} đơn hàng, ${createdItems} order items, ${createdPayments} payments, ${createdVoucherUsages} voucher usages.\n`,
  );
}

async function seedCarts(prisma: PrismaClient) {
  console.log('🛒 Seeding carts...');

  const customers = await prisma.user.findMany({
    where: { role: Role.CUSTOMER },
  });
  const variants = await prisma.productVariant.findMany();

  if (customers.length === 0 || variants.length === 0) {
    console.log(
      '⚠️  Chưa có khách hàng hoặc biến thể sản phẩm, dừng seed carts.\n',
    );
    return;
  }

  const shoppers = randomSample(customers, Math.min(15, customers.length));
  let createdCarts = 0;
  let createdItems = 0;

  for (const customer of shoppers) {
    const existingCart = await prisma.cart.findUnique({
      where: { userId: customer.id },
    });
    if (existingCart) continue;

    const cart = await prisma.cart.create({
      data: { userId: customer.id },
    });

    const pickedVariants = randomSample(variants, randomInt(1, 4));
    const uniqueVariantIds = Array.from(
      new Set(pickedVariants.map((v) => v.id)),
    );

    for (const variantId of uniqueVariantIds) {
      await prisma.cartItem.create({
        data: {
          cartId: cart.id,
          variantId,
          quantity: randomInt(1, 3),
        },
      });
      createdItems++;
    }

    createdCarts++;
  }

  console.log(
    `✅ Đã tạo ${createdCarts} giỏ hàng với ${createdItems} sản phẩm.\n`,
  );
}

const REVIEW_COMMENT_TEMPLATES = [
  'Sản phẩm đẹp, đúng như mô tả, đóng gói cẩn thận.',
  'Chất lượng khá tốt so với mức giá, sẽ ủng hộ shop tiếp.',
  'Giao hàng hơi chậm nhưng sản phẩm ổn.',
  'Màu sắc thực tế đẹp hơn hình, rất ưng ý.',
  'Lắp ráp hơi khó nhưng có hướng dẫn chi tiết nên vẫn làm được.',
  'Chất liệu chắc chắn, dùng được một thời gian vẫn ổn.',
  'Không như mong đợi, kích thước hơi nhỏ hơn dự kiến.',
  'Nhân viên tư vấn nhiệt tình, sản phẩm đúng nhu cầu.',
  'Giá hợp lý, chất lượng tương xứng.',
  'Rất hài lòng, sẽ giới thiệu cho bạn bè.',
];

const REVIEW_REPLY_TEMPLATES = [
  'Cảm ơn bạn đã tin tưởng và ủng hộ shop nhé!',
  'Shop rất tiếc vì trải nghiệm chưa tốt, sẽ cải thiện trong thời gian tới.',
  'Cảm ơn góp ý của bạn, shop sẽ ghi nhận để cải thiện chất lượng dịch vụ.',
  'Rất vui vì bạn hài lòng với sản phẩm, hẹn gặp lại bạn ở những đơn hàng sau!',
];

async function seedReviews(prisma: PrismaClient) {
  console.log('⭐ Seeding reviews...');

  const products = await prisma.product.findMany({
    where: {
      deletedAt: null,
      status: { in: [ProductStatus.ACTIVE, ProductStatus.ARCHIVED] },
    },
    include: { variants: true },
  });
  const customers = await prisma.user.findMany({
    where: { role: Role.CUSTOMER },
  });
  const admin = await prisma.user.findFirst({ where: { role: Role.ADMIN } });

  if (products.length === 0 || customers.length === 0) {
    console.log('⚠️  Chưa có sản phẩm hoặc khách hàng, dừng seed reviews.\n');
    return;
  }

  const reviewedProducts = randomSample(
    products,
    Math.ceil(products.length * 0.65),
  );
  let createdReviews = 0;
  let createdVotes = 0;
  let createdComments = 0;

  for (const product of reviewedProducts) {
    const hasExisting = await prisma.review.count({
      where: { productId: product.id },
    });
    if (hasExisting > 0) continue;

    const reviewCount = randomInt(1, 6);

    for (let i = 0; i < reviewCount; i++) {
      const isGuest = Math.random() < 0.15;
      const reviewer = isGuest ? null : randomPick(customers);
      const rating = randomPick([3, 4, 4, 5, 5, 5, 2, 1]);
      const variant =
        product.variants.length > 0 && Math.random() < 0.7
          ? randomPick(product.variants)
          : null;
      const createdAt = randomPastDate(150, 1);

      const review = await prisma.review.create({
        data: {
          productId: product.id,
          userId: reviewer?.id,
          authorName: reviewer?.name ?? randomVietnameseName(),
          rating,
          content: `${randomPick(REVIEW_COMMENT_TEMPLATES)} (${product.name})`,
          variantId: variant?.id,
          variantLabel: variant?.colorName ?? undefined,
          usedForLabel:
            Math.random() < 0.3
              ? randomPick(['Phòng khách', 'Phòng ngủ', 'Văn phòng'])
              : undefined,
          verifiedPurchase: Math.random() < 0.6,
          createdAt,
          updatedAt: createdAt,
        },
      });
      createdReviews++;

      const voterPool = randomSample(
        customers,
        randomInt(0, Math.min(10, customers.length)),
      );
      const uniqueVoterIds = Array.from(new Set(voterPool.map((v) => v.id)));
      for (const voterId of uniqueVoterIds) {
        try {
          await prisma.reviewHelpful.create({
            data: { reviewId: review.id, userId: voterId },
          });
          createdVotes++;
        } catch {
          // bỏ qua nếu trùng (unique constraint)
        }
      }

      if (Math.random() < 0.25) {
        const commenter = randomPick(customers);
        const parentComment = await prisma.reviewComment.create({
          data: {
            reviewId: review.id,
            userId: commenter.id,
            content: randomPick(REVIEW_COMMENT_TEMPLATES),
            createdAt: new Date(createdAt.getTime() + 24 * 60 * 60 * 1000),
          },
        });
        createdComments++;

        if (admin && Math.random() < 0.5) {
          await prisma.reviewComment.create({
            data: {
              reviewId: review.id,
              userId: admin.id,
              parentId: parentComment.id,
              content: randomPick(REVIEW_REPLY_TEMPLATES),
              createdAt: new Date(
                parentComment.createdAt.getTime() + 12 * 60 * 60 * 1000,
              ),
            },
          });
          createdComments++;
        }
      }
    }
  }

  console.log(
    `✅ Đã tạo ${createdReviews} đánh giá, ${createdVotes} lượt vote hữu ích, ${createdComments} bình luận.\n`,
  );
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
    await seedCustomers(prisma);
    await seedRefreshTokens(prisma);
    await seedPosts(prisma);
    await seedVouchers(prisma);
    await seedOrdersAndVoucherUsages(prisma);
    await seedCarts(prisma);
    await seedReviews(prisma);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error('❌ Seed failed:', e);
  process.exit(1);
});

import {
  Role,
  PostStatus,
  VoucherType,
  OrderStatus,
  ReturnReason,
  ReturnStatus,
  RefundMethod,
  VoucherScope,
  PrismaClient,
  AuthProvider,
  ProductStatus,
  VoucherStatus,
  PaymentMethod,
  PaymentStatus,
  ShipmentStatus,
  ConfirmationType,
  NotificationType,
  StockMovementType,
  PurchaseOrderStatus,
  NotificationAudience,
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

const DAY_MS = 24 * 60 * 60 * 1000;

function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * DAY_MS);
}

/** Tránh sinh mốc thời gian nằm trong tương lai cho dữ liệu "đã xảy ra". */
function capAtNow(date: Date): Date {
  return date.getTime() > Date.now() ? new Date() : date;
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

  // Cân nặng (kg) - dùng để tính phí vận chuyển theo khu vực
  const weight = hasDimensions
    ? randomInt(50, 800) / 10
    : randomInt(2, 50) / 10;

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
    weight,
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

/**
 * Sinh số điện thoại di động VN theo format quốc tế chuẩn: "+84 xxx xxx xxx".
 * Đầu số 2 chữ số (086, 088, 089, 096, 097, 098, 032, 033, 035, 070, 079 — bỏ số 0 đầu)
 * + 7 chữ số còn lại, nhóm 3-3-3 sau mã quốc gia.
 */
function randomPhone(): string {
  const heads = [
    '86',
    '88',
    '89',
    '96',
    '97',
    '98',
    '32',
    '33',
    '35',
    '70',
    '79',
  ];
  const head = randomPick(heads);
  const rest = String(randomInt(1000000, 9999999));
  const digits = `${head}${rest}`; // 9 chữ số
  return `+84 ${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6, 9)}`;
}

const STREETS = [
  'Nguyễn Huệ',
  'Lê Lợi',
  'Điện Biên Phủ',
  'Hai Bà Trưng',
  'Trần Hưng Đạo',
  'Nguyễn Thị Minh Khai',
  'Phạm Văn Đồng',
  'Võ Văn Kiệt',
  'Cách Mạng Tháng 8',
];

function randomAddress(): string {
  const a = randomPick(CITY_ADDRESSES);
  const houseNo = randomInt(1, 300);
  const street = randomPick(STREETS);
  return `${houseNo} đường ${street}, ${a.ward}, ${a.district}, ${a.city}`;
}

/** Ghép địa chỉ dạng snapshot (Order.shippingAddress) từ một Address (tỉnh + phường). */
function formatAddress(a: {
  addressDetail: string;
  wardName: string;
  provinceName: string;
}): string {
  return `${a.addressDetail}, ${a.wardName}, ${a.provinceName}`;
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

/**
 * Mã tỉnh/phường lấy cùng nguồn với dữ liệu kho/nhà cung cấp bên dưới (mã mẫu),
 * cần đối chiếu lại với provinces.open-api.vn nếu dùng cho môi trường thật.
 */
const ADDRESS_LOCATIONS = [
  {
    provinceCode: 79,
    provinceName: 'TP. Hồ Chí Minh',
    wardCode: 26734,
    wardName: 'Phường Bình Hưng Hòa',
  },
  {
    provinceCode: 79,
    provinceName: 'TP. Hồ Chí Minh',
    wardCode: 27700,
    wardName: 'Phường Tân Sơn Nhì',
  },
  {
    provinceCode: 79,
    provinceName: 'TP. Hồ Chí Minh',
    wardCode: 26404,
    wardName: 'Phường Trung Mỹ Tây',
  },
  {
    provinceCode: 1,
    provinceName: 'Hà Nội',
    wardCode: 771,
    wardName: 'Phường Hoàng Liệt',
  },
  {
    provinceCode: 48,
    provinceName: 'Đà Nẵng',
    wardCode: 20194,
    wardName: 'Phường Hòa Thọ Tây',
  },
  {
    provinceCode: 31,
    provinceName: 'Hải Phòng',
    wardCode: 12898,
    wardName: 'Phường Đông Hải',
  },
  {
    provinceCode: 92,
    provinceName: 'Cần Thơ',
    wardCode: 31240,
    wardName: 'Xã Mỹ Khánh',
  },
];

/**
 * Mỗi khách hàng có 1 địa chỉ mặc định, khoảng 30% có thêm 1 địa chỉ phụ.
 * Đơn hàng seed sau đó sẽ snapshot lại từ các địa chỉ này.
 */
async function seedAddresses(prisma: PrismaClient) {
  console.log('🏠 Seeding addresses...');

  const customers = await prisma.user.findMany({
    where: { role: Role.CUSTOMER },
    include: { addresses: { select: { id: true }, take: 1 } },
  });

  if (customers.length === 0) {
    console.log('⚠️  Chưa có khách hàng, dừng seed addresses.\n');
    return;
  }

  let created = 0;

  for (const customer of customers) {
    if (customer.addresses.length > 0) continue;

    const count = Math.random() < 0.3 ? 2 : 1;
    const locations = randomSample(ADDRESS_LOCATIONS, count);

    await prisma.address.createMany({
      data: locations.map((location, i) => ({
        userId: customer.id,
        recipientName: i === 0 ? customer.name : randomVietnameseName(),
        recipientPhone: randomPhone(),
        ...location,
        addressDetail: `${randomInt(1, 300)} đường ${randomPick(STREETS)}`,
        isDefault: i === 0,
      })),
    });
    created += locations.length;
  }

  console.log(`✅ Đã tạo ${created} địa chỉ giao hàng.\n`);
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

/**
 * Vùng vận chuyển: mỗi tỉnh chỉ thuộc đúng 1 vùng (ShippingZoneProvince.provinceCode là unique).
 * Mã tỉnh theo mã hành chính chuẩn (cùng hệ mã với kho / nhà cung cấp bên dưới).
 */
const SHIPPING_ZONE_DEFS = [
  {
    name: 'Nội thành TP. Hồ Chí Minh',
    provinces: [{ code: 79, name: 'TP. Hồ Chí Minh' }],
    baseFee: 30_000,
    baseWeight: 30,
    extraFeePerKg: 1_500,
    freeShipMinOrder: 2_000_000,
    estimatedDaysMin: 1,
    estimatedDaysMax: 2,
    isActive: true,
  },
  {
    name: 'Miền Nam (ngoài TP. Hồ Chí Minh)',
    provinces: [
      { code: 74, name: 'Bình Dương' },
      { code: 75, name: 'Đồng Nai' },
      { code: 77, name: 'Bà Rịa - Vũng Tàu' },
      { code: 80, name: 'Long An' },
      { code: 82, name: 'Tiền Giang' },
      { code: 92, name: 'Cần Thơ' },
    ],
    baseFee: 50_000,
    baseWeight: 30,
    extraFeePerKg: 2_500,
    freeShipMinOrder: 3_000_000,
    estimatedDaysMin: 2,
    estimatedDaysMax: 4,
    isActive: true,
  },
  {
    name: 'Miền Trung',
    provinces: [
      { code: 46, name: 'Thừa Thiên Huế' },
      { code: 48, name: 'Đà Nẵng' },
      { code: 49, name: 'Quảng Nam' },
      { code: 52, name: 'Bình Định' },
      { code: 56, name: 'Khánh Hòa' },
      { code: 68, name: 'Lâm Đồng' },
    ],
    baseFee: 90_000,
    baseWeight: 30,
    extraFeePerKg: 3_500,
    freeShipMinOrder: 4_000_000,
    estimatedDaysMin: 3,
    estimatedDaysMax: 5,
    isActive: true,
  },
  {
    name: 'Miền Bắc',
    provinces: [
      { code: 1, name: 'Hà Nội' },
      { code: 31, name: 'Hải Phòng' },
      { code: 22, name: 'Quảng Ninh' },
      { code: 27, name: 'Bắc Ninh' },
      { code: 30, name: 'Hải Dương' },
    ],
    baseFee: 100_000,
    baseWeight: 30,
    extraFeePerKg: 4_000,
    freeShipMinOrder: 4_000_000,
    estimatedDaysMin: 3,
    estimatedDaysMax: 6,
    isActive: true,
  },
  {
    name: 'Vùng xa (tạm ngưng phục vụ)',
    provinces: [
      { code: 95, name: 'Bạc Liêu' },
      { code: 96, name: 'Cà Mau' },
    ],
    baseFee: 150_000,
    baseWeight: 20,
    extraFeePerKg: 6_000,
    freeShipMinOrder: null,
    estimatedDaysMin: 5,
    estimatedDaysMax: 8,
    isActive: false,
  },
];

async function seedShippingZones(prisma: PrismaClient) {
  console.log('🗺️  Seeding shipping zones...');

  const existing = await prisma.shippingZone.count();
  if (existing > 0) {
    console.log(`ℹ️  Đã có ${existing} vùng vận chuyển, bỏ qua.\n`);
    return;
  }

  for (let i = 0; i < SHIPPING_ZONE_DEFS.length; i++) {
    const { provinces, ...zone } = SHIPPING_ZONE_DEFS[i];

    await prisma.shippingZone.create({
      data: {
        ...zone,
        sortOrder: i,
        provinces: {
          create: provinces.map((p) => ({
            provinceCode: p.code,
            provinceName: p.name,
          })),
        },
      },
    });
    console.log(`  ✅ ${zone.name} (${provinces.length} tỉnh/thành)`);
  }

  console.log(`✅ Đã tạo ${SHIPPING_ZONE_DEFS.length} vùng vận chuyển.\n`);
}

const ORDERS_COUNT = 150;
const CANCEL_REASONS = [
  'Khách hàng đổi ý không mua nữa',
  'Đặt nhầm sản phẩm',
  'Thời gian giao hàng quá lâu',
  'Tìm được sản phẩm tốt hơn ở nơi khác',
  'Không liên lạc được với khách hàng',
];

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
        // Không dùng đơn vị vận chuyển bên thứ 3: người thu tiền là tài xế nội bộ
        courierName:
          status === PaymentStatus.CONFIRMED ? randomVietnameseName() : null,
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
    include: { addresses: true },
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
    const address =
      customer.addresses.length > 0
        ? randomPick(customer.addresses)
        : undefined;
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
        recipientName: address?.recipientName ?? customer.name,
        recipientPhone: address?.recipientPhone ?? randomPhone(),
        shippingAddress: address ? formatAddress(address) : randomAddress(),
        addressId: address?.id,
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

const SHIPMENT_NOTES = [
  'Gọi khách trước 30 phút khi đến.',
  'Hàng cồng kềnh, cần 2 người bốc xếp.',
  'Giao trong giờ hành chính.',
  'Kiểm tra hàng cùng khách trước khi bàn giao.',
];

const SHIPMENT_FAILED_REASONS = [
  'Khách không có nhà, không liên lạc được.',
  'Sai địa chỉ giao hàng, không tìm được nơi nhận.',
  'Khách từ chối nhận hàng.',
];

function randomVehiclePlate(): string {
  return `${randomInt(50, 59)}${randomPick(['A', 'B', 'C', 'D', 'F'])}-${randomInt(100, 999)}.${randomInt(10, 99)}`;
}

/**
 * Kế hoạch seed vận đơn: chỉ một số đơn hàng cho mỗi trạng thái, đủ để phủ mọi ShipmentStatus.
 * Đơn DELIVERED có ~30% khả năng được tách làm 2 vận đơn (mỗi vận đơn một phần sản phẩm).
 */
const SHIPMENT_PLANS: {
  orderStatus: OrderStatus;
  shipmentStatus: ShipmentStatus;
  count: number;
}[] = [
  {
    orderStatus: OrderStatus.DELIVERED,
    shipmentStatus: ShipmentStatus.DELIVERED,
    count: 12,
  },
  {
    orderStatus: OrderStatus.SHIPPED,
    shipmentStatus: ShipmentStatus.IN_TRANSIT,
    count: 6,
  },
  {
    orderStatus: OrderStatus.SHIPPED,
    shipmentStatus: ShipmentStatus.FAILED,
    count: 2,
  },
  {
    orderStatus: OrderStatus.PROCESSING,
    shipmentStatus: ShipmentStatus.PREPARING,
    count: 5,
  },
  {
    orderStatus: OrderStatus.CANCELLED,
    shipmentStatus: ShipmentStatus.CANCELLED,
    count: 2,
  },
];

async function seedShipments(prisma: PrismaClient) {
  console.log('🚛 Seeding shipments...');

  const existing = await prisma.shipment.count();
  if (existing > 0) {
    console.log(`ℹ️  Đã có ${existing} vận đơn, bỏ qua.\n`);
    return;
  }

  const admin = await prisma.user.findFirst({ where: { role: Role.ADMIN } });
  const orders = await prisma.order.findMany({
    where: {
      status: {
        in: [
          OrderStatus.DELIVERED,
          OrderStatus.SHIPPED,
          OrderStatus.PROCESSING,
          OrderStatus.CANCELLED,
        ],
      },
    },
    include: { items: true },
  });

  if (orders.length === 0) {
    console.log('⚠️  Chưa có đơn hàng phù hợp, dừng seed shipments.\n');
    return;
  }

  const shippedStatuses: ShipmentStatus[] = [
    ShipmentStatus.IN_TRANSIT,
    ShipmentStatus.DELIVERED,
    ShipmentStatus.FAILED,
  ];

  const usedOrderIds = new Set<string>();
  let seq = 0;
  let createdShipments = 0;

  for (const plan of SHIPMENT_PLANS) {
    const candidates = orders.filter(
      (o) => o.status === plan.orderStatus && !usedOrderIds.has(o.id),
    );
    const picked = randomSample(candidates, plan.count);

    for (const order of picked) {
      usedOrderIds.add(order.id);

      const shouldSplit =
        plan.shipmentStatus === ShipmentStatus.DELIVERED &&
        order.items.length >= 2 &&
        Math.random() < 0.3;
      const groups = shouldSplit
        ? [order.items.slice(0, 1), order.items.slice(1)]
        : [order.items];

      for (const groupItems of groups) {
        seq++;

        const createdAt = capAtNow(addDays(order.createdAt, randomInt(0, 2)));
        const scheduledAt = addDays(createdAt, randomInt(1, 3));
        const shippedAt = shippedStatuses.includes(plan.shipmentStatus)
          ? capAtNow(addDays(createdAt, randomInt(0, 1)))
          : null;
        const deliveredAt =
          shippedAt && plan.shipmentStatus === ShipmentStatus.DELIVERED
            ? capAtNow(addDays(shippedAt, randomInt(1, 4)))
            : null;

        const code = `VD${createdAt.getFullYear()}${String(createdAt.getMonth() + 1).padStart(2, '0')}${String(createdAt.getDate()).padStart(2, '0')}-${String(seq).padStart(4, '0')}`;

        await prisma.shipment.create({
          data: {
            code,
            orderId: order.id,
            status: plan.shipmentStatus,
            driverName: randomVietnameseName(),
            driverPhone: randomPhone(),
            vehiclePlate: randomVehiclePlate(),
            scheduledAt,
            shippedAt,
            deliveredAt,
            failedReason:
              plan.shipmentStatus === ShipmentStatus.FAILED
                ? randomPick(SHIPMENT_FAILED_REASONS)
                : null,
            note: Math.random() < 0.3 ? randomPick(SHIPMENT_NOTES) : null,
            createdById: admin?.id,
            createdAt,
            updatedAt: deliveredAt ?? shippedAt ?? createdAt,
            items: {
              create: groupItems.map((item) => ({
                orderItemId: item.id,
                quantity: item.quantity,
              })),
            },
          },
        });

        createdShipments++;
        console.log(
          `  ✅ ${code} - ${order.orderNumber} (${plan.shipmentStatus})`,
        );
      }
    }
  }

  console.log(`✅ Đã tạo ${createdShipments} vận đơn.\n`);
}

/**
 * Phủ đủ mọi ReturnStatus, mỗi phần tử tương ứng 1 yêu cầu đổi trả (chọn từ các đơn đã giao).
 */
const RETURN_STATUS_PLAN: ReturnStatus[] = [
  ReturnStatus.PENDING,
  ReturnStatus.PENDING,
  ReturnStatus.APPROVED,
  ReturnStatus.REJECTED,
  ReturnStatus.ITEM_RECEIVED,
  ReturnStatus.REFUNDED,
  ReturnStatus.COMPLETED,
  ReturnStatus.COMPLETED,
  ReturnStatus.CANCELLED,
];

const RETURN_REASON_NOTES: Record<ReturnReason, string> = {
  WRONG_ITEM: 'Giao nhầm màu so với đơn đặt hàng.',
  DEFECTIVE: 'Sản phẩm bị lỗi ở phần khung, lắp ráp không khớp.',
  DAMAGED_ON_ARRIVAL: 'Thùng hàng móp méo, sản phẩm bị trầy xước khi nhận.',
  NOT_AS_DESCRIBED: 'Kích thước thực tế nhỏ hơn mô tả trên website.',
  CHANGE_OF_MIND: 'Không còn nhu cầu sử dụng sản phẩm.',
  OTHER: 'Sản phẩm không phù hợp với không gian nhà.',
};

const RETURN_REJECT_REASONS = [
  'Sản phẩm đã qua sử dụng, không đủ điều kiện đổi trả.',
  'Yêu cầu được gửi quá thời hạn đổi trả theo chính sách.',
];

const BANK_NAMES = ['Vietcombank', 'Techcombank', 'MB Bank', 'ACB', 'BIDV'];

async function seedReturnRequests(prisma: PrismaClient) {
  console.log('↩️  Seeding return requests...');

  const existing = await prisma.returnRequest.count();
  if (existing > 0) {
    console.log(`ℹ️  Đã có ${existing} yêu cầu đổi trả, bỏ qua.\n`);
    return;
  }

  const admin = await prisma.user.findFirst({ where: { role: Role.ADMIN } });
  const deliveredOrders = await prisma.order.findMany({
    where: { status: OrderStatus.DELIVERED },
    include: { items: true },
  });

  if (deliveredOrders.length === 0) {
    console.log('⚠️  Chưa có đơn hàng đã giao, dừng seed return requests.\n');
    return;
  }

  const approvedOrLater: ReturnStatus[] = [
    ReturnStatus.APPROVED,
    ReturnStatus.ITEM_RECEIVED,
    ReturnStatus.REFUNDED,
    ReturnStatus.COMPLETED,
  ];
  const receivedOrLater: ReturnStatus[] = [
    ReturnStatus.ITEM_RECEIVED,
    ReturnStatus.REFUNDED,
    ReturnStatus.COMPLETED,
  ];
  const refundedOrLater: ReturnStatus[] = [
    ReturnStatus.REFUNDED,
    ReturnStatus.COMPLETED,
  ];

  const picked = randomSample(deliveredOrders, RETURN_STATUS_PLAN.length);
  let createdRequests = 0;
  let createdItems = 0;

  for (let i = 0; i < picked.length; i++) {
    const order = picked[i];
    const status = RETURN_STATUS_PLAN[i];
    const reason = randomPick(Object.values(ReturnReason));
    const createdAt = capAtNow(addDays(order.createdAt, randomInt(5, 15)));

    const chosenItems = randomSample(
      order.items,
      randomInt(1, Math.min(2, order.items.length)),
    );
    const itemsData = chosenItems.map((item) => ({
      orderItemId: item.id,
      quantity: randomInt(1, item.quantity),
      unitPrice: Number(item.price),
    }));
    const refundAmount = itemsData.reduce(
      (sum, it) => sum + it.quantity * it.unitPrice,
      0,
    );

    const isBankTransfer = Math.random() < 0.6;
    const refundMethod = isBankTransfer
      ? RefundMethod.BANK_TRANSFER
      : RefundMethod.ORIGINAL_PAYMENT_METHOD;

    const approvedAt = approvedOrLater.includes(status)
      ? capAtNow(addDays(createdAt, randomInt(0, 1)))
      : null;
    const itemReceivedAt =
      approvedAt && receivedOrLater.includes(status)
        ? capAtNow(addDays(approvedAt, randomInt(2, 5)))
        : null;
    const refundedAt =
      itemReceivedAt && refundedOrLater.includes(status)
        ? capAtNow(addDays(itemReceivedAt, randomInt(1, 2)))
        : null;
    const completedAt =
      refundedAt && status === ReturnStatus.COMPLETED
        ? capAtNow(addDays(refundedAt, randomInt(0, 1)))
        : null;
    const cancelledAt =
      status === ReturnStatus.CANCELLED
        ? capAtNow(addDays(createdAt, randomInt(0, 2)))
        : null;

    const updatedAt =
      completedAt ??
      refundedAt ??
      itemReceivedAt ??
      approvedAt ??
      cancelledAt ??
      (status === ReturnStatus.REJECTED
        ? capAtNow(addDays(createdAt, 1))
        : createdAt);

    const code = `RT${createdAt.getFullYear()}${String(createdAt.getMonth() + 1).padStart(2, '0')}-${String(i + 1).padStart(4, '0')}`;

    await prisma.returnRequest.create({
      data: {
        code,
        orderId: order.id,
        userId: order.userId,
        reason,
        reasonNote: RETURN_REASON_NOTES[reason],
        status,
        refundAmount,
        refundMethod,
        refundBankName: isBankTransfer ? randomPick(BANK_NAMES) : null,
        refundBankAccountNumber: isBankTransfer
          ? `${randomInt(100000000, 999999999)}${randomInt(100, 999)}`
          : null,
        refundBankAccountHolder: isBankTransfer
          ? slugify(order.recipientName).replace(/-/g, ' ').toUpperCase()
          : null,
        refundedById: refundedAt ? admin?.id : undefined,
        adminNote:
          approvedAt && Math.random() < 0.5
            ? 'Đã liên hệ khách hàng để xác nhận tình trạng sản phẩm.'
            : null,
        rejectReason:
          status === ReturnStatus.REJECTED
            ? randomPick(RETURN_REJECT_REASONS)
            : null,
        approvedAt,
        itemReceivedAt,
        refundedAt,
        completedAt,
        cancelledAt,
        createdAt,
        updatedAt,
        items: { create: itemsData },
      },
    });

    createdRequests++;
    createdItems += itemsData.length;
    console.log(`  ✅ ${code} - ${order.orderNumber} (${status})`);
  }

  console.log(
    `✅ Đã tạo ${createdRequests} yêu cầu đổi trả, ${createdItems} dòng sản phẩm.\n`,
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
        } catch {}
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

/**
 * Mã tỉnh/phường tham chiếu từ provinces.open-api.vn (API v2, đơn vị hành chính 2 cấp).
 * Mã tỉnh (provinceCode) dùng theo mã hành chính chuẩn của Tổng cục Thống kê, ổn định lâu dài.
 * Mã phường (wardCode) sau sáp nhập 2025 có thể thay đổi theo địa phương — cần đối chiếu
 * lại với API thật (GET /api/v2/p/{provinceCode}?depth=2) trước khi dùng cho môi trường thật.
 */
const WAREHOUSE_DEFS = [
  {
    name: 'Kho trung tâm TP. Hồ Chí Minh',
    provinceCode: 79,
    provinceName: 'TP. Hồ Chí Minh',
    wardCode: 26734,
    wardName: 'Phường Bình Hưng Hòa',
    addressDetail: 'Lô C12-C13, Cụm công nghiệp Vĩnh Lộc, 123 Quốc lộ 1A',
    isMain: true,
  },
  {
    name: 'Kho Hà Nội',
    provinceCode: 1,
    provinceName: 'Hà Nội',
    wardCode: 771,
    wardName: 'Phường Hoàng Liệt',
    addressDetail: 'Số 45, Đường Ngọc Hồi, Khu công nghiệp Ngọc Hồi',
    isMain: false,
  },
  {
    name: 'Kho Đà Nẵng',
    provinceCode: 48,
    provinceName: 'Đà Nẵng',
    wardCode: 20194,
    wardName: 'Phường Hòa Thọ Tây',
    addressDetail: 'Lô 15, Cụm công nghiệp Cẩm Lệ, 78 Đường Trường Chinh',
    isMain: false,
  },
];

async function seedWarehouses(prisma: PrismaClient) {
  console.log('🏬 Seeding warehouses...');

  const existing = await prisma.warehouse.count();
  if (existing > 0) {
    console.log(`ℹ️  Đã có ${existing} kho hàng, bỏ qua.\n`);
    return;
  }

  for (const def of WAREHOUSE_DEFS) {
    await prisma.warehouse.create({ data: def });
    console.log(`  ✅ ${def.name}${def.isMain ? ' (kho chính)' : ''}`);
  }

  console.log(`✅ Đã tạo ${WAREHOUSE_DEFS.length} kho hàng.\n`);
}

const SUPPLIER_DEFS = [
  {
    name: 'Công ty TNHH Gỗ Việt Phát',
    contactName: 'Nguyễn Văn Phát',
    phone: '+84 908 123 456',
    email: 'contact@govietphat.vn',
    provinceCode: 74,
    provinceName: 'Bình Dương',
    wardCode: 26536,
    wardName: 'Phường An Thạnh',
    addressDetail: 'Lô B5, Cụm công nghiệp Đồng An, Thuận An',
    note: 'Chuyên cung ứng gỗ sồi Mỹ và gỗ óc chó nhập khẩu đạt chuẩn FSC. Năng lực sản xuất ổn định cho đơn hàng số lượng lớn, thời gian giao hàng trung bình 7 đến 10 ngày làm việc.',
  },
  {
    name: 'Công ty Cổ phần Nội Thất Á Châu',
    contactName: 'Trần Thị Mai',
    phone: '+84 913 456 789',
    email: 'sales@noithatachau.com',
    provinceCode: 79,
    provinceName: 'TP. Hồ Chí Minh',
    wardCode: 27700,
    wardName: 'Phường Tân Sơn Nhì',
    addressDetail: 'Số 56 Lê Trọng Tấn',
    note: null,
  },
  {
    name: 'Công ty TNHH Vải Sợi Hàn Việt',
    contactName: 'Lê Minh Khôi',
    phone: '+84 987 654 321',
    email: 'khoi.le@vaisoihanviet.vn',
    provinceCode: 79,
    provinceName: 'TP. Hồ Chí Minh',
    wardCode: 27800,
    wardName: 'Phường Tân Sơn Nhất',
    addressDetail: 'Lô A3, Khu công nghiệp Tân Bình',
    note: 'Nhà cung cấp vải bọc sofa và ghế chuyên dụng, đa dạng chất liệu (nỉ, nhung, cotton pha). Có xưởng nhuộm màu theo yêu cầu và nhận đặt mẫu riêng theo bộ sưu tập.',
  },
  {
    name: 'Công ty TNHH Thép và Kim Loại Miền Nam',
    contactName: 'Phạm Anh Tuấn',
    phone: '+84 937 112 233',
    email: null,
    provinceCode: 74,
    provinceName: 'Bình Dương',
    wardCode: 26320,
    wardName: 'Phường Dĩ An',
    addressDetail: 'Lô D7, Khu công nghiệp Sóng Thần 2',
    note: null,
  },
  {
    name: 'Công ty TNHH Da Thật Sài Gòn',
    contactName: 'Đỗ Thị Hồng',
    phone: '+84 909 887 766',
    email: 'hong.do@dathatsaigon.vn',
    provinceCode: 79,
    provinceName: 'TP. Hồ Chí Minh',
    wardCode: 26404,
    wardName: 'Phường Trung Mỹ Tây',
    addressDetail: 'Số 12 Nguyễn Ảnh Thủ',
    note: 'Chuyên phân phối da PU và da thật cao cấp phục vụ sản xuất sofa, ghế văn phòng. Kiểm định chất lượng theo lô, hỗ trợ mẫu thử trước khi đặt hàng.',
  },
  {
    name: 'Công ty Cổ phần Kính Cường Lực Đông Á',
    contactName: 'Vũ Quang Huy',
    phone: '+84 977 445 566',
    email: 'huy.vu@kinhdonga.com',
    provinceCode: 31,
    provinceName: 'Hải Phòng',
    wardCode: 12898,
    wardName: 'Phường Đông Hải',
    addressDetail: 'Số 89 Nguyễn Văn Linh',
    note: null,
  },
  {
    name: 'Cơ sở Mây Tre Đan Cần Thơ',
    contactName: 'Huỳnh Thị Lan',
    phone: '+84 919 223 344',
    email: null,
    provinceCode: 92,
    provinceName: 'Cần Thơ',
    wardCode: 31240,
    wardName: 'Xã Mỹ Khánh',
    addressDetail: 'Ấp Nhơn Lộc 2, Phong Điền',
    note: 'Cung cấp mây tự nhiên qua xử lý chống mối mọt và mây nhựa giả mây. Phù hợp cho các dòng sản phẩm ghế, kệ trang trí phong cách tự nhiên.',
  },
  {
    name: 'Công ty TNHH Phụ Kiện Nội Thất Toàn Cầu',
    contactName: 'Bùi Văn Đức',
    phone: '+84 966 778 899',
    email: 'duc.bui@phukiennoithat.vn',
    provinceCode: 79,
    provinceName: 'TP. Hồ Chí Minh',
    wardCode: 27700,
    wardName: 'Phường Tân Sơn Nhì',
    addressDetail: 'Số 34 Lũy Bán Bích',
    note: 'Cung cấp phụ kiện nội thất công nghiệp: tay nắm, bánh xe, ray trượt, bản lề giảm chấn. Có sẵn kho hàng, thời gian giao nhanh trong khu vực TP. Hồ Chí Minh.',
  },
];

async function seedSuppliers(prisma: PrismaClient) {
  console.log('🚚 Seeding suppliers...');

  const existing = await prisma.supplier.count();
  if (existing > 0) {
    console.log(`ℹ️  Đã có ${existing} nhà cung cấp, bỏ qua.\n`);
    return;
  }

  for (const def of SUPPLIER_DEFS) {
    await prisma.supplier.create({ data: def });
    console.log(`  ✅ ${def.name}`);
  }

  console.log(`✅ Đã tạo ${SUPPLIER_DEFS.length} nhà cung cấp.\n`);
}

const PURCHASE_ORDERS_COUNT = 30;
const PO_NOTES = [
  'Đặt hàng bổ sung tồn kho định kỳ.',
  'Nhập hàng chuẩn bị cho đợt khuyến mãi.',
  'Bổ sung các mẫu bán chạy.',
  null,
  null,
];

function pickPurchaseOrderStatus(daysAgo: number): PurchaseOrderStatus {
  if (daysAgo > 30) {
    const roll = Math.random();
    if (roll < 0.75) return PurchaseOrderStatus.RECEIVED;
    if (roll < 0.9) return PurchaseOrderStatus.CANCELLED;
    return PurchaseOrderStatus.PARTIALLY_RECEIVED;
  }
  if (daysAgo > 7) {
    const roll = Math.random();
    if (roll < 0.4) return PurchaseOrderStatus.RECEIVED;
    if (roll < 0.7) return PurchaseOrderStatus.PARTIALLY_RECEIVED;
    if (roll < 0.9) return PurchaseOrderStatus.ORDERED;
    return PurchaseOrderStatus.CANCELLED;
  }
  const roll = Math.random();
  if (roll < 0.4) return PurchaseOrderStatus.DRAFT;
  if (roll < 0.8) return PurchaseOrderStatus.ORDERED;
  return PurchaseOrderStatus.PARTIALLY_RECEIVED;
}

async function seedPurchaseOrders(prisma: PrismaClient) {
  console.log('📦 Seeding purchase orders...');

  const existing = await prisma.purchaseOrder.count();
  if (existing > 0) {
    console.log(`ℹ️  Đã có ${existing} đơn nhập hàng, bỏ qua.\n`);
    return;
  }

  const suppliers = await prisma.supplier.findMany();
  const warehouses = await prisma.warehouse.findMany();
  const variants = await prisma.productVariant.findMany({
    include: { product: true },
  });
  const admin = await prisma.user.findFirst({ where: { role: Role.ADMIN } });

  if (
    suppliers.length === 0 ||
    warehouses.length === 0 ||
    variants.length === 0
  ) {
    console.log(
      '⚠️  Chưa có nhà cung cấp / kho hàng / biến thể sản phẩm, dừng seed purchase orders.\n',
    );
    return;
  }

  let createdOrders = 0;
  let createdItems = 0;

  for (let i = 0; i < PURCHASE_ORDERS_COUNT; i++) {
    const supplier = randomPick(suppliers);
    const warehouse = randomPick(warehouses);
    const createdAt = randomPastDate(120, 0);
    const daysAgo = Math.floor(
      (Date.now() - createdAt.getTime()) / (24 * 60 * 60 * 1000),
    );
    const status = pickPurchaseOrderStatus(daysAgo);

    const code = `PO${createdAt.getFullYear()}${String(createdAt.getMonth() + 1).padStart(2, '0')}-${String(i + 1).padStart(4, '0')}`;

    const itemVariants = randomSample(variants, randomInt(1, 5));
    const itemsData = itemVariants.map((variant) => {
      const quantityOrdered = randomInt(10, 100);
      let quantityReceived = 0;

      if (status === PurchaseOrderStatus.RECEIVED) {
        quantityReceived = quantityOrdered;
      } else if (status === PurchaseOrderStatus.PARTIALLY_RECEIVED) {
        quantityReceived = randomInt(1, quantityOrdered - 1);
      }

      const basePrice = variant.priceOverride
        ? Number(variant.priceOverride)
        : Number(variant.product.price);
      const unitCost = roundPrice(basePrice * (randomInt(40, 65) / 100));

      return {
        variantId: variant.id,
        quantityOrdered,
        quantityReceived,
        unitCost,
      };
    });

    const expectedAt =
      status === PurchaseOrderStatus.CANCELLED
        ? null
        : new Date(
            createdAt.getTime() + randomInt(3, 14) * 24 * 60 * 60 * 1000,
          );

    const receivedAt =
      status === PurchaseOrderStatus.RECEIVED ||
      status === PurchaseOrderStatus.PARTIALLY_RECEIVED
        ? new Date(createdAt.getTime() + randomInt(2, 20) * 24 * 60 * 60 * 1000)
        : null;

    await prisma.purchaseOrder.create({
      data: {
        code,
        supplierId: supplier.id,
        warehouseId: warehouse.id,
        status,
        note: randomPick(PO_NOTES) ?? undefined,
        expectedAt,
        receivedAt,
        createdById: admin?.id,
        createdAt,
        updatedAt: createdAt,
        items: { create: itemsData },
      },
    });

    createdOrders++;
    createdItems += itemsData.length;
    console.log(
      `  ✅ ${code} - ${supplier.name} → ${warehouse.name} (${status})`,
    );
  }

  console.log(
    `✅ Đã tạo ${createdOrders} đơn nhập hàng, ${createdItems} dòng chi tiết.\n`,
  );
}

const STOCK_MOVEMENT_NOTES: Partial<Record<StockMovementType, string[]>> = {
  ADJUSTMENT: ['Kiểm kê định kỳ', 'Điều chỉnh sau kiểm kho'],
  DAMAGED_OUT: [
    'Hàng bị hư hỏng trong kho',
    'Lỗi sản xuất phát hiện khi kiểm hàng',
  ],
  RETURN_IN: ['Khách trả hàng', 'Hoàn trả từ đơn hàng bị huỷ'],
  TRANSFER_IN: ['Nhận điều chuyển từ kho khác'],
  TRANSFER_OUT: ['Điều chuyển sang kho khác'],
};

const EXTRA_STOCK_MOVEMENTS_COUNT = 80;

async function seedStockMovements(prisma: PrismaClient) {
  console.log('📊 Seeding stock movements...');

  const existing = await prisma.stockMovement.count();
  if (existing > 0) {
    console.log(`ℹ️  Đã có ${existing} phiếu xuất/nhập kho, bỏ qua.\n`);
    return;
  }

  const admin = await prisma.user.findFirst({ where: { role: Role.ADMIN } });
  const warehouses = await prisma.warehouse.findMany();
  const variants = await prisma.productVariant.findMany();

  if (warehouses.length === 0 || variants.length === 0) {
    console.log(
      '⚠️  Chưa có kho hàng / biến thể sản phẩm, dừng seed stock movements.\n',
    );
    return;
  }

  let created = 0;

  const receivedItems = await prisma.purchaseOrderItem.findMany({
    where: { quantityReceived: { gt: 0 } },
    include: { purchaseOrder: true },
  });

  for (const item of receivedItems) {
    await prisma.stockMovement.create({
      data: {
        variantId: item.variantId,
        warehouseId: item.purchaseOrder.warehouseId,
        type: StockMovementType.PURCHASE_IN,
        quantity: item.quantityReceived,
        referenceType: 'PurchaseOrder',
        referenceId: item.purchaseOrder.id,
        createdById: admin?.id,
        createdAt:
          item.purchaseOrder.receivedAt ?? item.purchaseOrder.createdAt,
      },
    });
    created++;
  }

  const soldItems = await prisma.orderItem.findMany({
    where: {
      order: {
        status: {
          in: ['CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED'],
        },
      },
    },
    include: { order: true },
  });

  const mainWarehouse = warehouses.find((w) => w.isMain) ?? warehouses[0];

  for (const item of soldItems) {
    await prisma.stockMovement.create({
      data: {
        variantId: item.variantId,
        warehouseId: mainWarehouse.id,
        type: StockMovementType.SALE_OUT,
        quantity: -item.quantity,
        referenceType: 'Order',
        referenceId: item.orderId,
        createdAt: item.order.createdAt,
      },
    });
    created++;
  }

  const otherTypes: StockMovementType[] = [
    StockMovementType.ADJUSTMENT,
    StockMovementType.DAMAGED_OUT,
    StockMovementType.RETURN_IN,
    StockMovementType.TRANSFER_IN,
    StockMovementType.TRANSFER_OUT,
  ];

  for (let i = 0; i < EXTRA_STOCK_MOVEMENTS_COUNT; i++) {
    const type = randomPick(otherTypes);
    const variant = randomPick(variants);
    const warehouse = randomPick(warehouses);

    const isNegative =
      type === StockMovementType.DAMAGED_OUT ||
      type === StockMovementType.TRANSFER_OUT;
    const quantity = randomInt(1, 20) * (isNegative ? -1 : 1);

    const notes = STOCK_MOVEMENT_NOTES[type];

    await prisma.stockMovement.create({
      data: {
        variantId: variant.id,
        warehouseId: warehouse.id,
        type,
        quantity,
        note: notes ? randomPick(notes) : undefined,
        createdById: admin?.id,
        createdAt: randomPastDate(90, 0),
      },
    });
    created++;
  }

  console.log(`✅ Đã tạo ${created} phiếu xuất/nhập kho.\n`);
}

async function seedNotifications(prisma: PrismaClient) {
  console.log('🔔 Seeding notifications...');

  const existing = await prisma.notification.count();
  if (existing > 0) {
    console.log(`ℹ️  Đã có ${existing} thông báo, bỏ qua.\n`);
    return;
  }

  const admin = await prisma.user.findFirst({ where: { role: Role.ADMIN } });
  let created = 0;

  const recentOrders = await prisma.order.findMany({
    orderBy: { createdAt: 'desc' },
    take: 25,
  });

  for (const order of recentOrders) {
    await prisma.notification.create({
      data: {
        type: NotificationType.ORDER_CREATED,
        audience: NotificationAudience.ADMIN,
        recipientId: admin?.id,
        title: 'Đơn hàng mới',
        message: `Đơn hàng ${order.orderNumber} vừa được tạo.`,
        link: `/dashboard/orders/${order.id}`,
        metadata: { orderId: order.id, orderNumber: order.orderNumber },
        isRead: Math.random() < 0.5,
        createdAt: order.createdAt,
      },
    });
    created++;

    if (order.status !== 'PENDING') {
      await prisma.notification.create({
        data: {
          type: NotificationType.ORDER_STATUS_CHANGED,
          audience: NotificationAudience.USER,
          recipientId: order.userId,
          title: 'Cập nhật đơn hàng',
          message: `Đơn hàng ${order.orderNumber} đã chuyển sang trạng thái ${order.status}.`,
          link: `/orders/${order.id}`,
          metadata: { orderId: order.id, status: order.status },
          isRead: Math.random() < 0.3,
          createdAt: order.updatedAt,
        },
      });
      created++;
    }
  }

  const awaitingPayments = await prisma.payment.findMany({
    where: { status: 'AWAITING_CONFIRM' },
    include: { order: true },
  });

  for (const payment of awaitingPayments) {
    await prisma.notification.create({
      data: {
        type: NotificationType.PAYMENT_AWAITING_CONFIRM,
        audience: NotificationAudience.ADMIN,
        recipientId: admin?.id,
        title: 'Thanh toán cần xác nhận',
        message: `Đơn hàng ${payment.order.orderNumber} có thanh toán đang chờ xác nhận.`,
        link: `/dashboard/payments/${payment.id}`,
        metadata: { paymentId: payment.id, orderId: payment.orderId },
        isRead: false,
        createdAt: payment.createdAt,
      },
    });
    created++;
  }

  const lowStockVariants = await prisma.productVariant.findMany({
    where: { stock: { lt: 5 } },
    include: { product: true },
    take: 20,
  });

  for (const variant of lowStockVariants) {
    await prisma.notification.create({
      data: {
        type: NotificationType.PRODUCT_LOW_STOCK,
        audience: NotificationAudience.ADMIN,
        recipientId: admin?.id,
        title: 'Sắp hết hàng',
        message: `Biến thể "${variant.name}" của sản phẩm "${variant.product.name}" chỉ còn ${variant.stock} sản phẩm.`,
        link: `/dashboard/products/${variant.productId}`,
        metadata: { variantId: variant.id, stock: variant.stock },
        isRead: Math.random() < 0.4,
        createdAt: randomPastDate(15, 0),
      },
    });
    created++;
  }

  const recentReviews = await prisma.review.findMany({
    orderBy: { createdAt: 'desc' },
    take: 20,
    include: { product: true },
  });

  for (const review of recentReviews) {
    await prisma.notification.create({
      data: {
        type: NotificationType.REVIEW_CREATED,
        audience: NotificationAudience.ADMIN,
        recipientId: admin?.id,
        title: 'Đánh giá mới',
        message: `${review.authorName} vừa đánh giá ${review.rating} sao cho sản phẩm "${review.product.name}".`,
        link: `/dashboard/products/${review.productId}#reviews`,
        metadata: { reviewId: review.id, rating: review.rating },
        isRead: Math.random() < 0.5,
        createdAt: review.createdAt,
      },
    });
    created++;
  }

  const comments = await prisma.reviewComment.findMany({
    take: 30,
    orderBy: { createdAt: 'desc' },
    include: { review: true },
  });

  for (const comment of comments) {
    if (comment.parentId) {
      const parent = await prisma.reviewComment.findUnique({
        where: { id: comment.parentId },
      });
      await prisma.notification.create({
        data: {
          type: NotificationType.COMMENT_CREATED,
          audience: NotificationAudience.USER,
          recipientId: parent?.userId,
          title: 'Có phản hồi mới',
          message: 'Bình luận của bạn vừa nhận được phản hồi từ shop.',
          link: `/reviews/${comment.reviewId}#comment-${comment.id}`,
          metadata: { commentId: comment.id, reviewId: comment.reviewId },
          isRead: Math.random() < 0.3,
          createdAt: comment.createdAt,
        },
      });
    } else {
      await prisma.notification.create({
        data: {
          type: NotificationType.COMMENT_CREATED,
          audience: NotificationAudience.ADMIN,
          recipientId: admin?.id,
          title: 'Bình luận mới',
          message: 'Có khách hàng vừa bình luận vào một đánh giá.',
          link: `/dashboard/reviews/${comment.reviewId}#comment-${comment.id}`,
          metadata: { commentId: comment.id, reviewId: comment.reviewId },
          isRead: Math.random() < 0.5,
          createdAt: comment.createdAt,
        },
      });
    }
    created++;
  }

  const returnRequests = await prisma.returnRequest.findMany({
    orderBy: { createdAt: 'desc' },
    take: 10,
    include: { order: true },
  });

  for (const returnRequest of returnRequests) {
    await prisma.notification.create({
      data: {
        type: NotificationType.RETURN_REQUEST_CREATED,
        audience: NotificationAudience.ADMIN,
        recipientId: admin?.id,
        title: 'Yêu cầu đổi trả mới',
        message: `Đơn hàng ${returnRequest.order.orderNumber} có yêu cầu đổi trả ${returnRequest.code}.`,
        link: `/dashboard/returns/${returnRequest.id}`,
        metadata: {
          returnRequestId: returnRequest.id,
          orderId: returnRequest.orderId,
        },
        isRead: Math.random() < 0.5,
        createdAt: returnRequest.createdAt,
      },
    });
    created++;
  }

  console.log(`✅ Đã tạo ${created} thông báo.\n`);
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
    await seedWarehouses(prisma);
    await seedSuppliers(prisma);
    await seedProducts(prisma);
    await seedCustomers(prisma);
    await seedAddresses(prisma);
    await seedRefreshTokens(prisma);
    await seedPosts(prisma);
    await seedVouchers(prisma);
    await seedShippingZones(prisma);
    await seedOrdersAndVoucherUsages(prisma);
    await seedShipments(prisma);
    await seedReturnRequests(prisma);
    await seedPurchaseOrders(prisma);
    await seedStockMovements(prisma);
    await seedCarts(prisma);
    await seedReviews(prisma);
    await seedNotifications(prisma);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error('❌ Seed failed:', e);
  process.exit(1);
});

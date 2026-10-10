import {
  Role,
  Prisma,
  OrderStatus,
  VoucherType,
  PrismaClient,
  AuthProvider,
  VoucherScope,
  ReturnReason,
  ReturnStatus,
  RefundMethod,
  ProductStatus,
  PaymentMethod,
  PaymentStatus,
  VoucherStatus,
  ShipmentStatus,
  ShippingProvider,
  ConfirmationType,
  NotificationType,
  StockMovementType,
  PurchaseOrderStatus,
  NotificationAudience,
} from '@prisma/client';
import 'dotenv/config';
import * as argon2 from 'argon2';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';
import { PrismaPg } from '@prisma/adapter-pg';

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

/* ────────────────────────────────────────────────────────────────
 * Cấu hình
 * ──────────────────────────────────────────────────────────────── */
const SEED_PASSWORD = 'Moho@12345';
const NOW = new Date();

/**
 * Ảnh minh chứng chuyển khoản được vẽ dạng SVG giống màn hình "Chuyển khoản
 * thành công" của app ngân hàng.
 *  - Không set SEED_ASSET_BASE_URL  → lưu thẳng vào DB dạng data URI (chạy ngay, không cần cấu hình).
 *  - Có SEED_ASSET_BASE_URL         → ghi file vào SEED_ASSET_DIR (mặc định public/seed)
 *                                      và lưu URL `${BASE}/<tên>.svg`.
 */
const ASSET_BASE = process.env.SEED_ASSET_BASE_URL?.replace(/\/$/, '');
const ASSET_DIR = process.env.SEED_ASSET_DIR ?? 'public/seed';

/* ────────────────────────────────────────────────────────────────
 * Helpers
 * ──────────────────────────────────────────────────────────────── */
function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = mulberry32(20260101);

const int = (min: number, max: number) =>
  Math.floor(rand() * (max - min + 1)) + min;
const chance = (p: number) => rand() < p;
const pick = <T>(arr: T[]): T => arr[int(0, arr.length - 1)];
const shuffle = <T>(arr: T[]): T[] => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = int(0, i);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};
const rep = <T>(n: number, x: T): T[] => Array.from({ length: n }, () => x);

const clamp = (d: Date) =>
  d.getTime() > NOW.getTime() - 60_000 ? new Date(NOW.getTime() - 60_000) : d;
const daysAgo = (d: number) => {
  const x = new Date(NOW);
  x.setDate(x.getDate() - d);
  x.setHours(int(8, 21), int(0, 59), int(0, 59), 0);
  return clamp(x);
};
const daysFromNow = (d: number) => new Date(NOW.getTime() + d * 86_400_000);
const addDays = (d: Date, n: number) =>
  clamp(new Date(d.getTime() + n * 86_400_000));
const addHours = (d: Date, n: number) =>
  clamp(new Date(d.getTime() + n * 3_600_000));
const addMinutes = (d: Date, n: number) =>
  clamp(new Date(d.getTime() + n * 60_000));

const ymd = (d: Date) =>
  `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
const pad = (n: number, len = 4) => String(n).padStart(len, '0');
const img = (seed: string, w = 800, h = 600) =>
  `https://picsum.photos/seed/${seed}/${w}/${h}`;
const roundK = (n: number) => Math.round(n / 1000) * 1000;
const money = (n: number) =>
  String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
const vnd = (n: number) => `${money(n)}đ`;
const noAccent = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D');
const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const fmtDateTime = (d: Date) =>
  `${pad(d.getDate(), 2)}/${pad(d.getMonth() + 1, 2)}/${d.getFullYear()} ${pad(d.getHours(), 2)}:${pad(d.getMinutes(), 2)}:${pad(d.getSeconds(), 2)}`;
const digits = (n: number) =>
  Array.from({ length: n }, (_, i) => (i === 0 ? int(1, 9) : int(0, 9))).join(
    '',
  );

/* ────────────────────────────────────────────────────────────────
 * Ngân hàng + ảnh minh chứng chuyển khoản
 * ──────────────────────────────────────────────────────────────── */
type Bank = { code: string; name: string; grad: [string, string] };

const BANKS: Bank[] = [
  { code: 'VCB', name: 'Vietcombank', grad: ['#2BB673', '#007A3D'] },
  { code: 'TCB', name: 'Techcombank', grad: ['#F2545B', '#C8101A'] },
  { code: 'MB', name: 'MB Bank', grad: ['#3F51E8', '#141ED2'] },
  { code: 'BIDV', name: 'BIDV', grad: ['#00BFB3', '#0068B0'] },
  { code: 'CTG', name: 'VietinBank', grad: ['#2B8CD8', '#0A4F95'] },
  { code: 'ACB', name: 'ACB', grad: ['#2E7BD0', '#0B3F85'] },
  { code: 'TPB', name: 'TPBank', grad: ['#9B4DCA', '#5B1A8B'] },
  { code: 'VPB', name: 'VPBank', grad: ['#2FC37B', '#00804F'] },
  { code: 'STB', name: 'Sacombank', grad: ['#2F7ED6', '#0A3E86'] },
  { code: 'AGR', name: 'Agribank', grad: ['#D8365B', '#8E1230'] },
];

// Tài khoản nhận tiền / chi hoàn tiền của shop (BIDV – giống màn hình mẫu)
const SHOP = {
  bank: BANKS[3],
  account: '31410001234567',
  holder: 'CONG TY TNHH MOHO',
};

function asset(name: string, svg: string) {
  if (!ASSET_BASE) {
    return `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;
  }
  mkdirSync(ASSET_DIR, { recursive: true });
  writeFileSync(join(ASSET_DIR, `${name}.svg`), svg);
  return `${ASSET_BASE}/${name}.svg`;
}

type Receipt = {
  bank: Bank; // ngân hàng của app thực hiện chuyển khoản (quyết định màu/logo)
  amount: number;
  at: Date;
  toName: string;
  toBank: string;
  toAccount: string;
  content: string;
  ref: string;
};

const commaMoney = (n: number) =>
  String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ',');

function wrapText(s: string, max: number) {
  const lines: string[] = [];
  let cur = '';
  for (const w of s.split(' ')) {
    const next = cur ? `${cur} ${w}` : w;
    if (cur && next.length > max) {
      lines.push(cur);
      cur = w;
    } else cur = next;
  }
  if (cur) lines.push(cur);
  return lines;
}

function bankLogo(bank: Bank, cx: number, cy: number) {
  if (bank.code === 'BIDV') {
    // Logo hình thoi đỏ – xanh (vẽ đơn giản hoá)
    return `<g transform="translate(${cx} ${cy})">
<polygon points="0,-48 54,0 0,48 -54,0" fill="#E31E24"/>
<polygon points="0,-39 44,0 0,39 -44,0" fill="#FFFFFF"/>
<rect x="-22" y="-20" width="15" height="28" rx="2" fill="#1B3F94"/>
<path d="M2 -26 a13 13 0 0 1 0 26 z" fill="#1B3F94"/>
<polygon points="-32,6 -17,6 0,26 17,6 32,6 0,38" fill="#E31E24"/>
</g>`;
  }
  return `<g transform="translate(${cx} ${cy})">
<circle r="46" fill="${bank.grad[1]}"/>
<circle r="38" fill="none" stroke="#FFFFFF" stroke-opacity="0.55" stroke-width="2"/>
<text y="10" font-size="${bank.code.length > 3 ? 24 : 30}" font-weight="800" fill="#FFFFFF" text-anchor="middle">${esc(bank.code)}</text>
</g>`;
}

/**
 * Màn hình "Giao dịch thành công" kiểu app ngân hàng (ticket răng cưa,
 * nền gradient, status bar + thanh điều hướng Android), kích thước 540×1200.
 */
function receiptSvg(r: Receipt) {
  const [c1, c2] = r.bank.grad;
  const sentence = `Quý khách đã chuyển thành công số tiền ${commaMoney(r.amount)} VND đến số tài khoản ${r.toAccount}/ ${r.toName}/ ${r.toBank.toUpperCase()} vào lúc ${fmtDateTime(r.at)}.`;
  const lines = wrapText(sentence, 35);
  const lastY = 352 + (lines.length - 1) * 41;
  const contentY = lastY + 40;
  const shift = lastY + 74 - 518; // đẩy phần bên dưới xuống theo số dòng
  const Y = (v: number) => v + shift;

  const hhmm = `${pad(r.at.getHours(), 2)}:${pad(r.at.getMinutes(), 2)}`;
  const battery = int(18, 92);
  const teal = '#12B5A6';

  const paragraph = lines
    .map(
      (l, i) =>
        `<text x="270" y="${352 + i * 41}" font-size="23" font-weight="600" fill="#111827" text-anchor="middle">${esc(l)}</text>`,
    )
    .join('\n');

  const scallopTop = Array.from({ length: 36 }, (_, i) => 31 + i * 13.6)
    .map((x) => `<circle cx="${x.toFixed(1)}" cy="84" r="6"/>`)
    .join('');
  const scallopBottom = Array.from({ length: 36 }, (_, i) => 31 + i * 13.6)
    .map((x) => `<circle cx="${x.toFixed(1)}" cy="${Y(770)}" r="6"/>`)
    .join('');

  return `<svg xmlns="http://www.w3.org/2000/svg" width="540" height="1200" viewBox="0 0 540 1200" font-family="Arial, Helvetica, sans-serif">
<defs>
<linearGradient id="bg" gradientUnits="userSpaceOnUse" x1="0" y1="260" x2="540" y2="760">
<stop offset="0" stop-color="${c1}"/><stop offset="1" stop-color="${c2}"/>
</linearGradient>
<mask id="notch">
<rect width="540" height="1200" fill="#fff"/>
<circle cx="24" cy="287" r="13" fill="#000"/>
<circle cx="516" cy="287" r="13" fill="#000"/>
</mask>
</defs>
<rect width="540" height="1200" fill="url(#bg)"/>

<text x="20" y="38" font-size="22" font-weight="700" fill="#FFFFFF">${hhmm}</text>
<rect x="84" y="22" width="16" height="16" rx="4" fill="#FFFFFF" fill-opacity="0.9"/>
<text x="380" y="38" font-size="13" font-weight="700" fill="#FFFFFF" text-anchor="end">4G</text>
<rect x="388" y="30" width="5" height="8" fill="#FFFFFF"/><rect x="395" y="25" width="5" height="13" fill="#FFFFFF"/><rect x="402" y="20" width="5" height="18" fill="#FFFFFF" fill-opacity="0.5"/>
<text x="478" y="38" font-size="20" font-weight="700" fill="#FFFFFF" text-anchor="end">${battery}%</text>
<rect x="491" y="24" width="12" height="16" rx="2" fill="#FFFFFF" fill-opacity="0.9"/>

<g mask="url(#notch)" fill="#FFFFFF">
<rect x="24" y="84" width="492" height="${Y(770) - 84}"/>
${scallopTop}
${scallopBottom}
</g>

${bankLogo(r.bank, 270, 168)}
<text x="270" y="244" font-size="27" font-weight="800" fill="#111827" text-anchor="middle">Giao dịch thành công</text>
<line x1="44" y1="287" x2="496" y2="287" stroke="#D1D5DB" stroke-width="2" stroke-dasharray="6 6"/>

${paragraph}
<text x="270" y="${contentY}" font-size="19" fill="#6B7280" text-anchor="middle">Nội dung: ${esc(r.content)}</text>

<line x1="170" y1="${Y(518)}" x2="370" y2="${Y(518)}" stroke="#E5E7EB" stroke-width="2" stroke-dasharray="5 5"/>
<text x="270" y="${Y(566)}" font-size="24" font-weight="700" fill="#111827" text-anchor="middle">Số tham chiếu ${esc(r.ref)}</text>

<line x1="196" y1="${Y(598)}" x2="196" y2="${Y(668)}" stroke="#E5E7EB" stroke-width="2"/>
<line x1="345" y1="${Y(598)}" x2="345" y2="${Y(668)}" stroke="#E5E7EB" stroke-width="2"/>

<g fill="none" stroke="${teal}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
<rect x="109" y="${Y(603)}" width="26" height="26" rx="5"/>
<circle cx="118" cy="${Y(611)}" r="2.5" fill="${teal}"/>
<path d="M110 ${Y(626)} l8 -8 l6 6 l4 -4 l7 7"/>
<circle cx="278" cy="${Y(607)}" r="4.5"/><circle cx="262" cy="${Y(616)}" r="4.5"/><circle cx="278" cy="${Y(626)}" r="4.5"/>
<path d="M266 ${Y(614)} L274 ${Y(609)} M266 ${Y(618)} L274 ${Y(624)}"/>
<path d="M405 ${Y(618)} L418 ${Y(605)} L431 ${Y(618)} V${Y(630)} H405 Z"/>
<path d="M414 ${Y(630)} V${Y(622)} H422 V${Y(630)}"/>
</g>
<g font-size="20" font-weight="700" fill="#111827" text-anchor="middle">
<text x="122" y="${Y(662)}">Lưu ảnh</text><text x="270" y="${Y(662)}">Chia sẻ</text><text x="418" y="${Y(662)}">Trang chủ</text>
</g>

<circle cx="147" cy="${Y(714)}" r="12" fill="${teal}"/>
<path d="M147 ${Y(708)} v12 M141 ${Y(714)} h12" stroke="#FFFFFF" stroke-width="2.5" stroke-linecap="round"/>
<text x="173" y="${Y(721)}" font-size="20" font-weight="600" fill="#111827">Thêm vào quản lý chi tiêu</text>

<rect x="46" y="${Y(818)}" width="24" height="24" rx="4" fill="#FFFFFF"/>
<text x="88" y="${Y(840)}" font-size="25" font-weight="600" fill="#FFFFFF">Lưu mẫu chuyển tiền</text>
<rect x="46" y="${Y(885)}" width="24" height="24" rx="4" fill="#FFFFFF"/>
<text x="88" y="${Y(907)}" font-size="25" font-weight="600" fill="#FFFFFF">Gửi email thông báo giao dịch</text>

<rect x="24" y="${Y(956)}" width="492" height="76" rx="14" fill="#F4F9FF"/>
<text x="270" y="${Y(1004)}" font-size="26" font-weight="800" fill="#111827" text-anchor="middle">Tạo giao dịch mới</text>

<rect x="0" y="1128" width="540" height="72" fill="#F1F1F3"/>
<g stroke="#6B7280" stroke-width="3" stroke-linecap="round" fill="none">
<path d="M113 1152 v24 M121 1152 v24 M129 1152 v24"/>
<circle cx="270" cy="1164" r="11"/>
<path d="M428 1153 l-12 11 l12 11"/>
</g>
</svg>`;
}

const makeRef = () => digits(9);

/* ────────────────────────────────────────────────────────────────
 * Khách hàng (tên thật, email thật dạng gmail/outlook…, SĐT +84, avatar ảnh người)
 * ──────────────────────────────────────────────────────────────── */
type Gender = 'f' | 'm';
const CUSTOMER_SEED: { name: string; g: Gender }[] = [
  { name: 'Nguyễn Minh Anh', g: 'f' },
  { name: 'Trần Quốc Bảo', g: 'm' },
  { name: 'Lê Thị Hồng Nhung', g: 'f' },
  { name: 'Phạm Đức Thịnh', g: 'm' },
  { name: 'Võ Ngọc Lan', g: 'f' },
  { name: 'Đặng Hoàng Long', g: 'm' },
  { name: 'Bùi Thu Trang', g: 'f' },
  { name: 'Huỳnh Gia Huy', g: 'm' },
  { name: 'Trần Thị Mai Hương', g: 'f' },
  { name: 'Lê Anh Tuấn', g: 'm' },
  { name: 'Phạm Thanh Thảo', g: 'f' },
  { name: 'Nguyễn Văn Dũng', g: 'm' },
  { name: 'Đỗ Khánh Linh', g: 'f' },
  { name: 'Võ Minh Khôi', g: 'm' },
  { name: 'Hoàng Phương Anh', g: 'f' },
  { name: 'Bùi Tấn Phát', g: 'm' },
  { name: 'Ngô Bích Ngọc', g: 'f' },
  { name: 'Trương Quang Vinh', g: 'm' },
  { name: 'Dương Thùy Dung', g: 'f' },
  { name: 'Đoàn Hải Nam', g: 'm' },
  { name: 'Lý Kim Ngân', g: 'f' },
  { name: 'Mai Xuân Trường', g: 'm' },
  { name: 'Đinh Hà My', g: 'f' },
  { name: 'Phạm Hữu Nghĩa', g: 'm' },
  { name: 'Vũ Thị Hạnh', g: 'f' },
  { name: 'Cao Thái Sơn', g: 'm' },
  { name: 'Phan Diễm Quỳnh', g: 'f' },
  { name: 'Tạ Văn Hiếu', g: 'm' },
];

const EMAIL_DOMAINS = [
  'gmail.com',
  'gmail.com',
  'gmail.com',
  'outlook.com',
  'yahoo.com',
  'icloud.com',
];
const PHONE_PREFIXES = [
  '90',
  '93',
  '89',
  '70',
  '76',
  '77',
  '78',
  '79',
  '91',
  '94',
  '88',
  '83',
  '84',
  '85',
  '81',
  '82',
  '32',
  '33',
  '34',
  '35',
  '36',
  '37',
  '38',
  '39',
  '56',
  '58',
  '59',
];
const genPhone = () => `+84${pick(PHONE_PREFIXES)}${digits(7)}`;

const usedEmails = new Set<string>();
function buildEmail(name: string, i: number) {
  const words = noAccent(name).toLowerCase().split(' ');
  const family = words[0];
  const given = words
    .slice(1)
    .filter((w) => w !== 'thi' && w !== 'van')
    .join('');
  const yy = 85 + ((i * 7) % 15);
  const local = [
    `${given}.${family}${yy}`,
    `${family}${given}${yy}`,
    `${given}${family}.${yy}`,
    `${given}.${family}`,
  ][i % 4];
  const domain = EMAIL_DOMAINS[i % EMAIL_DOMAINS.length];
  let email = `${local}@${domain}`;
  if (usedEmails.has(email)) email = `${local}${i}@${domain}`;
  usedEmails.add(email);
  return email;
}

/**
 * Avatar kiểu Facebook: mỗi người một kiểu – có người không đặt ảnh (hiện chữ cái đầu),
 * có người để ảnh phong cảnh, thú cưng, hoa, hình minh hoạ; chỉ một ít là ảnh chân dung.
 */
const FLICKR_TOPICS = [
  'cat',
  'dog',
  'flower',
  'puppy',
  'kitten',
  'sunflower',
  'mountain',
  'beach',
  'coffee',
  'sunset',
  'bicycle',
  'forest',
  'lake',
  'bonsai',
];
const DICEBEAR_STYLES = [
  'thumbs',
  'fun-emoji',
  'shapes',
  'bottts-neutral',
  'icons',
];
const faceCounter: Record<Gender, number> = { f: 0, m: 0 };

function avatarFor(g: Gender, i: number): string | null {
  const r = rand();
  if (r < 0.22) return null; // chưa có avatar → UI hiện fallback chữ cái
  if (r < 0.45) return `https://picsum.photos/seed/moho-avatar-${i}/300/300`; // phong cảnh / vật thể
  if (r < 0.68)
    return `https://loremflickr.com/300/300/${pick(FLICKR_TOPICS)}?lock=${100 + i}`; // thú cưng, hoa, cảnh
  if (r < 0.88)
    return `https://api.dicebear.com/9.x/${pick(DICEBEAR_STYLES)}/png?seed=moho-${i}&size=300`; // hình minh hoạ
  const n = (12 + faceCounter[g]++ * 11) % 90; // ảnh chân dung (ít)
  return `https://randomuser.me/api/portraits/${g === 'f' ? 'women' : 'men'}/${n}.jpg`;
}

const CUSTOMERS = CUSTOMER_SEED.map((c, i) => ({
  name: c.name,
  email: buildEmail(c.name, i),
  phone: genPhone(),
  avatar: avatarFor(c.g, i),
  bank: BANKS[i % BANKS.length],
  bankAccount: digits(10 + (i % 4)),
}));

/* ────────────────────────────────────────────────────────────────
 * Địa chỉ / vùng giao hàng
 * ──────────────────────────────────────────────────────────────── */
const LOCATIONS = [
  {
    provinceCode: 79,
    provinceName: 'TP. Hồ Chí Minh',
    wardCode: 26734,
    wardName: 'Phường Bến Nghé',
  },
  {
    provinceCode: 79,
    provinceName: 'TP. Hồ Chí Minh',
    wardCode: 26797,
    wardName: 'Phường Thủ Đức',
  },
  {
    provinceCode: 79,
    provinceName: 'TP. Hồ Chí Minh',
    wardCode: 26743,
    wardName: 'Phường Tân Định',
  },
  {
    provinceCode: 79,
    provinceName: 'TP. Hồ Chí Minh',
    wardCode: 26752,
    wardName: 'Phường Bình Thạnh',
  },
  {
    provinceCode: 1,
    provinceName: 'Hà Nội',
    wardCode: 4,
    wardName: 'Phường Ba Đình',
  },
  {
    provinceCode: 1,
    provinceName: 'Hà Nội',
    wardCode: 9,
    wardName: 'Phường Cầu Giấy',
  },
  {
    provinceCode: 48,
    provinceName: 'Đà Nẵng',
    wardCode: 20194,
    wardName: 'Phường Hải Châu',
  },
  {
    provinceCode: 92,
    provinceName: 'Cần Thơ',
    wardCode: 31117,
    wardName: 'Phường Ninh Kiều',
  },
  {
    provinceCode: 75,
    provinceName: 'Đồng Nai',
    wardCode: 25762,
    wardName: 'Phường Biên Hòa',
  },
  {
    provinceCode: 31,
    provinceName: 'Hải Phòng',
    wardCode: 11332,
    wardName: 'Phường Hồng Bàng',
  },
  {
    provinceCode: 56,
    provinceName: 'Khánh Hòa',
    wardCode: 22330,
    wardName: 'Phường Nha Trang',
  },
  {
    provinceCode: 68,
    provinceName: 'Lâm Đồng',
    wardCode: 24310,
    wardName: 'Phường Đà Lạt',
  },
  {
    provinceCode: 46,
    provinceName: 'Huế',
    wardCode: 19750,
    wardName: 'Phường Phú Xuân',
  },
];

const STREETS = [
  'Nguyễn Huệ',
  'Lê Lợi',
  'Trần Hưng Đạo',
  'Hai Bà Trưng',
  'Điện Biên Phủ',
  'Nguyễn Trãi',
  'Cách Mạng Tháng 8',
  'Phạm Văn Đồng',
  'Võ Văn Tần',
  'Lý Thường Kiệt',
  'Nguyễn Thị Minh Khai',
  'Lê Văn Sỹ',
  'Phan Xích Long',
  'Hoàng Diệu',
  'Trường Chinh',
];

const ZONES = [
  {
    name: 'Nội thành TP.HCM',
    baseFee: 25000,
    freeShipMinOrder: 3000000,
    days: [1, 2],
    provinces: [[79, 'TP. Hồ Chí Minh']],
  },
  {
    name: 'Miền Nam',
    baseFee: 45000,
    freeShipMinOrder: 5000000,
    days: [2, 4],
    provinces: [
      [75, 'Đồng Nai'],
      [80, 'Tây Ninh'],
      [92, 'Cần Thơ'],
      [86, 'Vĩnh Long'],
      [87, 'Đồng Tháp'],
      [91, 'An Giang'],
      [96, 'Cà Mau'],
      [68, 'Lâm Đồng'],
    ],
  },
  {
    name: 'Miền Trung',
    baseFee: 65000,
    freeShipMinOrder: 7000000,
    days: [3, 5],
    provinces: [
      [48, 'Đà Nẵng'],
      [46, 'Huế'],
      [56, 'Khánh Hòa'],
      [66, 'Đắk Lắk'],
      [52, 'Gia Lai'],
      [51, 'Quảng Ngãi'],
      [44, 'Quảng Trị'],
      [40, 'Nghệ An'],
      [42, 'Hà Tĩnh'],
      [38, 'Thanh Hóa'],
    ],
  },
  {
    name: 'Miền Bắc',
    baseFee: 85000,
    freeShipMinOrder: 8000000,
    days: [4, 7],
    provinces: [
      [1, 'Hà Nội'],
      [31, 'Hải Phòng'],
      [22, 'Quảng Ninh'],
      [24, 'Bắc Ninh'],
      [33, 'Hưng Yên'],
      [37, 'Ninh Bình'],
      [19, 'Thái Nguyên'],
      [25, 'Phú Thọ'],
    ],
  },
] as const;

const DRIVERS = [
  { name: 'Nguyễn Văn Tài', phone: '+84903111222', plate: '51C-123.45' },
  { name: 'Trần Minh Khoa', phone: '+84903111333', plate: '51D-678.90' },
  { name: 'Lê Hữu Phước', phone: '+84903111444', plate: '60C-246.80' },
  { name: 'Phạm Quang Vinh', phone: '+84903111555', plate: '29C-135.79' },
  { name: 'Hồ Thanh Tùng', phone: '+84903111666', plate: '51C-864.20' },
  { name: 'Đinh Công Hậu', phone: '+84903111777', plate: '43C-579.31' },
];

const SUPPLIERS = [
  {
    name: 'Công ty TNHH Gỗ Việt Phát',
    contactName: 'Trần Văn Hưng',
    phone: '+842743822111',
    email: 'sales@govietphat.vn',
    provinceCode: 79,
    provinceName: 'TP. Hồ Chí Minh',
    wardCode: 26797,
    wardName: 'Phường Thủ Đức',
    addressDetail: '45 Đường số 7, KCN Linh Trung',
  },
  {
    name: 'Xưởng Nội Thất Hòa Phát Đồng Nai',
    contactName: 'Lê Thị Mai',
    phone: '+842513888222',
    email: 'order@noithatdongnai.vn',
    provinceCode: 75,
    provinceName: 'Đồng Nai',
    wardCode: 25762,
    wardName: 'Phường Biên Hòa',
    addressDetail: '12 QL1A, KCN Biên Hòa 2',
  },
  {
    name: 'Công ty CP Vải & Da Sài Gòn',
    contactName: 'Nguyễn Hữu Đức',
    phone: '+842838123456',
    email: 'cskh@vaidasaigon.vn',
    provinceCode: 79,
    provinceName: 'TP. Hồ Chí Minh',
    wardCode: 26734,
    wardName: 'Phường Bến Nghé',
    addressDetail: '88 Lê Lợi',
  },
  {
    name: 'Phụ Kiện Nội Thất An Khang',
    contactName: 'Võ Thanh Sơn',
    phone: '+84909777888',
    email: 'ankhang@phukien.vn',
    provinceCode: 1,
    provinceName: 'Hà Nội',
    wardCode: 4,
    wardName: 'Phường Ba Đình',
    addressDetail: '23 Kim Mã',
  },
  {
    name: 'Công ty TNHH Đệm Mút Kim Cương',
    contactName: 'Phạm Thị Lệ',
    phone: '+842743655999',
    email: 'kinhdoanh@demkimcuong.vn',
    provinceCode: 79,
    provinceName: 'TP. Hồ Chí Minh',
    wardCode: 26752,
    wardName: 'Phường Bình Thạnh',
    addressDetail: '210 Xô Viết Nghệ Tĩnh',
  },
  {
    name: 'Mây Tre Đan Lát Phú Xuyên',
    contactName: 'Đỗ Văn Khải',
    phone: '+84912456789',
    email: 'phuxuyen.maytre@gmail.com',
    provinceCode: 1,
    provinceName: 'Hà Nội',
    wardCode: 9,
    wardName: 'Phường Cầu Giấy',
    addressDetail: '77 Xuân Thủy',
  },
];

/* ────────────────────────────────────────────────────────────────
 * Nội dung đánh giá / bình luận
 * ──────────────────────────────────────────────────────────────── */
const REVIEW_TEXT: Record<'good' | 'ok' | 'bad', string[]> = {
  good: [
    'Sản phẩm đẹp hơn mong đợi, gỗ chắc chắn, hoàn thiện tỉ mỉ. Giao hàng nhanh, lắp ráp gọn gàng.',
    'Rất ưng ý, màu sắc đúng như hình. Nhân viên giao hàng nhiệt tình, hỗ trợ lắp đặt tận nơi.',
    'Chất lượng tốt so với tầm giá, đặt vào phòng khách nhìn rất sang. Sẽ ủng hộ shop tiếp.',
    'Đóng gói cẩn thận, không có vết xước nào. Ngồi/sử dụng rất thoải mái, gia đình mình đều thích.',
    'Thiết kế tối giản nhưng tinh tế, hợp với căn hộ nhỏ của mình. 5 sao cho shop.',
    'Mua về dùng được một thời gian rồi, vẫn rất chắc chắn, không ọp ẹp hay kêu cót két.',
    'Shop tư vấn nhiệt tình, chọn đúng kích thước cho phòng mình. Giao đúng hẹn, hàng y hình.',
    'Bề mặt sơn mịn, đường vân gỗ đẹp. Bạn bè đến chơi ai cũng hỏi mua ở đâu.',
  ],
  ok: [
    'Sản phẩm ổn, đúng mô tả. Giao hơi chậm một chút nhưng nhân viên có báo trước.',
    'Chất lượng tạm được, màu thực tế hơi đậm hơn ảnh. Nhìn chung vẫn hài lòng.',
    'Dùng ổn, lắp ráp hơi mất thời gian vì hướng dẫn chưa rõ lắm.',
    'Giá hợp lý, hàng đúng như quảng cáo, chỉ có phần đóng gói có thể kỹ hơn.',
  ],
  bad: [
    'Hàng có vết trầy nhỏ ở cạnh, đã báo shop và đang chờ xử lý.',
    'Màu sắc khác khá nhiều so với hình, hơi thất vọng.',
    'Giao trễ hơn dự kiến 2 ngày, sản phẩm tạm ổn nhưng trải nghiệm mua hàng chưa tốt.',
  ],
};
const USED_FOR = [
  'Phòng khách',
  'Phòng ngủ',
  'Phòng làm việc',
  'Phòng ăn',
  'Căn hộ chung cư',
];
const ADMIN_REPLIES = [
  'MOHO cảm ơn bạn đã tin tưởng và ủng hộ. Chúc bạn có không gian sống thật thoải mái!',
  'Cảm ơn bạn đã chia sẻ. Nếu cần hỗ trợ thêm, bạn cứ nhắn cho MOHO nhé.',
  'MOHO xin lỗi vì trải nghiệm chưa tốt. Bộ phận CSKH sẽ liên hệ bạn trong hôm nay để hỗ trợ.',
];
const CUSTOMER_COMMENTS = [
  'Mình cũng đang định mua, cho mình hỏi lắp ráp có khó không bạn?',
  'Cảm ơn bạn đã review, màu thực tế có giống hình không vậy?',
  'Mình mua rồi cũng thấy rất ổn, đồng ý với bạn nhé.',
  'Giao hàng ra Hà Nội mất khoảng mấy ngày vậy bạn?',
];

/* ────────────────────────────────────────────────────────────────
 * Main
 * ──────────────────────────────────────────────────────────────── */
type Customer = {
  id: string;
  name: string;
  email: string;
  phone: string;
  avatar: string | null;
  bank: Bank;
  bankAccount: string;
  holder: string;
};

async function main() {
  const products = (
    await prisma.product.findMany({
      where: { deletedAt: null, status: ProductStatus.ACTIVE },
      include: {
        variants: { orderBy: { sortOrder: 'asc' } },
        images: { where: { variantId: null }, orderBy: { sortOrder: 'asc' } },
      },
    })
  ).filter((p) => p.variants.length > 0);

  if (products.length === 0) {
    throw new Error(
      'Chưa có product ACTIVE nào trong DB – hãy tạo product trước khi seed.',
    );
  }
  const categories = await prisma.category.findMany({
    where: { deletedAt: null },
    orderBy: { createdAt: 'asc' },
  });

  const productById = new Map(products.map((p) => [p.id, p]));
  const unitPrice = (
    p: (typeof products)[number],
    v: (typeof products)[number]['variants'][number],
  ) => Number(v.priceOverride ?? p.price);
  const thumbOf = (p: (typeof products)[number]) =>
    (p.images.find((i) => i.isThumbnail) ?? p.images[0])?.url ?? null;
  // Ảnh "khách chụp" lấy từ chính ảnh của sản phẩm trong DB
  const productPhoto = (productId: string, fallbackSeed: string) => {
    const p = productById.get(productId);
    return p && p.images.length > 0 ? pick(p.images).url : img(fallbackSeed);
  };

  console.log(
    `→ Đọc được ${products.length} products, ${categories.length} categories`,
  );

  /* ── Xoá dữ liệu cũ ── */
  await prisma.$transaction([
    prisma.shipmentItem.deleteMany(),
    prisma.shipment.deleteMany(),
    prisma.returnRequestImage.deleteMany(),
    prisma.returnRequestItem.deleteMany(),
    prisma.returnRequest.deleteMany(),
    prisma.voucherUsage.deleteMany(),
    prisma.paymentWebhookEvent.deleteMany(),
    prisma.payment.deleteMany(),
    prisma.orderItem.deleteMany(),
    prisma.order.deleteMany(),
    prisma.cartItem.deleteMany(),
    prisma.cart.deleteMany(),
    prisma.reviewHelpful.deleteMany(),
    prisma.reviewComment.deleteMany(),
    prisma.reviewImage.deleteMany(),
    prisma.review.deleteMany(),
    prisma.stockMovement.deleteMany(),
    prisma.purchaseOrderItem.deleteMany(),
    prisma.purchaseOrder.deleteMany(),
    prisma.supplier.deleteMany(),
    prisma.warehouse.deleteMany(),
    prisma.voucherCategory.deleteMany(),
    prisma.voucherProduct.deleteMany(),
    prisma.voucher.deleteMany(),
    prisma.shippingZoneProvince.deleteMany(),
    prisma.shippingZone.deleteMany(),
    prisma.notification.deleteMany(),
    prisma.address.deleteMany(),
  ]);

  /* ── Users ── */
  const passwordHash = await argon2.hash(SEED_PASSWORD);

  // Dọn khách mock cũ dạng @example.com (dữ liệu liên quan đã bị xoá ở trên)
  await prisma.user
    .deleteMany({
      where: { role: Role.CUSTOMER, email: { endsWith: '@example.com' } },
    })
    .catch(() =>
      console.warn(
        '⚠ Không xoá được user @example.com cũ (có FK khác), bỏ qua.',
      ),
    );

  let admin = await prisma.user.findFirst({
    where: { role: Role.ADMIN, deletedAt: null },
    orderBy: { createdAt: 'asc' },
  });
  if (!admin) {
    admin = await prisma.user.create({
      data: {
        name: 'Quản trị viên',
        email: 'admin@moho.vn',
        password: passwordHash,
        role: Role.ADMIN,
        emailVerified: true,
      },
    });
  } else if (admin.avatar) {
    // admin không dùng avatar (xoá nếu lần seed trước có set)
    admin = await prisma.user.update({
      where: { id: admin.id },
      data: { avatar: null },
    });
  }

  const customers: Customer[] = [];
  for (const c of CUSTOMERS) {
    const u = await prisma.user.upsert({
      where: { email: c.email },
      update: { name: c.name, avatar: c.avatar },
      create: {
        name: c.name,
        email: c.email,
        password: passwordHash,
        provider: AuthProvider.LOCAL,
        role: Role.CUSTOMER,
        emailVerified: true,
        avatar: c.avatar,
        createdAt: daysAgo(int(130, 260)),
      },
    });
    customers.push({
      id: u.id,
      name: u.name,
      email: c.email,
      phone: c.phone,
      avatar: c.avatar,
      bank: c.bank,
      bankAccount: c.bankAccount,
      holder: noAccent(u.name).toUpperCase(),
    });
  }
  const customerById = new Map(customers.map((c) => [c.id, c]));

  /* ── Địa chỉ ── */
  const addresses: Prisma.AddressCreateManyInput[] = [];
  const addrByUser = new Map<string, Prisma.AddressCreateManyInput[]>();
  customers.forEach((c, i) => {
    const list: Prisma.AddressCreateManyInput[] = [];
    const n = chance(0.4) ? 2 : 1;
    for (let k = 0; k < n; k++) {
      const loc = LOCATIONS[(i + k * 5) % LOCATIONS.length];
      list.push({
        id: randomUUID(),
        userId: c.id,
        recipientName: c.name,
        recipientPhone: c.phone,
        ...loc,
        addressDetail: `${int(1, 299)} ${pick(STREETS)}`,
        isDefault: k === 0,
      });
    }
    addresses.push(...list);
    addrByUser.set(c.id, list);
  });

  /* ── Vùng giao hàng ── */
  const zones: Prisma.ShippingZoneCreateManyInput[] = [];
  const zoneProvinces: Prisma.ShippingZoneProvinceCreateManyInput[] = [];
  const zoneByProvince = new Map<number, Prisma.ShippingZoneCreateManyInput>();
  ZONES.forEach((z, i) => {
    const zone: Prisma.ShippingZoneCreateManyInput = {
      id: randomUUID(),
      name: z.name,
      baseFee: z.baseFee,
      baseWeight: 20,
      extraFeePerKg: 3000,
      freeShipMinOrder: z.freeShipMinOrder,
      estimatedDaysMin: z.days[0],
      estimatedDaysMax: z.days[1],
      isActive: true,
      sortOrder: i,
    };
    zones.push(zone);
    for (const [code, name] of z.provinces) {
      zoneProvinces.push({
        id: randomUUID(),
        zoneId: zone.id!,
        provinceCode: code,
        provinceName: name,
      });
      zoneByProvince.set(code, zone);
    }
  });
  const shippingFeeFor = (provinceCode: number, subtotal: number) => {
    const zone = zoneByProvince.get(provinceCode);
    if (!zone) return 100000;
    const free =
      zone.freeShipMinOrder != null ? Number(zone.freeShipMinOrder) : null;
    return free !== null && subtotal >= free ? 0 : Number(zone.baseFee);
  };

  /* ── Nhà cung cấp / kho ── */
  const suppliers: Prisma.SupplierCreateManyInput[] = SUPPLIERS.map((s) => ({
    id: randomUUID(),
    ...s,
    createdAt: daysAgo(int(150, 240)),
  }));
  const warehouses: Prisma.WarehouseCreateManyInput[] = [
    {
      id: randomUUID(),
      name: 'Kho tổng TP.HCM',
      provinceCode: 79,
      provinceName: 'TP. Hồ Chí Minh',
      wardCode: 26797,
      wardName: 'Phường Thủ Đức',
      addressDetail: '120 Xa Lộ Hà Nội',
      isMain: true,
    },
    {
      id: randomUUID(),
      name: 'Kho Hà Nội',
      provinceCode: 1,
      provinceName: 'Hà Nội',
      wardCode: 4,
      wardName: 'Phường Ba Đình',
      addressDetail: '56 Nguyễn Chí Thanh',
      isMain: false,
    },
    {
      id: randomUUID(),
      name: 'Kho Đà Nẵng',
      provinceCode: 48,
      provinceName: 'Đà Nẵng',
      wardCode: 20194,
      wardName: 'Phường Hải Châu',
      addressDetail: '18 Nguyễn Văn Linh',
      isMain: false,
    },
  ];
  const mainWarehouse = warehouses[0];

  /* ── Vouchers ── */
  const vouchers: Prisma.VoucherCreateManyInput[] = [
    {
      id: randomUUID(),
      code: 'WELCOME10',
      name: 'Chào bạn mới – giảm 10%',
      description: 'Áp dụng cho đơn đầu tiên, giảm tối đa 300.000đ.',
      type: VoucherType.PERCENT,
      value: 10,
      maxDiscount: 300000,
      minOrderValue: 500000,
      scope: VoucherScope.ALL,
      usageLimit: 500,
      usageLimitPerUser: 1,
      usedCount: 0,
      startAt: daysAgo(150),
      endAt: daysFromNow(120),
      status: VoucherStatus.ACTIVE,
      isPublic: true,
    },
    {
      id: randomUUID(),
      code: 'GIAM200K',
      name: 'Giảm 200.000đ cho đơn từ 2 triệu',
      type: VoucherType.FIXED,
      value: 200000,
      minOrderValue: 2000000,
      scope: VoucherScope.ALL,
      usageLimit: 300,
      usageLimitPerUser: 2,
      usedCount: 0,
      startAt: daysAgo(120),
      endAt: daysFromNow(60),
      status: VoucherStatus.ACTIVE,
      isPublic: true,
    },
    {
      id: randomUUID(),
      code: 'DANHMUC15',
      name: 'Giảm 15% theo danh mục chọn lọc',
      description: 'Chỉ áp dụng cho sản phẩm thuộc danh mục được chọn.',
      type: VoucherType.PERCENT,
      value: 15,
      maxDiscount: 1500000,
      minOrderValue: 3000000,
      scope: VoucherScope.CATEGORY,
      usageLimit: 100,
      usageLimitPerUser: 1,
      usedCount: 0,
      startAt: daysAgo(30),
      endAt: daysFromNow(30),
      status: VoucherStatus.ACTIVE,
      isPublic: true,
    },
    {
      id: randomUUID(),
      code: 'FLASH100K',
      name: 'Flash sale giảm 100.000đ',
      type: VoucherType.FIXED,
      value: 100000,
      minOrderValue: 1000000,
      scope: VoucherScope.PRODUCT,
      usageLimit: 50,
      usageLimitPerUser: 1,
      usedCount: 0,
      startAt: daysAgo(60),
      endAt: daysFromNow(10),
      status: VoucherStatus.ACTIVE,
      isPublic: true,
    },
    {
      id: randomUUID(),
      code: 'HE2026',
      name: 'Khuyến mãi hè 2026',
      type: VoucherType.PERCENT,
      value: 8,
      maxDiscount: 400000,
      minOrderValue: 1000000,
      scope: VoucherScope.ALL,
      usageLimit: 200,
      usageLimitPerUser: 1,
      usedCount: 37,
      startAt: daysAgo(130),
      endAt: daysAgo(10),
      status: VoucherStatus.EXPIRED,
      isPublic: true,
    },
    {
      id: randomUUID(),
      code: 'HETLUOT50K',
      name: 'Giảm 50.000đ (đã hết lượt)',
      type: VoucherType.FIXED,
      value: 50000,
      minOrderValue: 300000,
      scope: VoucherScope.ALL,
      usageLimit: 20,
      usageLimitPerUser: 1,
      usedCount: 20,
      startAt: daysAgo(45),
      endAt: daysFromNow(15),
      status: VoucherStatus.DEPLETED,
      isPublic: true,
    },
    {
      id: randomUUID(),
      code: 'VIP5',
      name: 'Ưu đãi khách VIP (tạm dừng)',
      type: VoucherType.PERCENT,
      value: 5,
      maxDiscount: 500000,
      minOrderValue: 0,
      scope: VoucherScope.ALL,
      usageLimit: null,
      usageLimitPerUser: 5,
      usedCount: 4,
      startAt: daysAgo(20),
      endAt: daysFromNow(200),
      status: VoucherStatus.PAUSED,
      isPublic: false,
    },
    {
      id: randomUUID(),
      code: 'SAPRAMAT',
      name: 'Voucher sắp ra mắt',
      type: VoucherType.FIXED,
      value: 300000,
      minOrderValue: 3000000,
      scope: VoucherScope.ALL,
      usageLimit: 100,
      usageLimitPerUser: 1,
      usedCount: 0,
      startAt: daysFromNow(15),
      endAt: daysFromNow(60),
      status: VoucherStatus.DRAFT,
      isPublic: false,
    },
  ];
  const voucherCategories: Prisma.VoucherCategoryCreateManyInput[] = [];
  const voucherProducts: Prisma.VoucherProductCreateManyInput[] = [];
  const catVoucher = vouchers.find((v) => v.code === 'DANHMUC15')!;
  const prodVoucher = vouchers.find((v) => v.code === 'FLASH100K')!;
  categories.slice(0, 2).forEach((c) =>
    voucherCategories.push({
      id: randomUUID(),
      voucherId: catVoucher.id!,
      categoryId: c.id,
    }),
  );
  const flashProductIds = new Set(products.slice(0, 3).map((p) => p.id));
  products.slice(0, 3).forEach((p) =>
    voucherProducts.push({
      id: randomUUID(),
      voucherId: prodVoucher.id!,
      productId: p.id,
    }),
  );
  // Voucher có thể áp tự động trong seed (ALL hoặc PRODUCT); DANHMUC15 bỏ qua vì cần map category
  const applicableVouchers = vouchers.filter(
    (v) =>
      v.status === VoucherStatus.ACTIVE &&
      (v.scope === VoucherScope.ALL || v.scope === VoucherScope.PRODUCT),
  );

  /* ── Orders ── */
  type StatusPlan = { status: OrderStatus; min: number; max: number };
  const statusPlan: StatusPlan[] = [
    ...rep(60, { status: OrderStatus.DELIVERED, min: 15, max: 110 }),
    ...rep(10, { status: OrderStatus.SHIPPED, min: 3, max: 9 }),
    ...rep(8, { status: OrderStatus.PROCESSING, min: 2, max: 4 }),
    ...rep(8, { status: OrderStatus.CONFIRMED, min: 1, max: 3 }),
    ...rep(10, { status: OrderStatus.PENDING, min: 0, max: 2 }),
    ...rep(10, { status: OrderStatus.CANCELLED, min: 3, max: 60 }),
  ];
  const plans = statusPlan
    .map((p) => ({ status: p.status, createdAt: daysAgo(int(p.min, p.max)) }))
    .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());

  type OrderRec = {
    id: string;
    orderNumber: string;
    customerId: string;
    customerName: string;
    status: OrderStatus;
    createdAt: Date;
    total: number;
    deliveredAt?: Date;
    items: Prisma.OrderItemCreateManyInput[];
  };

  const orders: Prisma.OrderCreateManyInput[] = [];
  const orderItems: Prisma.OrderItemCreateManyInput[] = [];
  const payments: Prisma.PaymentCreateManyInput[] = [];
  const voucherUsages: Prisma.VoucherUsageCreateManyInput[] = [];
  const shipments: Prisma.ShipmentCreateManyInput[] = [];
  const shipmentItems: Prisma.ShipmentItemCreateManyInput[] = [];
  const orderRecs: OrderRec[] = [];
  const paymentByOrder = new Map<string, Prisma.PaymentCreateManyInput>();
  const voucherUseCount = new Map<string, number>(); // `${voucherId}:${userId}`
  const customerOrderCount = new Map<string, number>();

  let pendingCounter = 0;
  let processingCounter = 0;
  let shipmentSeq = 0;

  plans.forEach((plan, idx) => {
    const customer = pick(customers);
    const addr = pick(addrByUser.get(customer.id)!);
    const orderId = randomUUID();
    const createdAt = plan.createdAt;
    const orderNumber = `MH${ymd(createdAt)}-${pad(idx + 1)}`;
    const priorOrders = customerOrderCount.get(customer.id) ?? 0;
    customerOrderCount.set(customer.id, priorOrders + 1);

    const lines = shuffle(products)
      .slice(0, int(1, 3))
      .map((p) => {
        const v = pick(p.variants);
        return { p, v, qty: int(1, 2), price: unitPrice(p, v) };
      });
    const subtotal = lines.reduce((s, l) => s + l.price * l.qty, 0);
    const shippingFee = shippingFeeFor(addr.provinceCode, subtotal);

    // Voucher: tôn trọng minOrder, giới hạn/người, giới hạn tổng, "đơn đầu", sản phẩm áp dụng
    let discount = 0;
    let voucher: Prisma.VoucherCreateManyInput | undefined;
    if (plan.status !== OrderStatus.CANCELLED && chance(0.4)) {
      voucher = shuffle(applicableVouchers).find((v) => {
        const key = `${v.id}:${customer.id}`;
        if (Number(v.minOrderValue) > subtotal) return false;
        if ((voucherUseCount.get(key) ?? 0) >= (v.usageLimitPerUser ?? 1))
          return false;
        if (v.usageLimit != null && (v.usedCount ?? 0) >= v.usageLimit)
          return false;
        if (v.code === 'WELCOME10' && priorOrders > 0) return false;
        if (
          v.scope === VoucherScope.PRODUCT &&
          !lines.some((l) => flashProductIds.has(l.p.id))
        )
          return false;
        return true;
      });
      if (voucher) {
        discount =
          voucher.type === VoucherType.PERCENT
            ? Math.min(
                Math.floor((subtotal * Number(voucher.value)) / 100 / 1000) *
                  1000,
                Number(voucher.maxDiscount ?? Infinity),
              )
            : Math.min(Number(voucher.value), subtotal);
        const key = `${voucher.id}:${customer.id}`;
        voucherUseCount.set(key, (voucherUseCount.get(key) ?? 0) + 1);
        voucher.usedCount = (voucher.usedCount ?? 0) + 1;
      }
    }
    const total = subtotal + shippingFee - discount;

    orders.push({
      id: orderId,
      orderNumber,
      userId: customer.id,
      status: plan.status,
      subtotal,
      shippingFee,
      discount,
      total,
      recipientName: addr.recipientName,
      recipientPhone: addr.recipientPhone,
      shippingAddress: `${addr.addressDetail}, ${addr.wardName}, ${addr.provinceName}`,
      note: chance(0.25)
        ? pick([
            'Giao giờ hành chính',
            'Gọi trước khi giao 30 phút',
            'Giao cuối tuần giúp mình',
            'Nhà có thang máy, giao lên tận cửa giúp mình nhé',
          ])
        : null,
      cancelReason:
        plan.status === OrderStatus.CANCELLED
          ? pick([
              'Đổi ý không muốn mua nữa',
              'Đặt nhầm sản phẩm',
              'Tìm được giá tốt hơn',
              'Muốn đổi sang phân loại khác',
            ])
          : null,
      addressId: addr.id,
      voucherId: voucher?.id ?? null,
      voucherCode: voucher?.code ?? null,
      createdAt,
      updatedAt: createdAt,
    });

    const itemRows: Prisma.OrderItemCreateManyInput[] = lines.map((l) => ({
      id: randomUUID(),
      orderId,
      productId: l.p.id,
      variantId: l.v.id,
      productName: l.p.name,
      variantName: l.v.name,
      thumbnailUrl: thumbOf(l.p),
      price: l.price,
      quantity: l.qty,
    }));
    orderItems.push(...itemRows);

    if (voucher) {
      voucherUsages.push({
        id: randomUUID(),
        voucherId: voucher.id!,
        userId: customer.id,
        orderId,
        discountApplied: discount,
        createdAt,
      });
    }

    /* Shipment (tính trước để payment COD biết thời điểm giao) */
    const delivered = plan.status === OrderStatus.DELIVERED;
    const needShipment =
      plan.status === OrderStatus.SHIPPED ||
      delivered ||
      (plan.status === OrderStatus.PROCESSING && processingCounter++ % 2 === 0);
    let deliveredAt: Date | undefined;
    let courierName: string | undefined;
    if (needShipment) {
      const shipId = randomUUID();
      const driver = pick(DRIVERS);
      courierName = driver.name;
      const scheduledAt = addDays(createdAt, 1);
      const shippedAt =
        plan.status === OrderStatus.PROCESSING ? null : addDays(createdAt, 2);
      if (delivered) deliveredAt = addDays(shippedAt!, int(1, 3));
      shipments.push({
        id: shipId,
        code: `SHP-${ymd(createdAt)}-${pad(++shipmentSeq)}`,
        orderId,
        status: delivered
          ? ShipmentStatus.DELIVERED
          : plan.status === OrderStatus.SHIPPED
            ? ShipmentStatus.IN_TRANSIT
            : ShipmentStatus.PREPARING,
        provider: ShippingProvider.MANUAL,
        trackingCode: shippedAt ? `MH${int(100000, 999999)}` : null,
        driverName: driver.name,
        driverPhone: driver.phone,
        vehiclePlate: driver.plate,
        scheduledAt,
        shippedAt,
        deliveredAt: deliveredAt ?? null,
        createdById: admin.id,
        createdAt: addHours(createdAt, 3),
        updatedAt: deliveredAt ?? shippedAt ?? scheduledAt,
      });
      itemRows.forEach((it) =>
        shipmentItems.push({
          id: randomUUID(),
          shipmentId: shipId,
          orderItemId: it.id!,
          quantity: it.quantity,
        }),
      );
    }

    /* Payment */
    const isBank =
      plan.status === OrderStatus.PENDING
        ? pendingCounter++ % 2 === 0
        : chance(0.55);
    const payment: Prisma.PaymentCreateManyInput = {
      id: randomUUID(),
      orderId,
      method: isBank ? PaymentMethod.BANK_TRANSFER : PaymentMethod.COD,
      confirmationType: isBank
        ? ConfirmationType.MANUAL
        : ConfirmationType.COD_COLLECTION,
      status: PaymentStatus.PENDING,
      amount: total,
      transferNote: isBank ? orderNumber : null,
      createdAt,
      updatedAt: createdAt,
    };
    if (plan.status === OrderStatus.CANCELLED) {
      payment.status = PaymentStatus.FAILED;
      payment.adminNote = 'Đơn đã bị huỷ';
    } else if (isBank) {
      // Ảnh chụp màn hình app ngân hàng của CHÍNH khách này chuyển tiền cho shop
      const paidAt = addMinutes(createdAt, int(5, 90));
      payment.proofImageUrl = asset(
        `proof-${orderNumber}`,
        receiptSvg({
          bank: customer.bank,
          amount: total,
          at: paidAt,
          toName: SHOP.holder,
          toBank: SHOP.bank.name,
          toAccount: SHOP.account,
          content: orderNumber,
          ref: makeRef(),
        }),
      );
      if (plan.status === OrderStatus.PENDING) {
        payment.status = PaymentStatus.AWAITING_CONFIRM;
      } else {
        payment.status = PaymentStatus.CONFIRMED;
        payment.confirmedById = admin.id;
        payment.confirmedAt = addHours(createdAt, int(1, 6));
        payment.adminNote = 'Đã nhận đủ tiền chuyển khoản';
      }
    } else if (delivered) {
      payment.status = PaymentStatus.CONFIRMED;
      payment.collectedAmount = total;
      payment.courierName = courierName ?? pick(DRIVERS).name;
      payment.confirmedById = admin.id;
      payment.confirmedAt = deliveredAt ?? null;
    }
    payments.push(payment);
    paymentByOrder.set(orderId, payment);

    orderRecs.push({
      id: orderId,
      orderNumber,
      customerId: customer.id,
      customerName: customer.name,
      status: plan.status,
      createdAt,
      total,
      deliveredAt,
      items: itemRows,
    });
  });

  /* ── Return requests ── */
  const returnRequests: Prisma.ReturnRequestCreateManyInput[] = [];
  const returnItems: Prisma.ReturnRequestItemCreateManyInput[] = [];
  const returnImages: Prisma.ReturnRequestImageCreateManyInput[] = [];
  const stockMovements: Prisma.StockMovementCreateManyInput[] = [];

  const returnStatuses: ReturnStatus[] = [
    ReturnStatus.PENDING,
    ReturnStatus.APPROVED,
    ReturnStatus.REJECTED,
    ReturnStatus.ITEM_RECEIVED,
    ReturnStatus.REFUNDED,
    ReturnStatus.COMPLETED,
    ReturnStatus.CANCELLED,
  ];
  const deliveredOrders = orderRecs.filter(
    (o) => o.status === OrderStatus.DELIVERED && o.deliveredAt,
  );
  const returnCandidates = shuffle(deliveredOrders);
  [...returnStatuses, ...returnStatuses].forEach((status, i) => {
    const o = returnCandidates[i]; // mỗi đơn tối đa 1 yêu cầu đổi trả
    if (!o) return;
    const customer = customerById.get(o.customerId)!;
    const item = o.items[0];
    const qty = 1;
    const unit = Number(item.price);
    const refundAmount = unit * qty;
    const id = randomUUID();
    const createdAt = addDays(o.deliveredAt!, 2);
    const reason = pick([
      ReturnReason.DEFECTIVE,
      ReturnReason.DAMAGED_ON_ARRIVAL,
      ReturnReason.NOT_AS_DESCRIBED,
      ReturnReason.CHANGE_OF_MIND,
      ReturnReason.WRONG_ITEM,
    ]);

    const approvedStatuses: ReturnStatus[] = [
      ReturnStatus.APPROVED,
      ReturnStatus.ITEM_RECEIVED,
      ReturnStatus.REFUNDED,
      ReturnStatus.COMPLETED,
    ];
    const receivedStatuses: ReturnStatus[] = [
      ReturnStatus.ITEM_RECEIVED,
      ReturnStatus.REFUNDED,
      ReturnStatus.COMPLETED,
    ];
    const refundedStatuses: ReturnStatus[] = [
      ReturnStatus.REFUNDED,
      ReturnStatus.COMPLETED,
    ];

    const approvedAt = approvedStatuses.includes(status)
      ? addDays(createdAt, 1)
      : null;
    const itemReceivedAt = receivedStatuses.includes(status)
      ? addDays(createdAt, 3)
      : null;
    const refundedAt = refundedStatuses.includes(status)
      ? addDays(createdAt, 4)
      : null;

    // Ảnh minh chứng hoàn tiền: shop chuyển khoản cho đúng tài khoản của khách
    const code = `RR-${ymd(createdAt)}-${pad(i + 1)}`;
    const refundProof = refundedAt
      ? asset(
          `refund-${code}`,
          receiptSvg({
            bank: SHOP.bank,
            amount: refundAmount,
            at: refundedAt,
            toName: customer.holder,
            toBank: customer.bank.name,
            toAccount: customer.bankAccount,
            content: `MOHO HOAN TIEN ${code}`,
            ref: makeRef(),
          }),
        )
      : null;

    returnRequests.push({
      id,
      code,
      orderId: o.id,
      userId: o.customerId,
      reason,
      reasonNote:
        reason === ReturnReason.CHANGE_OF_MIND
          ? 'Không hợp với không gian nhà mình.'
          : 'Sản phẩm có vấn đề như trong ảnh đính kèm.',
      status,
      refundAmount,
      refundMethod: refundedAt ? RefundMethod.BANK_TRANSFER : null,
      refundBankName: refundedAt ? customer.bank.name : null,
      refundBankAccountNumber: refundedAt ? customer.bankAccount : null,
      refundBankAccountHolder: refundedAt ? customer.holder : null,
      refundedById: refundedAt ? admin.id : null,
      refundProofImageUrl: refundProof,
      adminNote: approvedAt ? 'Đã xác nhận yêu cầu hợp lệ.' : null,
      rejectReason:
        status === ReturnStatus.REJECTED
          ? 'Sản phẩm đã qua sử dụng, không đủ điều kiện đổi trả.'
          : null,
      approvedAt,
      itemReceivedAt,
      refundedAt,
      completedAt:
        status === ReturnStatus.COMPLETED ? addDays(createdAt, 5) : null,
      cancelledAt:
        status === ReturnStatus.CANCELLED ? addDays(createdAt, 1) : null,
      createdAt,
      updatedAt: refundedAt ?? itemReceivedAt ?? approvedAt ?? createdAt,
    });
    returnItems.push({
      id: randomUUID(),
      returnRequestId: id,
      orderItemId: item.id!,
      quantity: qty,
      unitPrice: unit,
    });
    if (reason !== ReturnReason.CHANGE_OF_MIND) {
      // Ảnh khách chụp sản phẩm lỗi: dùng ảnh thật của đúng sản phẩm đó
      for (let k = 0; k < int(1, 3); k++) {
        returnImages.push({
          id: randomUUID(),
          returnRequestId: id,
          url: productPhoto(item.productId, `return-${i}-${k}`),
        });
      }
    }
    if (refundedAt) {
      const pay = paymentByOrder.get(o.id)!;
      pay.status =
        refundAmount >= o.total
          ? PaymentStatus.REFUNDED
          : PaymentStatus.PARTIALLY_REFUNDED;
    }
    if (itemReceivedAt) {
      stockMovements.push({
        id: randomUUID(),
        variantId: item.variantId,
        warehouseId: mainWarehouse.id!,
        type: StockMovementType.RETURN_IN,
        quantity: qty,
        referenceType: 'RETURN_REQUEST',
        referenceId: id,
        note: 'Nhập lại kho hàng hoàn trả',
        createdById: admin.id,
        createdAt: itemReceivedAt,
      });
    }
  });

  /* ── Purchase orders ── */
  const purchaseOrders: Prisma.PurchaseOrderCreateManyInput[] = [];
  const purchaseOrderItems: Prisma.PurchaseOrderItemCreateManyInput[] = [];
  const allVariants = products.flatMap((p) =>
    p.variants.map((v) => ({ p, v })),
  );

  const poStatuses: PurchaseOrderStatus[] = [
    ...rep(5, PurchaseOrderStatus.RECEIVED),
    ...rep(2, PurchaseOrderStatus.PARTIALLY_RECEIVED),
    ...rep(3, PurchaseOrderStatus.ORDERED),
    ...rep(2, PurchaseOrderStatus.DRAFT),
    ...rep(2, PurchaseOrderStatus.CANCELLED),
  ];
  poStatuses.forEach((status, i) => {
    const poId = randomUUID();
    const settled =
      status === PurchaseOrderStatus.RECEIVED ||
      status === PurchaseOrderStatus.PARTIALLY_RECEIVED;
    const createdAt = settled ? daysAgo(int(60, 150)) : daysAgo(int(2, 14));
    const warehouse = settled ? mainWarehouse : pick(warehouses);
    const receivedAt =
      status === PurchaseOrderStatus.RECEIVED
        ? addDays(createdAt, int(5, 10))
        : null;

    purchaseOrders.push({
      id: poId,
      code: `PO-${ymd(createdAt)}-${pad(i + 1, 3)}`,
      supplierId: suppliers[i % suppliers.length].id!,
      warehouseId: warehouse.id!,
      status,
      note:
        status === PurchaseOrderStatus.CANCELLED
          ? 'Nhà cung cấp hết nguyên liệu, huỷ đơn'
          : null,
      expectedAt: addDays(createdAt, 10),
      receivedAt,
      createdById: admin.id,
      createdAt,
      updatedAt: receivedAt ?? createdAt,
    });

    shuffle(allVariants)
      .slice(0, int(2, 4))
      .forEach(({ p, v }, k) => {
        const ordered = int(10, 40);
        const received =
          status === PurchaseOrderStatus.RECEIVED
            ? ordered
            : status === PurchaseOrderStatus.PARTIALLY_RECEIVED
              ? k === 0
                ? Math.floor(ordered / 2)
                : 0
              : 0;
        purchaseOrderItems.push({
          id: randomUUID(),
          purchaseOrderId: poId,
          variantId: v.id,
          quantityOrdered: ordered,
          quantityReceived: received,
          unitCost: roundK(unitPrice(p, v) * 0.55),
        });
        if (received > 0) {
          stockMovements.push({
            id: randomUUID(),
            variantId: v.id,
            warehouseId: warehouse.id!,
            type: StockMovementType.PURCHASE_IN,
            quantity: received,
            referenceType: 'PURCHASE_ORDER',
            referenceId: poId,
            note: 'Nhập hàng từ nhà cung cấp',
            createdById: admin.id,
            createdAt: receivedAt ?? addDays(createdAt, 6),
          });
        }
      });
  });

  /* ── Stock movements ── */
  const deductStatuses: OrderStatus[] = [
    OrderStatus.CONFIRMED,
    OrderStatus.PROCESSING,
    OrderStatus.SHIPPED,
    OrderStatus.DELIVERED,
  ];
  orderRecs
    .filter((o) => deductStatuses.includes(o.status))
    .forEach((o) =>
      o.items.forEach((it) =>
        stockMovements.push({
          id: randomUUID(),
          variantId: it.variantId,
          warehouseId: mainWarehouse.id!,
          type: StockMovementType.SALE_OUT,
          quantity: it.quantity,
          referenceType: 'ORDER',
          referenceId: o.id,
          note: `Xuất kho đơn ${o.orderNumber}`,
          createdById: admin.id,
          createdAt: addHours(o.createdAt, 1),
        }),
      ),
    );

  const adjustments = [
    { delta: 5, note: 'Kiểm kê thấy dư' },
    { delta: -3, note: 'Kiểm kê thấy thiếu' },
    { delta: 2, note: 'Điều chỉnh sau kiểm kê định kỳ' },
    { delta: -2, note: 'Kiểm kê thấy thiếu' },
    { delta: 4, note: 'Tìm thấy hàng thất lạc khi kiểm kê' },
    { delta: -1, note: 'Điều chỉnh hàng trưng bày showroom' },
  ];
  adjustments.forEach((a, i) =>
    stockMovements.push({
      id: randomUUID(),
      variantId: allVariants[i % allVariants.length].v.id,
      warehouseId: mainWarehouse.id!,
      type: StockMovementType.ADJUSTMENT,
      quantity: a.delta,
      note: a.note,
      createdById: admin.id,
      createdAt: daysAgo(int(3, 40)),
    }),
  );
  [0, 1, 2, 3].forEach((i) =>
    stockMovements.push({
      id: randomUUID(),
      variantId: allVariants[(i + 3) % allVariants.length].v.id,
      warehouseId: mainWarehouse.id!,
      type: StockMovementType.DAMAGED_OUT,
      quantity: int(1, 2),
      note: 'Hàng hư hỏng trong quá trình vận chuyển nội bộ',
      createdById: admin.id,
      createdAt: daysAgo(int(5, 45)),
    }),
  );

  /* ── Reviews: chỉ khách đã đăng nhập + đã nhận hàng mới được đánh giá ── */
  const reviews: Prisma.ReviewCreateManyInput[] = [];
  const reviewImages: Prisma.ReviewImageCreateManyInput[] = [];
  const helpfuls: Prisma.ReviewHelpfulCreateManyInput[] = [];
  const comments: Prisma.ReviewCommentCreateManyInput[] = [];
  const reviewedPairs = new Set<string>(); // `${userId}:${productId}` – 1 user / 1 sản phẩm

  const makeReview = (opts: {
    productId: string;
    variantId: string | null;
    variantLabel: string | null;
    customer: Customer;
    createdAt: Date;
  }) => {
    const rating = pick([5, 5, 5, 5, 4, 4, 4, 3, 2]);
    const text =
      rating >= 4
        ? REVIEW_TEXT.good
        : rating === 3
          ? REVIEW_TEXT.ok
          : REVIEW_TEXT.bad;
    const id = randomUUID();
    reviews.push({
      id,
      productId: opts.productId,
      userId: opts.customer.id,
      authorName: opts.customer.name,
      rating,
      content: pick(text),
      variantId: opts.variantId,
      variantLabel: opts.variantLabel,
      usedForLabel: pick(USED_FOR),
      verifiedPurchase: true,
      createdAt: opts.createdAt,
      updatedAt: opts.createdAt,
    });
    if (chance(0.3)) {
      for (let k = 0; k < int(1, 3); k++)
        reviewImages.push({
          id: randomUUID(),
          reviewId: id,
          url: productPhoto(opts.productId, `review-${id}-${k}`),
        });
    }
    if (chance(0.5)) {
      shuffle(customers)
        .filter((c) => c.id !== opts.customer.id)
        .slice(0, int(1, 5))
        .forEach((c) =>
          helpfuls.push({ id: randomUUID(), reviewId: id, userId: c.id }),
        );
    }
    if (chance(0.5)) {
      const parentId = randomUUID();
      const at = addDays(opts.createdAt, 1);
      comments.push({
        id: parentId,
        reviewId: id,
        userId: admin.id,
        content:
          rating <= 3 ? ADMIN_REPLIES[2] : pick(ADMIN_REPLIES.slice(0, 2)),
        createdAt: at,
        updatedAt: at,
      });
      if (chance(0.4)) {
        const at2 = addHours(at, 5);
        comments.push({
          id: randomUUID(),
          reviewId: id,
          userId: opts.customer.id,
          parentId,
          content: 'Cảm ơn shop đã phản hồi nhé!',
          createdAt: at2,
          updatedAt: at2,
        });
      }
    }
    if (chance(0.15)) {
      const other = pick(customers.filter((c) => c.id !== opts.customer.id));
      const at = addHours(opts.createdAt, int(6, 72));
      comments.push({
        id: randomUUID(),
        reviewId: id,
        userId: other.id,
        content: pick(CUSTOMER_COMMENTS),
        createdAt: at,
        updatedAt: at,
      });
    }
  };

  deliveredOrders.forEach((o) => {
    const customer = customerById.get(o.customerId)!;
    o.items.forEach((it) => {
      const pair = `${o.customerId}:${it.productId}`;
      if (reviewedPairs.has(pair) || !chance(0.7)) return;
      reviewedPairs.add(pair);
      makeReview({
        productId: it.productId,
        variantId: it.variantId,
        variantLabel: it.variantName,
        customer,
        createdAt: addDays(o.deliveredAt!, int(1, 7)),
      });
    });
  });

  /* ── Carts ── */
  const carts: Prisma.CartCreateManyInput[] = [];
  const cartItems: Prisma.CartItemCreateManyInput[] = [];
  shuffle(customers)
    .slice(0, 8)
    .forEach((c) => {
      const cartId = randomUUID();
      carts.push({ id: cartId, userId: c.id });
      shuffle(allVariants)
        .slice(0, int(1, 3))
        .forEach(({ v }) =>
          cartItems.push({
            id: randomUUID(),
            cartId,
            variantId: v.id,
            quantity: int(1, 2),
          }),
        );
    });

  /* ── Notifications ── */
  const notifications: Prisma.NotificationCreateManyInput[] = [];
  const recentOrders = orderRecs.filter(
    (o) => NOW.getTime() - o.createdAt.getTime() < 10 * 86_400_000,
  );
  recentOrders.forEach((o) =>
    notifications.push({
      id: randomUUID(),
      type: NotificationType.ORDER_CREATED,
      audience: NotificationAudience.ADMIN,
      title: 'Đơn hàng mới',
      message: `Đơn ${o.orderNumber} từ ${o.customerName} – ${vnd(o.total)}`,
      link: `/dashboard/orders/${o.id}`,
      metadata: { orderId: o.id },
      isRead: NOW.getTime() - o.createdAt.getTime() > 3 * 86_400_000,
      createdAt: o.createdAt,
    }),
  );
  payments
    .filter((p) => p.status === PaymentStatus.AWAITING_CONFIRM)
    .forEach((p) => {
      const o = orderRecs.find((x) => x.id === p.orderId)!;
      notifications.push({
        id: randomUUID(),
        type: NotificationType.PAYMENT_AWAITING_CONFIRM,
        audience: NotificationAudience.ADMIN,
        title: 'Chờ xác nhận thanh toán',
        message: `Đơn ${o.orderNumber} đã gửi minh chứng chuyển khoản`,
        link: `/dashboard/orders/${o.id}`,
        metadata: { orderId: o.id, paymentId: p.id },
        isRead: false,
        createdAt: addHours(o.createdAt, 1),
      });
    });
  returnRequests
    .filter((r) => r.status === ReturnStatus.PENDING)
    .forEach((r) =>
      notifications.push({
        id: randomUUID(),
        type: NotificationType.RETURN_REQUEST_CREATED,
        audience: NotificationAudience.ADMIN,
        title: 'Yêu cầu đổi trả mới',
        message: `Yêu cầu ${r.code} đang chờ xử lý`,
        link: `/dashboard/return-requests/${r.id}`,
        metadata: { returnRequestId: r.id },
        isRead: false,
        createdAt: r.createdAt,
      }),
    );
  [...reviews]
    .sort(
      (a, b) =>
        (b.createdAt as Date).getTime() - (a.createdAt as Date).getTime(),
    )
    .slice(0, 6)
    .forEach((r) =>
      notifications.push({
        id: randomUUID(),
        type: NotificationType.REVIEW_CREATED,
        audience: NotificationAudience.ADMIN,
        title: 'Đánh giá mới',
        message: `${r.authorName} vừa đánh giá ${r.rating}★`,
        link: '/dashboard/reviews',
        metadata: { reviewId: r.id },
        isRead: false,
        createdAt: r.createdAt,
      }),
    );
  allVariants
    .filter(({ v }) => v.stock <= 5)
    .slice(0, 5)
    .forEach(({ p, v }) =>
      notifications.push({
        id: randomUUID(),
        type: NotificationType.PRODUCT_LOW_STOCK,
        audience: NotificationAudience.ADMIN,
        title: 'Sản phẩm sắp hết hàng',
        message: `${p.name} (${v.name}) chỉ còn ${v.stock}`,
        link: `/dashboard/products/${p.id}`,
        metadata: { productId: p.id, variantId: v.id },
        isRead: false,
        createdAt: daysAgo(int(0, 2)),
      }),
    );
  const statusLabel: Partial<Record<OrderStatus, string>> = {
    CONFIRMED: 'đã được xác nhận',
    PROCESSING: 'đang được chuẩn bị',
    SHIPPED: 'đang được giao',
    DELIVERED: 'đã giao thành công',
    CANCELLED: 'đã bị huỷ',
  };
  recentOrders
    .filter((o) => o.status !== OrderStatus.PENDING)
    .forEach((o) =>
      notifications.push({
        id: randomUUID(),
        type: NotificationType.ORDER_STATUS_CHANGED,
        audience: NotificationAudience.USER,
        recipientId: o.customerId,
        title: 'Cập nhật đơn hàng',
        message: `Đơn ${o.orderNumber} ${statusLabel[o.status]}`,
        link: '/orders',
        metadata: { orderId: o.id, status: o.status },
        isRead: chance(0.5),
        createdAt: addHours(o.createdAt, 4),
      }),
    );

  /* ── Ghi DB ── */
  await prisma.address.createMany({ data: addresses });
  await prisma.shippingZone.createMany({ data: zones });
  await prisma.shippingZoneProvince.createMany({ data: zoneProvinces });
  await prisma.supplier.createMany({ data: suppliers });
  await prisma.warehouse.createMany({ data: warehouses });
  await prisma.voucher.createMany({ data: vouchers });
  await prisma.voucherCategory.createMany({ data: voucherCategories });
  await prisma.voucherProduct.createMany({ data: voucherProducts });
  await prisma.order.createMany({ data: orders });
  await prisma.orderItem.createMany({ data: orderItems });
  await prisma.payment.createMany({ data: payments });
  await prisma.voucherUsage.createMany({ data: voucherUsages });
  await prisma.shipment.createMany({ data: shipments });
  await prisma.shipmentItem.createMany({ data: shipmentItems });
  await prisma.returnRequest.createMany({ data: returnRequests });
  await prisma.returnRequestItem.createMany({ data: returnItems });
  await prisma.returnRequestImage.createMany({ data: returnImages });
  await prisma.purchaseOrder.createMany({ data: purchaseOrders });
  await prisma.purchaseOrderItem.createMany({ data: purchaseOrderItems });
  await prisma.stockMovement.createMany({ data: stockMovements });
  await prisma.review.createMany({ data: reviews });
  await prisma.reviewImage.createMany({ data: reviewImages });
  await prisma.reviewHelpful.createMany({ data: helpfuls });
  await prisma.reviewComment.createMany({ data: comments });
  await prisma.cart.createMany({ data: carts });
  await prisma.cartItem.createMany({ data: cartItems });
  await prisma.notification.createMany({ data: notifications });

  // Đồng bộ voucher.usedCount của các voucher đã phát sinh usage
  for (const v of vouchers) {
    if (v.status === VoucherStatus.ACTIVE) {
      await prisma.voucher.update({
        where: { id: v.id! },
        data: { usedCount: v.usedCount ?? 0 },
      });
    }
  }

  const sold = new Map<string, number>();
  deliveredOrders.forEach((o) =>
    o.items.forEach((it) =>
      sold.set(it.productId, (sold.get(it.productId) ?? 0) + it.quantity),
    ),
  );
  for (const [productId, soldCount] of sold) {
    await prisma.product.update({
      where: { id: productId },
      data: { soldCount },
    });
  }

  console.log('✔ Seed xong:');
  console.table({
    customers: customers.length,
    addresses: addresses.length,
    shippingZones: zones.length,
    suppliers: suppliers.length,
    warehouses: warehouses.length,
    vouchers: vouchers.length,
    orders: orders.length,
    orderItems: orderItems.length,
    payments: payments.length,
    shipments: shipments.length,
    returnRequests: returnRequests.length,
    purchaseOrders: purchaseOrders.length,
    stockMovements: stockMovements.length,
    reviews: reviews.length,
    reviewComments: comments.length,
    carts: carts.length,
    notifications: notifications.length,
  });
  console.log(
    `Tài khoản khách mock: ${CUSTOMERS[0].email} … / mật khẩu: ${SEED_PASSWORD}`,
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

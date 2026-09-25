import { Prisma, OrderStatus, ShipmentStatus } from '@prisma/client';

export const VOLUMETRIC_DIVISOR = 6000;

export const ZONE_INCLUDE = {
  provinces: { orderBy: { provinceName: 'asc' } },
} satisfies Prisma.ShippingZoneInclude;

export type ShippingZoneWithProvinces = Prisma.ShippingZoneGetPayload<{
  include: typeof ZONE_INCLUDE;
}>;

export const SHIPMENT_INCLUDE = {
  order: {
    select: {
      id: true,
      orderNumber: true,
      status: true,
      recipientName: true,
      recipientPhone: true,
      shippingAddress: true,
    },
  },
  items: {
    include: {
      orderItem: {
        select: {
          id: true,
          productName: true,
          variantName: true,
          thumbnailUrl: true,
          quantity: true,
        },
      },
    },
  },
  createdBy: { select: { id: true, name: true } },
} satisfies Prisma.ShipmentInclude;

export type ShipmentWithRelations = Prisma.ShipmentGetPayload<{
  include: typeof SHIPMENT_INCLUDE;
}>;

export const ACTIVE_SHIPMENT_STATUSES: ShipmentStatus[] = [
  ShipmentStatus.PREPARING,
  ShipmentStatus.IN_TRANSIT,
  ShipmentStatus.FAILED,
  ShipmentStatus.DELIVERED,
];

export const SHIPPABLE_ORDER_STATUSES: OrderStatus[] = [
  OrderStatus.CONFIRMED,
  OrderStatus.PROCESSING,
  OrderStatus.SHIPPED,
];

export const SYNCABLE_ORDER_STATUSES: OrderStatus[] = [
  OrderStatus.CONFIRMED,
  OrderStatus.PROCESSING,
  OrderStatus.SHIPPED,
];

export const SHIPMENT_STATUS_TRANSITIONS: Record<
  ShipmentStatus,
  ShipmentStatus[]
> = {
  [ShipmentStatus.PREPARING]: [
    ShipmentStatus.IN_TRANSIT,
    ShipmentStatus.CANCELLED,
  ],
  [ShipmentStatus.IN_TRANSIT]: [
    ShipmentStatus.DELIVERED,
    ShipmentStatus.FAILED,
  ],
  [ShipmentStatus.FAILED]: [
    ShipmentStatus.IN_TRANSIT,
    ShipmentStatus.CANCELLED,
  ],
  [ShipmentStatus.DELIVERED]: [],
  [ShipmentStatus.CANCELLED]: [],
};

export const SHIPPABLE_ORDER_INCLUDE = {
  items: {
    orderBy: { id: 'asc' },
    include: {
      shipmentItems: {
        where: { shipment: { status: { in: ACTIVE_SHIPMENT_STATUSES } } },
        select: { quantity: true },
      },
    },
  },
} satisfies Prisma.OrderInclude;

export type ShippableOrder = Prisma.OrderGetPayload<{
  include: typeof SHIPPABLE_ORDER_INCLUDE;
}>;

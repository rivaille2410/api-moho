-- CreateEnum
CREATE TYPE "ShipmentStatus" AS ENUM ('PREPARING', 'IN_TRANSIT', 'DELIVERED', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ShippingProvider" AS ENUM ('MANUAL');

-- AlterTable
ALTER TABLE "products" ADD COLUMN     "weight" DECIMAL(8,2);

-- CreateTable
CREATE TABLE "shipping_zones" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "baseFee" DECIMAL(12,0) NOT NULL,
    "baseWeight" DECIMAL(8,2) NOT NULL DEFAULT 0,
    "extraFeePerKg" DECIMAL(12,0) NOT NULL DEFAULT 0,
    "freeShipMinOrder" DECIMAL(12,0),
    "estimatedDaysMin" INTEGER,
    "estimatedDaysMax" INTEGER,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "shipping_zones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shipping_zone_provinces" (
    "id" TEXT NOT NULL,
    "zoneId" TEXT NOT NULL,
    "provinceCode" INTEGER NOT NULL,
    "provinceName" TEXT NOT NULL,

    CONSTRAINT "shipping_zone_provinces_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shipments" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "status" "ShipmentStatus" NOT NULL DEFAULT 'PREPARING',
    "provider" "ShippingProvider" NOT NULL DEFAULT 'MANUAL',
    "carrierName" TEXT,
    "carrierCode" TEXT,
    "trackingCode" TEXT,
    "driverName" TEXT,
    "driverPhone" TEXT,
    "vehiclePlate" TEXT,
    "scheduledAt" TIMESTAMP(3),
    "shippedAt" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),
    "failedReason" TEXT,
    "note" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "shipments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shipment_items" (
    "id" TEXT NOT NULL,
    "shipmentId" TEXT NOT NULL,
    "orderItemId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,

    CONSTRAINT "shipment_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "shipping_zones_isActive_idx" ON "shipping_zones"("isActive");

-- CreateIndex
CREATE INDEX "shipping_zones_deletedAt_idx" ON "shipping_zones"("deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "shipping_zone_provinces_provinceCode_key" ON "shipping_zone_provinces"("provinceCode");

-- CreateIndex
CREATE INDEX "shipping_zone_provinces_zoneId_idx" ON "shipping_zone_provinces"("zoneId");

-- CreateIndex
CREATE UNIQUE INDEX "shipments_code_key" ON "shipments"("code");

-- CreateIndex
CREATE INDEX "shipments_orderId_idx" ON "shipments"("orderId");

-- CreateIndex
CREATE INDEX "shipments_status_idx" ON "shipments"("status");

-- CreateIndex
CREATE INDEX "shipments_scheduledAt_idx" ON "shipments"("scheduledAt");

-- CreateIndex
CREATE INDEX "shipments_createdAt_idx" ON "shipments"("createdAt");

-- CreateIndex
CREATE INDEX "shipment_items_orderItemId_idx" ON "shipment_items"("orderItemId");

-- CreateIndex
CREATE UNIQUE INDEX "shipment_items_shipmentId_orderItemId_key" ON "shipment_items"("shipmentId", "orderItemId");

-- AddForeignKey
ALTER TABLE "shipping_zone_provinces" ADD CONSTRAINT "shipping_zone_provinces_zoneId_fkey" FOREIGN KEY ("zoneId") REFERENCES "shipping_zones"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shipments" ADD CONSTRAINT "shipments_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shipments" ADD CONSTRAINT "shipments_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shipment_items" ADD CONSTRAINT "shipment_items_shipmentId_fkey" FOREIGN KEY ("shipmentId") REFERENCES "shipments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shipment_items" ADD CONSTRAINT "shipment_items_orderItemId_fkey" FOREIGN KEY ("orderItemId") REFERENCES "order_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

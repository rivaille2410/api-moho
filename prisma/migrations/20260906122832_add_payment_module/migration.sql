/*
  Warnings:

  - You are about to drop the column `paymentMethod` on the `orders` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "ConfirmationType" AS ENUM ('MANUAL', 'WEBHOOK', 'COD_COLLECTION');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'AWAITING_CONFIRM', 'CONFIRMED', 'FAILED', 'REFUNDED', 'PARTIALLY_REFUNDED');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "PaymentMethod" ADD VALUE 'VNPAY';
ALTER TYPE "PaymentMethod" ADD VALUE 'MOMO';
ALTER TYPE "PaymentMethod" ADD VALUE 'ZALOPAY';

-- AlterTable
ALTER TABLE "orders" DROP COLUMN "paymentMethod";

-- CreateTable
CREATE TABLE "payments" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "method" "PaymentMethod" NOT NULL,
    "confirmationType" "ConfirmationType" NOT NULL,
    "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "amount" DECIMAL(12,0) NOT NULL,
    "transferNote" TEXT,
    "proofImageUrl" TEXT,
    "confirmedById" TEXT,
    "confirmedAt" TIMESTAMP(3),
    "adminNote" TEXT,
    "collectedAmount" DECIMAL(12,0),
    "courierName" TEXT,
    "gatewayTxnId" TEXT,
    "gatewayRefId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_webhook_events" (
    "id" TEXT NOT NULL,
    "paymentId" TEXT,
    "provider" "PaymentMethod" NOT NULL,
    "eventType" TEXT NOT NULL,
    "externalEventId" TEXT NOT NULL,
    "rawPayload" JSONB NOT NULL,
    "processedAt" TIMESTAMP(3),
    "processingError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payment_webhook_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "payments_gatewayTxnId_key" ON "payments"("gatewayTxnId");

-- CreateIndex
CREATE INDEX "payments_orderId_idx" ON "payments"("orderId");

-- CreateIndex
CREATE INDEX "payments_status_idx" ON "payments"("status");

-- CreateIndex
CREATE INDEX "payments_method_idx" ON "payments"("method");

-- CreateIndex
CREATE UNIQUE INDEX "payment_webhook_events_externalEventId_key" ON "payment_webhook_events"("externalEventId");

-- CreateIndex
CREATE INDEX "payment_webhook_events_paymentId_idx" ON "payment_webhook_events"("paymentId");

-- CreateIndex
CREATE INDEX "payment_webhook_events_provider_idx" ON "payment_webhook_events"("provider");

-- CreateIndex
CREATE INDEX "orders_createdAt_idx" ON "orders"("createdAt");

-- CreateIndex
CREATE INDEX "product_variants_stock_idx" ON "product_variants"("stock");

-- CreateIndex
CREATE INDEX "users_createdAt_idx" ON "users"("createdAt");

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_confirmedById_fkey" FOREIGN KEY ("confirmedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_webhook_events" ADD CONSTRAINT "payment_webhook_events_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "payments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

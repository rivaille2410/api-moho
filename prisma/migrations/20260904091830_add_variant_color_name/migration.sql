-- AlterTable
ALTER TABLE "product_variants" ADD COLUMN     "colorName" TEXT;

-- CreateIndex
CREATE INDEX "product_variants_colorName_idx" ON "product_variants"("colorName");

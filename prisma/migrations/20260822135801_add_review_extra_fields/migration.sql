-- AlterTable
ALTER TABLE "reviews" ADD COLUMN     "usedForLabel" TEXT,
ADD COLUMN     "variantId" TEXT,
ADD COLUMN     "variantLabel" TEXT,
ADD COLUMN     "verifiedPurchase" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "review_helpfuls" (
    "id" TEXT NOT NULL,
    "reviewId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "review_helpfuls_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "review_helpfuls_reviewId_idx" ON "review_helpfuls"("reviewId");

-- CreateIndex
CREATE UNIQUE INDEX "review_helpfuls_reviewId_userId_key" ON "review_helpfuls"("reviewId", "userId");

-- CreateIndex
CREATE INDEX "reviews_variantId_idx" ON "reviews"("variantId");

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "product_variants"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "review_helpfuls" ADD CONSTRAINT "review_helpfuls_reviewId_fkey" FOREIGN KEY ("reviewId") REFERENCES "reviews"("id") ON DELETE CASCADE ON UPDATE CASCADE;

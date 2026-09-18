-- AlterTable
ALTER TABLE "return_requests" ADD COLUMN     "refundProofImageUrl" TEXT,
ADD COLUMN     "refundedById" TEXT;

-- AddForeignKey
ALTER TABLE "return_requests" ADD CONSTRAINT "return_requests_refundedById_fkey" FOREIGN KEY ("refundedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

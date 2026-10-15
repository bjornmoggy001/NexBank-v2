/*
  Warnings:

  - You are about to drop the column `updateAt` on the `Card` table. All the data in the column will be lost.
  - Added the required column `updatedAt` to the `Card` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "BillPayment" DROP CONSTRAINT "BillPayment_ledgerTxnId_fkey";

-- DropForeignKey
ALTER TABLE "Card" DROP CONSTRAINT "Card_userId_fkey";

-- DropForeignKey
ALTER TABLE "CardTransaction" DROP CONSTRAINT "CardTransaction_ledgerTxnId_fkey";

-- AlterTable
ALTER TABLE "BillPayment" ADD COLUMN     "accountRefNumber" TEXT,
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ALTER COLUMN "ledgerTxnId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Card" DROP COLUMN "updateAt",
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "CardTransaction" ALTER COLUMN "ledgerTxnId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Transfer" ALTER COLUMN "status" SET DEFAULT 'COMPLETED';

-- AddForeignKey
ALTER TABLE "Card" ADD CONSTRAINT "Card_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CardTransaction" ADD CONSTRAINT "CardTransaction_ledgerTxnId_fkey" FOREIGN KEY ("ledgerTxnId") REFERENCES "LedgerTransaction"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BillPayment" ADD CONSTRAINT "BillPayment_ledgerTxnId_fkey" FOREIGN KEY ("ledgerTxnId") REFERENCES "LedgerTransaction"("id") ON DELETE SET NULL ON UPDATE CASCADE;

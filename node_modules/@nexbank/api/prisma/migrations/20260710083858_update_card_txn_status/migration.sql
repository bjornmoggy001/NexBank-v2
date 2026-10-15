/*
  Warnings:

  - The values [PENDING,COMPLETED,FAILED] on the enum `CardTxnStatus` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "CardTxnStatus_new" AS ENUM ('APPROVED', 'DECLINED');
ALTER TABLE "CardTransaction" ALTER COLUMN "status" TYPE "CardTxnStatus_new" USING ("status"::text::"CardTxnStatus_new");
ALTER TYPE "CardTxnStatus" RENAME TO "CardTxnStatus_old";
ALTER TYPE "CardTxnStatus_new" RENAME TO "CardTxnStatus";
DROP TYPE "public"."CardTxnStatus_old";
COMMIT;

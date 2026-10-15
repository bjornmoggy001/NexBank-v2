/*
  Warnings:

  - A unique constraint covering the columns `[reference]` on the table `LedgerTransaction` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "LedgerTransaction_reference_key" ON "LedgerTransaction"("reference");

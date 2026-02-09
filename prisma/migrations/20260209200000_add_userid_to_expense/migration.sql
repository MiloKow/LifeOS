-- Step 1: Add userId column as nullable
ALTER TABLE "Expense" ADD COLUMN "userId" TEXT;

-- Step 2: Backfill userId from Company for existing rows
UPDATE "Expense" e SET "userId" = c."userId" FROM "Company" c WHERE e."companyId" = c."id" AND e."userId" IS NULL;

-- Step 3: Make userId NOT NULL
ALTER TABLE "Expense" ALTER COLUMN "userId" SET NOT NULL;

-- Step 4: Make companyId nullable
ALTER TABLE "Expense" ALTER COLUMN "companyId" DROP NOT NULL;

-- Step 5: Add foreign key for userId
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Step 6: Add index on userId
CREATE INDEX "Expense_userId_idx" ON "Expense"("userId");

-- CreateTable
CREATE TABLE "BadgeValue" (
    "userId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BadgeValue_pkey" PRIMARY KEY ("userId","provider")
);

-- AddForeignKey
ALTER TABLE "BadgeValue" ADD CONSTRAINT "BadgeValue_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

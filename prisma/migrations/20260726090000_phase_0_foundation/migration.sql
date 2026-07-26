CREATE TABLE "FoundationMetadata" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FoundationMetadata_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "FoundationMetadata_key_key" ON "FoundationMetadata"("key");

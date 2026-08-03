CREATE TABLE "GoogleAccount" (
    "id" TEXT NOT NULL,
    "googleSubject" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "pictureUrl" TEXT,
    "scopes" TEXT NOT NULL,
    "encryptedAccessToken" TEXT NOT NULL,
    "encryptedRefreshToken" TEXT,
    "accessTokenExpiresAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GoogleAccount_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "GoogleSession" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "sessionTokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GoogleSession_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "GoogleIntegrationSettings" (
    "id" TEXT NOT NULL DEFAULT 'singleton',
    "sheetId" TEXT,
    "sheetRange" TEXT NOT NULL DEFAULT 'Sheet1!A:K',
    "drivePhotoFolderId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GoogleIntegrationSettings_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "GoogleAccount_googleSubject_key" ON "GoogleAccount"("googleSubject");
CREATE INDEX "GoogleAccount_email_idx" ON "GoogleAccount"("email");
CREATE INDEX "GoogleAccount_revokedAt_idx" ON "GoogleAccount"("revokedAt");

CREATE UNIQUE INDEX "GoogleSession_sessionTokenHash_key" ON "GoogleSession"("sessionTokenHash");
CREATE INDEX "GoogleSession_accountId_idx" ON "GoogleSession"("accountId");
CREATE INDEX "GoogleSession_expiresAt_idx" ON "GoogleSession"("expiresAt");
CREATE INDEX "GoogleSession_revokedAt_idx" ON "GoogleSession"("revokedAt");

ALTER TABLE "GoogleSession"
    ADD CONSTRAINT "GoogleSession_accountId_fkey"
    FOREIGN KEY ("accountId")
    REFERENCES "GoogleAccount"("id")
    ON DELETE CASCADE
    ON UPDATE CASCADE;

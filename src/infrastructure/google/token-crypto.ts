import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from "node:crypto";

const tokenCipherVersion = "v1";

export class GoogleTokenCryptoError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "GoogleTokenCryptoError";
  }
}

export function encryptGoogleToken(
  token: string,
  secret = getGoogleTokenEncryptionSecret(),
): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", deriveKey(secret), iv);
  const encrypted = Buffer.concat([
    cipher.update(token, "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();

  return [
    tokenCipherVersion,
    iv.toString("base64url"),
    tag.toString("base64url"),
    encrypted.toString("base64url"),
  ].join(":");
}

export function decryptGoogleToken(
  encryptedToken: string,
  secret = getGoogleTokenEncryptionSecret(),
): string {
  const [version, iv, tag, encrypted] = encryptedToken.split(":");

  if (version !== tokenCipherVersion || !iv || !tag || !encrypted) {
    throw new GoogleTokenCryptoError("Invalid encrypted Google token format.");
  }

  try {
    const decipher = createDecipheriv(
      "aes-256-gcm",
      deriveKey(secret),
      Buffer.from(iv, "base64url"),
    );
    decipher.setAuthTag(Buffer.from(tag, "base64url"));

    return Buffer.concat([
      decipher.update(Buffer.from(encrypted, "base64url")),
      decipher.final(),
    ]).toString("utf8");
  } catch {
    throw new GoogleTokenCryptoError("Unable to decrypt Google token.");
  }
}

export function hashGoogleSessionToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function getGoogleTokenEncryptionSecret(): string {
  const secret = process.env.GOOGLE_TOKEN_ENCRYPTION_KEY?.trim();

  if (!secret) {
    throw new GoogleTokenCryptoError(
      "GOOGLE_TOKEN_ENCRYPTION_KEY is required to store Google tokens.",
    );
  }

  return secret;
}

function deriveKey(secret: string): Buffer {
  return createHash("sha256").update(secret).digest();
}

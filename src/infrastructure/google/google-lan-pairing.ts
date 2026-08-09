import { randomBytes } from "node:crypto";

const pairingTtlMs = 10 * 60 * 1000;

interface GoogleLanPairingRecord {
  accountId: string;
  expiresAt: Date;
}

const pairings = new Map<string, GoogleLanPairingRecord>();

export interface GoogleLanPairingToken {
  token: string;
  expiresAt: Date;
}

export function isGoogleLanPairingEnabled(): boolean {
  return process.env.NODE_ENV !== "production";
}

export function createGoogleLanPairingToken(
  accountId: string,
): GoogleLanPairingToken {
  pruneExpiredGoogleLanPairings();

  const token = randomBytes(24).toString("base64url");
  const expiresAt = new Date(Date.now() + pairingTtlMs);

  pairings.set(token, {
    accountId,
    expiresAt,
  });

  return {
    token,
    expiresAt,
  };
}

export function consumeGoogleLanPairingToken(
  token: string,
): string | undefined {
  pruneExpiredGoogleLanPairings();

  const pairing = pairings.get(token);
  pairings.delete(token);

  if (!pairing || pairing.expiresAt.getTime() <= Date.now()) {
    return undefined;
  }

  return pairing.accountId;
}

export function pruneExpiredGoogleLanPairings(): void {
  const now = Date.now();

  for (const [token, pairing] of pairings) {
    if (pairing.expiresAt.getTime() <= now) {
      pairings.delete(token);
    }
  }
}

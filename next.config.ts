import type { NextConfig } from "next";

const allowedDevOrigins = ["127.0.0.1", "localhost"];
const lanOrigin = process.env.GOOGLE_LAN_ORIGIN?.trim();

if (lanOrigin) {
  try {
    allowedDevOrigins.push(new URL(lanOrigin).hostname);
  } catch {
    // Ignore malformed local-only LAN origin values.
  }
}

const nextConfig: NextConfig = {
  allowedDevOrigins,
};

export default nextConfig;

import type { NextConfig } from "next";

/**
 * Hosts allowed to request dev-only assets (HMR, chunks). Without this, Next
 * blocks LAN devices and the app never hydrates — forms then fall back to
 * native submits. Add extra hosts via NEXT_PUBLIC_DEV_ORIGINS (comma list).
 */
const extraDevOrigins =
  process.env.NEXT_PUBLIC_DEV_ORIGINS?.split(",")
    .map((origin) => origin.trim())
    .filter(Boolean) ?? [];

const nextConfig: NextConfig = {
  allowedDevOrigins: [
    "10.210.61.30",
    "localhost",
    "127.0.0.1",
    ...extraDevOrigins,
  ],
};

export default nextConfig;

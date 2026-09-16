import type { NextConfig } from "next";

// Export statico: l'app è interamente client-side e viene pubblicata come cartella dentro
// veroledsrl.com (Cloudflare Pages). NEXT_PUBLIC_BASE_PATH=/simulatore-consumi in produzione,
// vuoto in sviluppo.
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";

const nextConfig: NextConfig = {
  output: "export",
  basePath,
  trailingSlash: true,
  images: { unoptimized: true },
  env: { NEXT_PUBLIC_BASE_PATH: basePath },
};

export default nextConfig;

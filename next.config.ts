import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Hosts desde los que se accede al dev server además de localhost
  // (acceso por Tailscale vía sslip.io). No afecta a producción.
  allowedDevOrigins: ["100-64-45-119.sslip.io"],
};

export default nextConfig;

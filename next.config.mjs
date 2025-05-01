/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  // ++ Add this section ++
  experimental: {
    serverActions: {
      // Replace with your specific Codespace URL including the protocol (https://)
      allowedOrigins: ["localhost:3000", "vigilant-space-cod-xjxvgx4jrvrfpwrr-3000.app.github.dev/"],
    },
  },
  // ++ End of added section ++
}

export default nextConfig
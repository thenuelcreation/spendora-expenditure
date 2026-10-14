/** @type {import('next').NextConfig} */
const apiOrigin = (process.env.SPENDORA_API_URL || "http://localhost:8080")
  .replace(/\/+$/, "");

const nextConfig = {
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${apiOrigin}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;

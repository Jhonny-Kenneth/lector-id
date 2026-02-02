/** @type {import('next').NextConfig} */
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";

const nextConfig = {
  reactStrictMode: true,
  // Needed when the app is served from a subpath like /lectorid
  basePath,
  assetPrefix: basePath ? `${basePath}/` : "",
};

module.exports = nextConfig;

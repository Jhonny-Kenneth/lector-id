/** @type {import('next').NextConfig} */
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";

const nextConfig = {
  reactStrictMode: true,
  // Needed when the app is served from a subpath like /lectorid
  basePath,
  assetPrefix: basePath ? `${basePath}/` : "",
  // URLs anteriores -> nuevas, para que los accesos guardados sigan funcionando
  async redirects() {
    return [
      { source: '/caja', destination: '/caja-maunaloa', permanent: true },
      { source: '/cajasbvip', destination: '/caja-superbets-vip', permanent: true },
      { source: '/hostessvip', destination: '/hostess-superbets-vip', permanent: true },
      { source: '/mesas', destination: '/mesas-maunaloa', permanent: true },
    ];
  },
};

module.exports = nextConfig;

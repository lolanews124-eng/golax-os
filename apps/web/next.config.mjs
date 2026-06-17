/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // In production the web app is served on the App Port (3000) behind the
  // panel's reverse proxy. The Express API runs on 4000 (localhost only).
  // Forward same-origin /api/* requests to the API so everything works through
  // a single public port with no CORS setup.
  async rewrites() {
    const apiTarget = process.env.API_PROXY_TARGET || "http://localhost:4000";
    return [
      {
        source: "/api/:path*",
        destination: `${apiTarget}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;

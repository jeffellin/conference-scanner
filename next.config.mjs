/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    // Scan/leads pages fetch fresh data on mount; without this, Next's
    // client router cache reuses a stale mounted instance for 30s on revisit.
    staleTimes: { dynamic: 0 },
  },
};
export default nextConfig;

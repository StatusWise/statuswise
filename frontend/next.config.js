/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    // Disable ESLint during builds since CI/CD handles linting
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Disable TypeScript checking during builds since CI/CD handles it
    ignoreBuildErrors: true,
  },
  async redirects() {
    return [
      {
        source: '/signup',
        destination: '/login',
        permanent: true,
      },
    ];
  },
};

export default nextConfig; 
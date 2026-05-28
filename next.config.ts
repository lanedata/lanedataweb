import type { NextConfig } from 'next'

// lanedata.es uses a custom domain → basePath is empty (no subfolder prefix needed)
const nextConfig: NextConfig = {
  output: 'export',
  basePath: '',
  trailingSlash: true,

  images: {
    unoptimized: true,
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },
}

export default nextConfig

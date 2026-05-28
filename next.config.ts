import type { NextConfig } from 'next'

// When hosted on GitHub Pages without a custom domain the site lives at
// https://mateogsilvaa.github.io/lanedata/ → basePath must be '/lanedata'.
// If you point lanedata.es to GitHub Pages via CNAME, set NEXT_PUBLIC_BASE_PATH=''
// in your repository secrets and the basePath will be removed automatically.
// Use || so that an empty string (unset secret in CI) also falls back to '/lanedata'
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '/lanedata'

const nextConfig: NextConfig = {
  output: 'export',          // static HTML export — no server needed
  basePath,
  trailingSlash: true,       // /articulo/slug/ → avoids 404s on GH Pages

  images: {
    unoptimized: true,        // next/image optimization requires a server
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

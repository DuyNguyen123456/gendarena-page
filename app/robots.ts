import type { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://gendarena.com'

  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: [
        '/admin/*',
        '/judge/*',
        '/api/*',
        '/auth/callback',
        '/reset-password',
      ],
    },
    sitemap: `${baseUrl}/sitemap.xml`,
  }
}

import type { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://gendarena.vn'

  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: [
        '/admin/*',
        '/judge/*',
        '/api/*',
        '/auth/callback',
        '/dat-lai-mat-khau',
      ],
    },
    sitemap: `${baseUrl}/sitemap.xml`,
  }
}

import type { MetadataRoute } from 'next'
import { createClient } from '@supabase/supabase-js'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://gendarena.vn'
  const currentDate = new Date()

  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: `${baseUrl}`,
      lastModified: currentDate,
      changeFrequency: 'weekly',
      priority: 1.0,
    },
    {
      url: `${baseUrl}/organizers`,
      lastModified: currentDate,
      changeFrequency: 'monthly',
      priority: 0.7,
    },
    {
      url: `${baseUrl}/login`,
      lastModified: currentDate,
      changeFrequency: 'monthly',
      priority: 0.5,
    },
    {
      url: `${baseUrl}/register`,
      lastModified: currentDate,
      changeFrequency: 'monthly',
      priority: 0.5,
    },
    {
      url: `${baseUrl}/privacy-policy`,
      lastModified: currentDate,
      changeFrequency: 'yearly',
      priority: 0.3,
    },
  ]

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseKey) {
    return staticRoutes
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseKey)
    const { data: competitions } = await supabase
      .from('competitions')
      .select('id, updated_at, created_at')

    if (competitions && competitions.length > 0) {
      const competitionRoutes: MetadataRoute.Sitemap = competitions.map((comp) => {
        const modDate = comp.updated_at
          ? new Date(comp.updated_at)
          : comp.created_at
          ? new Date(comp.created_at)
          : currentDate

        return {
          url: `${baseUrl}/competitions/${comp.id}`,
          lastModified: modDate,
          changeFrequency: 'weekly',
          priority: 0.8,
        }
      })

      return [...staticRoutes, ...competitionRoutes]
    }
  } catch (error) {
    console.error('Lỗi khi tải danh sách cuộc thi cho sitemap:', error)
  }

  return staticRoutes
}

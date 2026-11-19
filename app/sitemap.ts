import type { MetadataRoute } from 'next'
import { getAllContent } from '@/lib/content'

const baseUrl = 'https://www.theshipyard.cc'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const content = await getAllContent()

  return [
    {
      url: `${baseUrl}/`,
      lastModified: content[0]?.date ? new Date(content[0].date) : undefined,
      changeFrequency: 'weekly',
      priority: 1,
    },
    {
      url: `${baseUrl}/basin`,
      lastModified: content[0]?.date ? new Date(content[0].date) : undefined,
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    ...content.map((item) => ({
      url: `${baseUrl}/${item.slug}`,
      lastModified: new Date(item.date),
      changeFrequency: 'monthly' as const,
      priority: 0.6,
    })),
  ]
}

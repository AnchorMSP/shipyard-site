import type { MetadataRoute } from 'next'
import { getAllContent } from '@/lib/content'

const baseUrl = 'https://www.theshipyard.cc'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const allContent = await getAllContent()

  const contentEntries: MetadataRoute.Sitemap = allContent.map((item) => ({
    url: `${baseUrl}/${item.slug}`,
    lastModified: new Date(item.date),
  }))

  return [
    {
      url: baseUrl,
    },
    {
      url: `${baseUrl}/basin`,
    },
    ...contentEntries,
  ]
}

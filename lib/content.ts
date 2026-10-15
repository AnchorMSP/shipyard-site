import fs from 'fs/promises'
import path from 'path'
import matter from 'gray-matter'
import { remark } from 'remark'
import html from 'remark-html'
import type { ContentMeta, ContentItem } from './types'
import { logger } from './logger'

const contentDirectory = path.join(process.cwd(), 'content')

function slugFromFilename(filename: string): string {
  return filename
    .replace(/\.md$/, '')
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^\w-]/g, '')
}

function calculateReadingTime(content: string): number {
  const wordsPerMinute = 200
  const wordCount = content.split(/\s+/).length
  return Math.ceil(wordCount / wordsPerMinute)
}

async function parseMarkdownFile(filePath: string, slug: string): Promise<ContentItem | null> {
  const fileContents = await fs.readFile(filePath, 'utf8')
  const { data, content } = matter(fileContents)

  const meta = data as ContentMeta

  if (!meta.published) {
    return null
  }

  const processedContent = await remark().use(html).process(content)
  const contentHtml = processedContent.toString()

  const wordCount = content.split(/\s+/).length
  const readingTime = calculateReadingTime(content)

  return {
    ...meta,
    slug,
    content: contentHtml,
    wordCount,
    readingTime,
  }
}

export async function getAllContent(): Promise<ContentItem[]> {
  const categories = ['essays', 'notes', 'creative']
  const allContent: ContentItem[] = []

  for (const category of categories) {
    const categoryPath = path.join(contentDirectory, category)

    try {
      const files = await fs.readdir(categoryPath)

      for (const filename of files) {
        if (!filename.endsWith('.md')) continue

        const slug = slugFromFilename(filename)
        const filePath = path.join(categoryPath, filename)
        const item = await parseMarkdownFile(filePath, slug)

        if (item) {
          allContent.push(item)
        }
      }
    } catch (error) {
      // Category directory doesn't exist yet, skip
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        logger.error('Failed to load content category', { category, error })
      }
      continue
    }
  }

  // Sort by date, newest first
  allContent.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

  return allContent
}

export async function getContentBySlug(slug: string): Promise<ContentItem | null> {
  const categories = ['essays', 'notes', 'creative']

  for (const category of categories) {
    const categoryPath = path.join(contentDirectory, category)

    try {
      const files = await fs.readdir(categoryPath)

      for (const filename of files) {
        const fileSlug = slugFromFilename(filename)

        if (fileSlug === slug) {
          const filePath = path.join(categoryPath, filename)
          return await parseMarkdownFile(filePath, slug)
        }
      }
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        logger.error('Failed to read content category', { category, slug, error })
      }
      continue
    }
  }

  return null
}

export async function getFeaturedContent(): Promise<ContentItem | null> {
  const allContent = await getAllContent()

  // Find dg-home piece (Digital Garden style)
  const dgHome = allContent.find(item => item['dg-home'])
  if (dgHome) return dgHome

  // Find featured piece
  const featured = allContent.find(item => item.featured)
  if (featured) return featured

  // Fallback to latest essay
  const latestEssay = allContent.find(item => item.type === 'essay')
  if (latestEssay) return latestEssay

  // Fallback to any latest piece
  return allContent[0] || null
}

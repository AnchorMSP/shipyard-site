import fs from 'fs/promises'
import path from 'path'
import matter from 'gray-matter'
import { remark } from 'remark'
import html from 'remark-html'
import type { ContentMeta, ContentItem } from './types'

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
  let fileContents: string
  try {
    fileContents = await fs.readFile(filePath, 'utf8')
  } catch (error) {
    throw new Error(`Unable to read content file ${filePath}: ${(error as Error).message}`)
  }

  let parsed: ReturnType<typeof matter>
  try {
    parsed = matter(fileContents)
  } catch (error) {
    // An unparseable frontmatter block is a real fault, not "no content"; surface it
    // instead of letting it silently drop the file (and the rest of its category).
    throw new Error(`Unable to parse frontmatter in ${filePath}: ${(error as Error).message}`)
  }

  const meta = parsed.data as ContentMeta
  const content = parsed.content

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

// Lists one category directory. A missing directory is an expected state (not every
// category has content yet) and yields null; any other failure propagates so it is
// not mistaken for an empty category.
async function readCategory(category: string): Promise<string[] | null> {
  const categoryPath = path.join(contentDirectory, category)
  try {
    return await fs.readdir(categoryPath)
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return null
    }
    throw error
  }
}

export async function getAllContent(): Promise<ContentItem[]> {
  const categories = ['essays', 'notes', 'creative']
  const allContent: ContentItem[] = []

  for (const category of categories) {
    const files = await readCategory(category)
    if (!files) continue

    for (const filename of files) {
      if (!filename.endsWith('.md')) continue

      const slug = slugFromFilename(filename)
      const filePath = path.join(contentDirectory, category, filename)
      const item = await parseMarkdownFile(filePath, slug)

      if (item) {
        allContent.push(item)
      }
    }
  }

  // Sort by date, newest first
  allContent.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

  return allContent
}

export async function getContentBySlug(slug: string): Promise<ContentItem | null> {
  const categories = ['essays', 'notes', 'creative']

  for (const category of categories) {
    const files = await readCategory(category)
    if (!files) continue

    for (const filename of files) {
      const fileSlug = slugFromFilename(filename)

      if (fileSlug === slug) {
        const filePath = path.join(contentDirectory, category, filename)
        return await parseMarkdownFile(filePath, slug)
      }
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

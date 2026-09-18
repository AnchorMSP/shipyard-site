import { NextRequest, NextResponse } from 'next/server'
import { kv } from '@vercel/kv'
import { getContentBySlug } from '@/lib/content'

interface Vote {
  slug: string
  vote: 'like' | 'dislike'
  timestamp: string
  ip: string
  userAgent: string
  country?: string
  city?: string
}

async function getVotesForSlug(slug: string): Promise<{ likes: number; dislikes: number }> {
  try {
    const likes = await kv.get<number>(`votes:${slug}:likes`) || 0
    const dislikes = await kv.get<number>(`votes:${slug}:dislikes`) || 0
    return { likes, dislikes }
  } catch (error) {
    return { likes: 0, dislikes: 0 }
  }
}

async function incrementVote(slug: string, voteType: 'like' | 'dislike'): Promise<void> {
  const key = `votes:${slug}:${voteType}s`
  await kv.incr(key)
}

async function saveVoteLog(vote: Vote): Promise<void> {
  try {
    await kv.lpush('votes:log', vote)
  } catch (error) {
    console.error('Failed to log vote:', error)
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { slug, vote } = body

    if (typeof slug !== 'string' || !slug || slug.length > 200 || !['like', 'dislike'].includes(vote)) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
    }

    // The slug becomes part of a KV key name (`votes:<slug>:likes|dislikes`),
    // and kv.incr creates the key when it is missing. Only slugs of published
    // articles may be voted on; otherwise any anonymous caller can create a
    // persistent key in the app's only data store for every string it invents.
    if (!(await getContentBySlug(slug))) {
      return NextResponse.json({ error: 'Unknown slug' }, { status: 404 })
    }

    // Get IP and user agent
    const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown'
    const userAgent = request.headers.get('user-agent') || 'unknown'

    // Get geo data from Vercel headers
    const country = request.headers.get('x-vercel-ip-country')
    const city = request.headers.get('x-vercel-ip-city')

    const voteLog: Vote = {
      slug,
      vote,
      timestamp: new Date().toISOString(),
      ip,
      userAgent,
      ...(country && { country }),
      ...(city && { city }),
    }

    // Increment counter and save log
    await incrementVote(slug, vote)
    await saveVoteLog(voteLog)

    // Return updated counts
    const counts = await getVotesForSlug(slug)
    return NextResponse.json(counts)
  } catch (error) {
    console.error('Vote error:', error)
    return NextResponse.json({ error: 'Failed to record vote' }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const slug = searchParams.get('slug')

    if (!slug) {
      return NextResponse.json({ error: 'Missing slug' }, { status: 400 })
    }

    const counts = await getVotesForSlug(slug)
    return NextResponse.json(counts)
  } catch (error) {
    console.error('Get votes error:', error)
    return NextResponse.json({ error: 'Failed to get votes' }, { status: 500 })
  }
}

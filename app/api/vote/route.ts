import { NextRequest, NextResponse } from 'next/server'
import { kv } from '@vercel/kv'
import { logger } from '@/lib/logger'

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
    logger.error('Failed to read vote counts', { slug, error })
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
    logger.error('Failed to log vote', { slug: vote.slug, error })
  }
}

export async function POST(request: NextRequest) {
  let slug: string | undefined
  let vote: 'like' | 'dislike' | undefined
  try {
    const body = await request.json()
    slug = body.slug
    vote = body.vote

    if (!slug || !vote || !['like', 'dislike'].includes(vote)) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
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
    logger.error('Failed to record vote', { slug, vote, error })
    return NextResponse.json({ error: 'Failed to record vote' }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  let slug: string | null = null
  try {
    const { searchParams } = new URL(request.url)
    slug = searchParams.get('slug')

    if (!slug) {
      return NextResponse.json({ error: 'Missing slug' }, { status: 400 })
    }

    const counts = await getVotesForSlug(slug)
    return NextResponse.json(counts)
  } catch (error) {
    logger.error('Failed to get votes', { slug, error })
    return NextResponse.json({ error: 'Failed to get votes' }, { status: 500 })
  }
}

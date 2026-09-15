import { NextRequest, NextResponse } from 'next/server'
import { kv } from '@vercel/kv'
import { allowRequest, clientIp } from '@/lib/rate-limit'

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
    if (!(await allowRequest(request, 'vote'))) {
      return NextResponse.json({ error: 'Too many votes, please slow down' }, { status: 429 })
    }

    const body = await request.json()
    const { slug, vote } = body

    if (!slug || !vote || !['like', 'dislike'].includes(vote)) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
    }

    // One vote per slug per visitor, server-side; the client localStorage check is bypassable
    const dedupeKey = `vote:dedupe:${slug}:${clientIp(request)}`
    const firstVote = await kv.set(dedupeKey, 1, { nx: true, ex: 604800 })
    if (firstVote === null) {
      return NextResponse.json({ error: 'Already voted' }, { status: 409 })
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

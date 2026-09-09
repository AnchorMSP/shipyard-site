import { NextRequest, NextResponse } from 'next/server'
import { kv } from '@vercel/kv'

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

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { slug, vote } = body

    if (!slug || !vote || !['like', 'dislike'].includes(vote)) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
    }

    // Increment counter
    await incrementVote(slug, vote)

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

'use client'

import { useState, useEffect } from 'react'

interface VoteButtonsProps {
  slug: string
}

export default function VoteButtons({ slug }: VoteButtonsProps) {
  const [likes, setLikes] = useState(0)
  const [dislikes, setDislikes] = useState(0)
  const [voted, setVoted] = useState<'like' | 'dislike' | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const fetchCounts = () => {
      fetch(`/api/vote?slug=${slug}`)
        .then(res => res.json())
        .then(data => {
          setLikes(data.likes || 0)
          setDislikes(data.dislikes || 0)
        })
        .catch(() => {})
    }

    // Load counts once when the article mounts. The counts do not need
    // sub-minute freshness on a personal writing site, and a fixed-interval
    // poll is an uncached, unauthenticated serverless read against Vercel KV,
    // so an open tab must not keep generating load.
    fetchCounts()

    // Check if user already voted (localStorage)
    const storedVote = localStorage.getItem(`vote_${slug}`)
    if (storedVote) {
      setVoted(storedVote as 'like' | 'dislike')
    }
  }, [slug])

  const handleVote = async (vote: 'like' | 'dislike') => {
    if (voted || loading) return

    setLoading(true)

    try {
      const res = await fetch('/api/vote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug, vote }),
      })

      if (res.ok) {
        const data = await res.json()
        setLikes(data.likes)
        setDislikes(data.dislikes)
        setVoted(vote)
        localStorage.setItem(`vote_${slug}`, vote)
      }
    } catch (error) {
      console.error('Vote failed:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex items-center gap-4 pt-8 mt-8 border-t border-brand-tan/20">
      <span className="font-body text-sm text-brand-gray">Was this helpful?</span>

      <button
        onClick={() => handleVote('like')}
        disabled={voted !== null || loading}
        className={`flex items-center gap-2 px-4 py-2 rounded font-body text-sm transition-colors ${
          voted === 'like'
            ? 'bg-brand-sage text-white'
            : 'bg-brand-sage/10 text-brand-sage hover:bg-brand-sage/20'
        } ${voted && voted !== 'like' ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
          <path d="M2 10.5a1.5 1.5 0 113 0v6a1.5 1.5 0 01-3 0v-6zM6 10.333v5.43a2 2 0 001.106 1.79l.05.025A4 4 0 008.943 18h5.416a2 2 0 001.962-1.608l1.2-6A2 2 0 0015.56 8H12V4a2 2 0 00-2-2 1 1 0 00-1 1v.667a4 4 0 01-.8 2.4L6.8 7.933a4 4 0 00-.8 2.4z" />
        </svg>
        <span>{likes}</span>
      </button>

      <button
        onClick={() => handleVote('dislike')}
        disabled={voted !== null || loading}
        className={`flex items-center gap-2 px-4 py-2 rounded font-body text-sm transition-colors ${
          voted === 'dislike'
            ? 'bg-brand-gray text-white'
            : 'bg-brand-gray/10 text-brand-gray hover:bg-brand-gray/20'
        } ${voted && voted !== 'dislike' ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        <svg className="w-4 h-4 rotate-180" fill="currentColor" viewBox="0 0 20 20">
          <path d="M2 10.5a1.5 1.5 0 113 0v6a1.5 1.5 0 01-3 0v-6zM6 10.333v5.43a2 2 0 001.106 1.79l.05.025A4 4 0 008.943 18h5.416a2 2 0 001.962-1.608l1.2-6A2 2 0 0015.56 8H12V4a2 2 0 00-2-2 1 1 0 00-1 1v.667a4 4 0 01-.8 2.4L6.8 7.933a4 4 0 00-.8 2.4z" />
        </svg>
        <span>{dislikes}</span>
      </button>

      {voted && (
        <span className="font-body text-xs text-brand-gray italic">
          Thanks for your feedback!
        </span>
      )}
    </div>
  )
}

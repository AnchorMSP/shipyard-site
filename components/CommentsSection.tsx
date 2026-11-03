'use client'

import { useState, useEffect } from 'react'

interface User {
  id: string
  username: string
  email: string
}

interface Comment {
  id: string
  slug: string
  userId: string
  username: string
  text: string
  createdAt: string
  updatedAt?: string
}

interface CommentsSectionProps {
  slug: string
}

export default function CommentsSection({ slug }: CommentsSectionProps) {
  const [comments, setComments] = useState<Comment[]>([])
  const [user, setUser] = useState<User | null>(null)
  const [text, setText] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editText, setEditText] = useState('')
  const [loading, setLoading] = useState(false)

  const fetchComments = async () => {
    try {
      const res = await fetch(`/api/comments?slug=${slug}`)
      const data = await res.json()
      setComments(data.comments || [])
    } catch (err) {
      console.error('Failed to fetch comments:', err)
    }
  }

  const fetchUser = async () => {
    try {
      const res = await fetch('/api/auth/me')
      const data = await res.json()
      setUser(data.user)
    } catch (err) {
      setUser(null)
    }
  }

  useEffect(() => {
    // Load once on mount; a 15s poll is an uncached, unauthenticated
    // serverless read against Vercel KV. The list is refreshed on demand after
    // the reader posts, edits or deletes a comment.
    fetchComments()
    fetchUser()
  }, [slug])

  const handlePost = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!text.trim() || loading) return

    setLoading(true)
    try {
      const res = await fetch('/api/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug, text }),
      })

      if (res.ok) {
        setText('')
        fetchComments()
      }
    } catch (err) {
      console.error('Post failed:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleEdit = async (id: string) => {
    if (!editText.trim() || loading) return

    setLoading(true)
    try {
      const res = await fetch(`/api/comments/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: editText }),
      })

      if (res.ok) {
        setEditingId(null)
        setEditText('')
        fetchComments()
      }
    } catch (err) {
      console.error('Edit failed:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this comment?')) return

    setLoading(true)
    try {
      const res = await fetch(`/api/comments/${id}`, { method: 'DELETE' })
      if (res.ok) {
        fetchComments()
      }
    } catch (err) {
      console.error('Delete failed:', err)
    } finally {
      setLoading(false)
    }
  }

  const startEdit = (comment: Comment) => {
    setEditingId(comment.id)
    setEditText(comment.text)
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditText('')
  }

  return (
    <div className="mt-8 pt-8 border-t border-brand-tan/20">
      <h2 className="font-body text-lg text-brand-gray mb-4">
        Comments {comments.length > 0 && `(${comments.length})`}
      </h2>

      {user ? (
        <form onSubmit={handlePost} className="mb-6">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Share your thoughts..."
            maxLength={2000}
            rows={3}
            className="w-full px-3 py-2 bg-white border border-brand-tan/20 rounded font-body text-sm focus:outline-none focus:border-brand-sage resize-none"
          />
          <div className="flex justify-between items-center mt-2">
            <span className="font-body text-xs text-brand-gray">
              {text.length}/2000
            </span>
            <button
              type="submit"
              disabled={!text.trim() || loading}
              className="bg-brand-tan hover:bg-brand-sage text-white font-body text-sm px-4 py-2 rounded transition-colors disabled:opacity-50"
            >
              Post Comment
            </button>
          </div>
        </form>
      ) : (
        <div className="mb-6 p-4 bg-brand-tan/10 rounded">
          <p className="font-body text-sm text-brand-gray text-center">
            Sign in to comment
          </p>
        </div>
      )}

      <div className="space-y-4">
        {comments.length === 0 ? (
          <p className="font-body text-sm text-brand-gray italic">No comments yet</p>
        ) : (
          comments.map((comment) => (
            <div key={comment.id} className="bg-brand-tan/5 rounded p-4">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <span className="font-body text-sm font-medium text-brand-gray">
                    {comment.username}
                  </span>
                  <span className="font-body text-xs text-brand-gray/60 ml-2">
                    {new Date(comment.createdAt).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                      hour: 'numeric',
                      minute: '2-digit',
                    })}
                    {comment.updatedAt && ' (edited)'}
                  </span>
                </div>
                {user?.id === comment.userId && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => startEdit(comment)}
                      className="font-body text-xs text-brand-sage hover:text-brand-tan transition-colors"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(comment.id)}
                      className="font-body text-xs text-red-600 hover:text-red-800 transition-colors"
                    >
                      Delete
                    </button>
                  </div>
                )}
              </div>

              {editingId === comment.id ? (
                <div>
                  <textarea
                    value={editText}
                    onChange={(e) => setEditText(e.target.value)}
                    maxLength={2000}
                    rows={3}
                    className="w-full px-3 py-2 bg-white border border-brand-tan/20 rounded font-body text-sm focus:outline-none focus:border-brand-sage resize-none mb-2"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEdit(comment.id)}
                      disabled={!editText.trim() || loading}
                      className="bg-brand-tan hover:bg-brand-sage text-white font-body text-xs px-3 py-1 rounded transition-colors disabled:opacity-50"
                    >
                      Save
                    </button>
                    <button
                      onClick={cancelEdit}
                      className="bg-brand-gray/20 hover:bg-brand-gray/30 text-brand-gray font-body text-xs px-3 py-1 rounded transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <p className="font-body text-sm text-brand-gray whitespace-pre-wrap">
                  {comment.text}
                </p>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  )
}

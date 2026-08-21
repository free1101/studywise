/* eslint-disable react-hooks/set-state-in-effect */
'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import type { Annotation } from '@/lib/schema'

interface UseAnnotationsOptions {
  contentId: string | null
}

export function useAnnotations({ contentId }: UseAnnotationsOptions) {
  const [annotations, setAnnotations] = useState<Annotation[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const prevContentIdRef = useRef<string | null>(null)

  useEffect(() => {
    if (contentId === prevContentIdRef.current) return
    prevContentIdRef.current = contentId

    if (!contentId) {
      setAnnotations([])
      return
    }

    const controller = new AbortController()

    async function load() {
      try {
        const res = await fetch(`/api/annotations?contentId=${contentId}`, {
          signal: controller.signal,
        })
        if (!res.ok) throw new Error('Failed to fetch annotations')
        const data = await res.json()
        setAnnotations(data)
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') return
        console.error('Fetch annotations error:', err)
        setError(err instanceof Error ? err.message : 'Unknown error')
      }
    }

    load()
    return () => controller.abort()
  }, [contentId])

  const createAnnotation = useCallback(async (annotation: {
    quote: string
    quoteOffset: number
    quoteLength: number
    type: 'note' | 'question'
    body: string
  }): Promise<Annotation | null> => {
    if (!contentId) {
      setError('Content ID is required')
      return null
    }

    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/annotations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contentId, ...annotation }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to create annotation')
      }

      const newAnnotation = await response.json()
      setAnnotations(prev => [...prev, newAnnotation])
      return newAnnotation
    } catch (err) {
      console.error('Create annotation error:', err)
      setError(err instanceof Error ? err.message : 'Unknown error')
      return null
    } finally {
      setIsLoading(false)
    }
  }, [contentId])

  const updateAnnotationReply = useCallback(async (id: string, aiReply: string) => {
    setAnnotations(prev =>
      prev.map(a => (a.id === id ? { ...a, aiReply } : a))
    )

    try {
      await fetch(`/api/annotations/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ aiReply }),
      })
    } catch (err) {
      console.error('Update annotation reply error:', err)
    }
  }, [])

  const deleteAnnotation = useCallback(async (id: string) => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/annotations/${id}`, {
        method: 'DELETE',
      })

      if (!response.ok) throw new Error('Failed to delete annotation')

      setAnnotations(prev => prev.filter(a => a.id !== id))
    } catch (err) {
      console.error('Delete annotation error:', err)
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setIsLoading(false)
    }
  }, [])

  return {
    annotations,
    isLoading,
    error,
    createAnnotation,
    updateAnnotationReply,
    deleteAnnotation,
    refresh: useCallback(() => {
      prevContentIdRef.current = null
    }, []),
  }
}

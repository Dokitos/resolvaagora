'use client'

import { useState, use } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import toast from 'react-hot-toast'
import { serviceRequestsApi } from '@/lib/api/service-requests'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { ArrowLeft, Star } from 'lucide-react'

export default function ReviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const [rating, setRating] = useState(0)
  const [hovered, setHovered] = useState(0)
  const [comment, setComment] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const LABELS = ['', 'Muito mau', 'Mau', 'Razoável', 'Bom', 'Excelente']

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!rating) { toast.error('Seleccione uma classificação'); return }
    setSubmitting(true)
    try {
      await serviceRequestsApi.review(id, { rating, comment: comment.trim() || undefined })
      toast.success('Avaliação enviada! Obrigado.')
      router.push(`/services/${id}`)
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Erro ao enviar avaliação')
    } finally {
      setSubmitting(false)
    }
  }

  const displayRating = hovered || rating

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link href={`/services/${id}`} className="text-gray-400 hover:text-gray-600">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-xl font-bold text-gray-900">Avaliar serviço</h1>
      </div>

      <Card className="p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="text-center space-y-3">
            <p className="text-sm text-gray-600">Como classifica o serviço prestado?</p>
            <div className="flex justify-center gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHovered(star)}
                  onMouseLeave={() => setHovered(0)}
                  className="transition-transform hover:scale-110 focus:outline-none"
                >
                  <Star
                    className={`h-10 w-10 transition-colors ${
                      star <= displayRating
                        ? 'text-amber-400 fill-amber-400'
                        : 'text-gray-300'
                    }`}
                  />
                </button>
              ))}
            </div>
            {displayRating > 0 && (
              <p className="text-sm font-medium text-gray-700">{LABELS[displayRating]}</p>
            )}
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-700">
              Comentário <span className="text-gray-400 font-normal">(opcional)</span>
            </label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Partilhe a sua experiência com o técnico..."
              rows={4}
              maxLength={500}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-xs text-gray-400 text-right">{comment.length}/500</p>
          </div>

          <Button type="submit" className="w-full" disabled={submitting || !rating}>
            {submitting ? 'A enviar…' : 'Enviar avaliação'}
          </Button>
        </form>
      </Card>
    </div>
  )
}

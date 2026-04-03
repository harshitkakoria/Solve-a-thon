import { useState, useMemo, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { classifyFeedback } from '../lib/openai'
import { fetchActiveMenu } from '../lib/menu'

const TAGS = ['Taste', 'Hygiene', 'Quantity', 'Quality']

function getMealSlot() {
  const hour = new Date().getHours()
  if (hour >= 7 && hour < 11) return 'Breakfast'
  if (hour >= 12 && hour < 16) return 'Lunch'
  if (hour >= 17 && hour < 19) return 'Snacks'
  // Testing: Dinner covers all night (7 PM to 6:59 AM)
  if (hour >= 19 || hour < 7) return 'Dinner'
  return 'Closed'
}

export default function FeedbackForm() {
  const [searchParams] = useSearchParams()
  const messId = searchParams.get('mess')
  const mealSlot = useMemo(() => getMealSlot(), [])

  const [rating, setRating] = useState(0)
  const [selectedTags, setSelectedTags] = useState([])
  const [text, setText] = useState('')
  const [status, setStatus] = useState(null) // 'success' | 'error' | null
  const [submitting, setSubmitting] = useState(false)
  const [menu, setMenu] = useState(null)

  useEffect(() => {
    async function getMenu() {
      if (!messId) return
      const fetchedMenu = await fetchActiveMenu(messId)
      setMenu(fetchedMenu || {})
    }
    getMenu()
  }, [messId])

  const day = new Date().toLocaleString('en-us', { weekday: 'long' })
  const items = menu?.[day]?.[mealSlot] || []

  const toggleTag = (tag) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    )
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (rating === 0) {
      setStatus('error')
      return
    }

    if (rating <= 3 && !text.trim()) {
      setStatus('error_text_required')
      return
    }

    setSubmitting(true)
    setStatus(null)

    let ai_summary = ''
    let ai_severity = 1

    try {
      const classification = await classifyFeedback(selectedTags, text)
      if (classification) {
        ai_summary = classification.summary || ''
        ai_severity = classification.severity || 1
      }
    } catch (err) {
      console.error('Classification error:', err)
    }

    const { error } = await supabase.from('feedback').insert({
      mess_id: messId,
      meal_slot: mealSlot,
      rating,
      complaint_tags: selectedTags,
      complaint_text: text || null,
      ai_summary,
      ai_severity,
    })

    setSubmitting(false)

    if (error) {
      console.error('Supabase insert error:', error)
      setStatus('error')
    } else {
      setStatus('success')
      setRating(0)
      setSelectedTags([])
      setText('')
    }
  }

  // Closed state
  if (mealSlot === 'Closed') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-gray-100 to-slate-50 flex items-center justify-center p-4">
        <div className="bg-white border border-slate-200 rounded-2xl shadow-2xl p-8 max-w-md text-center">
          <p className="text-slate-700 text-lg">
            Feedback only allowed during meal times
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-gray-100 to-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        <div className="bg-white border border-slate-200 rounded-2xl shadow-2xl p-8">
          <h1 className="text-3xl font-bold text-slate-900 mb-6 tracking-tight">
            Submit Feedback
          </h1>

          {/* Mess ID & Meal Slot */}
          <div className="flex gap-4 mb-6">
            <div className="flex-1 p-3 rounded-xl bg-slate-50 border border-slate-200">
              <p className="text-xs text-slate-500 mb-1">Mess ID</p>
              <p className="text-slate-900 font-semibold">{messId || '—'}</p>
            </div>
            <div className="flex-1 p-3 rounded-xl bg-slate-50 border border-slate-200">
              <p className="text-xs text-slate-500 mb-1">Meal Slot</p>
              <p className="text-slate-900 font-semibold">{mealSlot}</p>
            </div>
          </div>

          {/* Show Dishes */}
          {menu && (Array.isArray(items) ? items.length > 0 : items) && (
            <div className="mb-6 p-4 rounded-xl bg-purple-50 border border-purple-100">
              <p className="text-xs text-purple-700 font-medium mb-2 uppercase tracking-wide">
                Today's Menu ({day})
              </p>
              <div className="flex flex-wrap gap-2">
                {Array.isArray(items) ? (
                  items.map((dish, idx) => (
                    <span key={idx} className="text-sm px-3 py-1 rounded-full bg-purple-100 text-purple-900">
                      {dish}
                    </span>
                  ))
                ) : (
                  <span className="text-sm px-3 py-1 rounded-full bg-purple-100 text-purple-900">
                    {items}
                  </span>
                )}
              </div>
            </div>
          )}

          {status === 'success' && (
            <div className="mb-6 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm">
              Thank you! Your feedback has been recorded.
            </div>
          )}

          {status === 'error' && (
            <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 text-red-600 text-sm">
              {rating === 0
                ? 'Please select a rating before submitting.'
                : 'Something went wrong. Please try again.'}
            </div>
          )}

          {status === 'error_text_required' && (
            <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 text-red-600 text-sm">
              Please provide a comment explaining why you gave {rating} stars.
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Star Rating */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Rating
              </label>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    className={`text-3xl transition-colors cursor-pointer ${
                      star <= rating
                        ? 'text-yellow-400'
                        : 'text-slate-300 hover:text-slate-400'
                    }`}
                  >
                    ★
                  </button>
                ))}
              </div>
            </div>

            {/* Complaint Tags */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Complaint Tags
              </label>
              <div className="flex flex-wrap gap-2">
                {TAGS.map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => toggleTag(tag)}
                    className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-colors cursor-pointer ${
                      selectedTags.includes(tag)
                        ? 'bg-purple-600 border-purple-500 text-white'
                        : 'bg-slate-50 border-slate-200 text-slate-600 hover:text-slate-900 hover:border-slate-300'
                    }`}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>

            {/* Optional Text */}
            <div>
              <label htmlFor="complaint-text" className="block text-sm font-medium text-slate-700 mb-1.5">
                Additional Comments {rating > 0 && rating <= 3 ? <span className="text-red-500">*</span> : <span className="text-slate-500">(optional)</span>}
              </label>
              <textarea
                id="complaint-text"
                rows={3}
                value={text}
                onChange={(e) => setText(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-white border border-slate-300 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition resize-none"
                placeholder="Describe your experience..."
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-2.5 px-4 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium transition-colors cursor-pointer"
            >
              {submitting ? 'Submitting...' : 'Submit Feedback'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}

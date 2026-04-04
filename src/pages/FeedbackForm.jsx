import { useState, useMemo, useEffect } from 'react'
import { motion } from 'framer-motion'
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
      <div className="min-h-screen relative overflow-hidden bg-slate-50 flex items-center justify-center p-4">
        <div className="absolute top-[-20%] left-[-10%] w-[140%] h-[140%] bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-blue-100/40 via-purple-50/40 to-slate-50 animate-slow-pulse pointer-events-none" />
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="glass-panel p-8 max-w-md text-center rounded-3xl relative z-10"
        >
          <p className="text-slate-700 text-lg font-medium">
            Feedback only allowed during meal times
          </p>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="min-h-screen relative overflow-hidden bg-slate-50 flex items-center justify-center p-4">
      <div className="absolute top-[-20%] left-[-10%] w-[140%] h-[140%] bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-blue-100/40 via-purple-50/40 to-slate-50 animate-slow-pulse pointer-events-none" />
      <div className="w-full max-w-lg relative z-10">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="glass-panel p-8 rounded-3xl"
        >
          <div className="absolute -inset-x-0 -top-0 h-1/3 bg-gradient-to-b from-white/40 to-transparent opacity-50 pointer-events-none rounded-t-3xl" />
          
          <h1 className="text-3xl font-bold text-slate-900 mb-6 tracking-tight relative">
            Submit Feedback
          </h1>

          {/* Mess ID & Meal Slot */}
          <div className="flex gap-4 mb-6 relative">
            <div className="flex-1 p-4 rounded-2xl bg-white/50 border border-slate-200/50 shadow-sm">
              <p className="text-xs text-slate-500 font-medium mb-1 uppercase tracking-wider">Mess</p>
              <p className="text-slate-900 font-bold">{messId || '—'}</p>
            </div>
            <div className="flex-1 p-4 rounded-2xl bg-white/50 border border-slate-200/50 shadow-sm">
              <p className="text-xs text-slate-500 font-medium mb-1 uppercase tracking-wider">Session</p>
              <p className="text-slate-900 font-bold">{mealSlot}</p>
            </div>
          </div>

          {/* Show Dishes */}
          {menu && (Array.isArray(items) ? items.length > 0 : items) && (
            <div className="mb-6 p-5 rounded-2xl bg-purple-50/50 border border-purple-100/50 shadow-sm relative overflow-hidden">
              <div className="absolute -inset-x-0 -bottom-0 h-1/2 bg-gradient-to-t from-purple-100/30 to-transparent pointer-events-none" />
              <p className="text-xs text-purple-600 font-bold mb-3 uppercase tracking-wider relative">
                Today's Menu ({day})
              </p>
              <div className="flex flex-wrap gap-2 relative">
                {Array.isArray(items) ? (
                  items.map((dish, idx) => (
                    <span key={idx} className="text-sm px-3.5 py-1.5 rounded-full bg-white/80 border border-purple-100 text-purple-900 font-medium shadow-sm">
                      {dish}
                    </span>
                  ))
                ) : (
                  <span className="text-sm px-3.5 py-1.5 rounded-full bg-white/80 border border-purple-100 text-purple-900 font-medium shadow-sm">
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
            <div className="relative">
              <label className="block text-sm font-semibold text-slate-700 mb-3">
                Select Areas of Improvement
              </label>
              <div className="flex flex-wrap gap-2">
                {TAGS.map((tag) => (
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    key={tag}
                    type="button"
                    onClick={() => toggleTag(tag)}
                    className={`px-4 py-2 rounded-full text-sm font-medium border transition-all cursor-pointer shadow-sm ${
                      selectedTags.includes(tag)
                        ? 'bg-purple-600 border-purple-500 text-white shadow-purple-500/20'
                        : 'bg-white/80 border-slate-200 text-slate-600 hover:text-slate-900 hover:border-slate-300'
                    }`}
                  >
                    {tag}
                  </motion.button>
                ))}
              </div>
            </div>

            {/* Optional Text */}
            <div className="relative">
              <label htmlFor="complaint-text" className="block text-sm font-semibold text-slate-700 mb-2">
                Additional Comments {rating > 0 && rating <= 3 ? <span className="text-red-500">*</span> : <span className="text-slate-400 font-normal ml-1">(optional)</span>}
              </label>
              <textarea
                id="complaint-text"
                rows={3}
                value={text}
                onChange={(e) => setText(e.target.value)}
                className="w-full px-4 py-3 rounded-2xl bg-white/80 border border-slate-200 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 transition-all resize-none shadow-sm"
                placeholder="Describe your experience in more detail..."
              />
            </div>

            <motion.button
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              type="submit"
              disabled={submitting}
              className="w-full py-3 px-4 rounded-2xl bg-purple-600 hover:bg-purple-500 border border-purple-500 shadow-xl shadow-purple-500/20 disabled:opacity-50 disabled:shadow-none disabled:cursor-not-allowed text-white font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer relative overflow-hidden group"
            >
              <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-[100%] group-hover:translate-x-[100%] transition-transform duration-700" />
              {submitting ? 'Submitting...' : 'Submit Feedback'}
            </motion.button>
          </form>
        </motion.div>
      </div>
    </div>
  )
}

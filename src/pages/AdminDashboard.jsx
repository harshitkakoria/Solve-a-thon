import { useState, useEffect, useMemo } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'

const FILTERS = ['All', 'Breakfast', 'Lunch', 'Snacks', 'Dinner']

export default function AdminDashboard() {
  const [searchParams] = useSearchParams()
  const messId = searchParams.get('mess')

  const [feedbacks, setFeedbacks] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('All')

  useEffect(() => {
    async function fetchFeedback() {
      if (!messId) {
        setLoading(false)
        return
      }

      setLoading(true)
      const { data, error } = await supabase
        .from('feedback')
        .select('*')
        .eq('mess_id', messId)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching feedback:', error)
      } else {
        setFeedbacks(data || [])
      }
      setLoading(false)
    }

    fetchFeedback()
  }, [messId])

  const filteredFeedbacks = useMemo(() => {
    if (filter === 'All') return feedbacks
    return feedbacks.filter((f) => f.meal_slot === filter)
  }, [feedbacks, filter])

  const stats = useMemo(() => {
    if (feedbacks.length === 0) {
      return { average: 0, total: 0, critical: 0 }
    }
    const total = feedbacks.length
    const sum = feedbacks.reduce((acc, curr) => acc + (curr.rating || 0), 0)
    const average = (sum / total).toFixed(1)
    const critical = feedbacks.filter((f) => f.ai_severity === 3).length

    return { average, total, critical }
  }, [feedbacks])

  if (!messId) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-950 to-slate-900 flex items-center justify-center p-4">
        <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-8 max-w-md text-center">
          <p className="text-slate-300 text-lg mb-4">
            No Mess ID provided.
          </p>
          <Link
            to="/"
            className="text-sm px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-slate-300 hover:text-white hover:bg-white/10 transition"
          >
            ← Go to form
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-950 to-slate-900 p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white tracking-tight">
              Admin Dashboard
            </h1>
            <p className="text-slate-400 text-sm mt-1">
              Mess ID: <span className="font-semibold text-white">{messId}</span>
            </p>
          </div>
          <Link
            to={`/?mess=${messId}`}
            className="text-sm px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-slate-300 hover:text-white hover:bg-white/10 transition"
          >
            ← Form View
          </Link>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-6">
            <p className="text-slate-400 text-sm font-medium mb-1">Average Rating</p>
            <p className="text-3xl font-bold text-white max-w-full overflow-hidden text-ellipsis whitespace-nowrap">
              {stats.average} <span className="text-lg text-slate-500 font-normal">/ 5</span>
            </p>
          </div>
          <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-6">
            <p className="text-slate-400 text-sm font-medium mb-1">Total Feedback</p>
            <p className="text-3xl font-bold text-white max-w-full overflow-hidden text-ellipsis whitespace-nowrap">
              {stats.total}
            </p>
          </div>
          <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-6">
            <p className="text-slate-400 text-sm font-medium mb-1">Critical Issues</p>
            <p className="text-3xl font-bold text-red-400 max-w-full overflow-hidden text-ellipsis whitespace-nowrap">
              {stats.critical}
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-2 mb-6">
          {FILTERS.map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition cursor-pointer ${
                filter === f
                  ? 'bg-purple-600 text-white'
                  : 'bg-white/5 border border-white/10 text-slate-400 hover:text-white hover:bg-white/10'
              }`}
            >
              {f}
            </button>
          ))}
        </div>

        {/* Table */}
        <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl overflow-hidden shadow-2xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[700px]">
              <thead>
                <tr className="bg-white/[0.02] border-b border-white/10 text-slate-400 text-sm">
                  <th className="p-4 font-medium">Time & Meal</th>
                  <th className="p-4 font-medium">Rating</th>
                  <th className="p-4 font-medium w-1/4">Tags</th>
                  <th className="p-4 font-medium">Summary</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {loading ? (
                  <tr>
                    <td colSpan={4} className="p-8 text-center text-slate-500">
                      Loading...
                    </td>
                  </tr>
                ) : filteredFeedbacks.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="p-8 text-center text-slate-500">
                      No feedback found.
                    </td>
                  </tr>
                ) : (
                  filteredFeedbacks.map((item) => (
                    <tr key={item.id} className="hover:bg-white/[0.02] transition">
                      <td className="p-4 align-top">
                        <div className="text-white text-sm whitespace-nowrap">
                          {item.created_at ? new Date(item.created_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short'}) : '—'}
                        </div>
                        <div className="text-purple-400 text-xs mt-1 font-medium bg-purple-500/10 inline-block px-2 py-0.5 rounded-full">
                          {item.meal_slot}
                        </div>
                      </td>
                      <td className="p-4 align-top">
                        <div className="flex text-yellow-400 text-sm">
                          {'★'.repeat(item.rating || 0)}
                          <span className="text-slate-700">
                            {'★'.repeat(5 - (item.rating || 0))}
                          </span>
                        </div>
                      </td>
                      <td className="p-4 align-top">
                        <div className="flex flex-wrap gap-1.5">
                          {(item.complaint_tags || []).map((tag, i) => (
                            <span
                              key={i}
                              className="text-[10px] px-2 py-0.5 rounded-md bg-white/10 border border-white/10 text-slate-300"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="p-4 align-top text-sm">
                        <p className="text-slate-300 leading-relaxed">
                          {item.ai_summary || item.complaint_text || <span className="text-slate-600 italic">No text provided</span>}
                        </p>
                        {item.ai_severity === 3 && (
                          <span className="inline-block mt-2 text-[10px] font-bold uppercase tracking-wider text-red-400 bg-red-400/10 border border-red-400/20 px-2 py-0.5 rounded">
                            Critical severity
                          </span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}

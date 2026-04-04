import { useState, useEffect, useMemo, useRef } from 'react'
// eslint-disable-next-line no-unused-vars
import { motion } from 'framer-motion'
import { useSearchParams, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { summarizeMealSession } from '../lib/openai'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { CheckCircle2, Circle, AlertTriangle, Calendar, Sparkles, Loader2, Lightbulb, ListTodo } from 'lucide-react'

const FILTERS = ['All', 'Breakfast', 'Lunch', 'Snacks', 'Dinner']
const DATE_RANGES = ['Today', 'Last 7 Days', 'This Month', 'All Time']

function getMealSlot() {
  const now = new Date()
  const t = now.getHours() + now.getMinutes() / 60

  if (t >= 7 && t <= 9.5) return 'Breakfast' // 7:00 AM - 9:30 AM
  if (t >= 12 && t <= 14.5) return 'Lunch'   // 12:00 PM - 2:30 PM
  if (t >= 15 && t <= 18.5) return 'Snacks'  // 3:00 PM - 6:30 PM
  if (t >= 19 && t <= 21) return 'Dinner'    // 7:00 PM - 9:00 PM
  return 'Closed'
}

export default function AdminDashboard() {
  const [searchParams] = useSearchParams()
  const messId = searchParams.get('mess')

  const [feedbacks, setFeedbacks] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('All')
  const [dateRange, setDateRange] = useState('All Time')

  // aiSummaries now stores full objects: { summary, suggestions, todos }
  const [aiSummaries, setAiSummaries] = useState({})
  const [aiLoading, setAiLoading] = useState({})
  const generatingRefs = useRef(new Set())

  // ─── Helper: Build a unique key for storing summaries ───
  const buildSummaryId = (groupId) => `${messId}_meal_${groupId}`

  // ─── Save a summary to Supabase ───
  const saveSummaryToDB = async (id, content) => {
    const { error } = await supabase.from('ai_summaries').upsert({
      id,
      mess_id: messId,
      summary_type: 'meal',
      content
    })
    if (error) console.error('Error saving AI summary:', error)
  }

  // ─── Load ALL saved summaries from Supabase on mount ───
  useEffect(() => {
    async function loadSavedSummaries() {
      if (!messId) return

      const { data, error } = await supabase
        .from('ai_summaries')
        .select('*')
        .eq('mess_id', messId)
        .eq('summary_type', 'meal')

      if (error) {
        console.error('Error loading saved summaries:', error)
        return
      }

      if (!data || data.length === 0) return

      const loaded = {}
      data.forEach(row => {
        const label = row.id.replace(`${messId}_meal_`, '')
        loaded[label] = row.content
      })
      setAiSummaries(prev => ({ ...prev, ...loaded }))
    }

    loadSavedSummaries()
  }, [messId])

  // ─── Fetch feedbacks ───
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

  // ─── Generate & save a meal session summary ───
  const handleGenerateSummary = async (groupId, mealFeedbacks) => {
    setAiLoading(prev => ({ ...prev, [groupId]: true }))

    const payload = mealFeedbacks.map(f => ({
      id: f.id,
      tags: f.complaint_tags || [],
      text: f.complaint_text || ''
    }))

    const result = await summarizeMealSession(payload)

    setAiSummaries(prev => ({ ...prev, [groupId]: result }))
    setAiLoading(prev => ({ ...prev, [groupId]: false }))

    // Persist to Supabase
    const dbId = buildSummaryId(groupId)
    await saveSummaryToDB(dbId, result)
  }

  // eslint-disable-next-line no-unused-vars
  const toggleResolved = async (id, currentStatus) => {
    setFeedbacks(prev => prev.map(f => f.id === id ? { ...f, is_resolved: !currentStatus } : f))
    const { error } = await supabase
      .from('feedback')
      .update({ is_resolved: !currentStatus })
      .eq('id', id)

    if (error) console.error('Error toggling resolve status:', error)
  }

  const toggleAbstractTodo = async (linkedIds, isCurrentlyResolved) => {
    if (!linkedIds || linkedIds.length === 0) return
    const newStatus = !isCurrentlyResolved

    setFeedbacks(prev => prev.map(f =>
      linkedIds.includes(f.id) ? { ...f, is_resolved: newStatus } : f
    ))

    const { error } = await supabase
      .from('feedback')
      .update({ is_resolved: newStatus })
      .in('id', linkedIds)

    if (error) console.error('Error bulk toggling status:', error)
  }

  // ─── Filter by Date Range AND Time Gating ───
  const timeFilteredFeedbacks = useMemo(() => {
    const now = new Date()
    const activeSlot = getMealSlot()

    return feedbacks.filter(f => {
      if (!f.created_at) return true
      const fDate = new Date(f.created_at)
      const isToday = fDate.toDateString() === now.toDateString()

      if (isToday && f.meal_slot === activeSlot) {
        return false
      }

      if (dateRange === 'Today') {
        return isToday
      } else if (dateRange === 'Last 7 Days') {
        const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
        return fDate >= sevenDaysAgo
      } else if (dateRange === 'This Month') {
        return fDate.getMonth() === now.getMonth() && fDate.getFullYear() === now.getFullYear()
      }
      return true
    })
  }, [feedbacks, dateRange])

  // Filter by Meal Slot
  const finalFilteredFeedbacks = useMemo(() => {
    if (filter === 'All') return timeFilteredFeedbacks
    return timeFilteredFeedbacks.filter((f) => f.meal_slot === filter)
  }, [timeFilteredFeedbacks, filter])

  // Top Tags
  const tagStats = useMemo(() => {
    const counts = {}
    timeFilteredFeedbacks.forEach(f => {
      (f.complaint_tags || []).forEach(tag => {
        counts[tag] = (counts[tag] || 0) + 1
      })
    })
    return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 4)
  }, [timeFilteredFeedbacks])

  // Grouped Meal Sessions
  const groupedMeals = useMemo(() => {
    const groups = {}
    finalFilteredFeedbacks.forEach(f => {
      if (!f.created_at) return
      const dateStr = new Date(f.created_at).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })
      const key = `${dateStr} - ${f.meal_slot}`
      if (!groups[key]) {
        groups[key] = { id: key, dateStr, mealSlot: f.meal_slot, feedbacks: [], sum: 0, critical: 0, unresolved: 0, tags: {} }
      }
      groups[key].feedbacks.push(f)
      groups[key].sum += (f.rating || 0)
      if (f.ai_severity === 3) groups[key].critical++
      if (f.ai_severity === 3 && !f.is_resolved) groups[key].unresolved++

        ; (f.complaint_tags || []).forEach(t => {
          groups[key].tags[t] = (groups[key].tags[t] || 0) + 1
        })
    })

    return Object.values(groups).map(g => ({
      ...g,
      avg: (g.sum / g.feedbacks.length).toFixed(1),
      topTags: Object.entries(g.tags).sort((a, b) => b[1] - a[1]).slice(0, 3)
    }))
  }, [finalFilteredFeedbacks])

  // ─── Auto-generate summaries for unsummarized meal sessions ───
  useEffect(() => {
    groupedMeals.forEach(meal => {
      if (!aiSummaries[meal.id] && !aiLoading[meal.id] && !generatingRefs.current.has(meal.id)) {
        generatingRefs.current.add(meal.id)
        handleGenerateSummary(meal.id, meal.feedbacks)
      }
    })
  }, [groupedMeals, aiSummaries])

  // ─── Aggregate suggestions from all per-meal summaries (for current view) ───
  const aggregatedSuggestions = useMemo(() => {
    const suggestions = []
    groupedMeals.forEach(meal => {
      const data = aiSummaries[meal.id]
      if (data && data.suggestions) {
        data.suggestions.forEach(sug => {
          if (!suggestions.includes(sug)) suggestions.push(sug)
        })
      }
    })
    return suggestions
  }, [groupedMeals, aiSummaries])

  // ─── Aggregate issues/todos from all per-meal summaries (for current view) ───
  const aggregatedTodos = useMemo(() => {
    const todos = []
    groupedMeals.forEach(meal => {
      const data = aiSummaries[meal.id]
      if (data && data.todos) {
        data.todos.forEach(todo => {
          todos.push({ ...todo, source: `${meal.mealSlot} — ${meal.dateStr}` })
        })
      }
    })
    return todos
  }, [groupedMeals, aiSummaries])

  // Check if any meals are still generating
  const anyMealLoading = useMemo(() => {
    return groupedMeals.some(meal => aiLoading[meal.id] || (!aiSummaries[meal.id] && !aiLoading[meal.id]))
  }, [groupedMeals, aiLoading, aiSummaries])

  // Chart Data
  const chartData = useMemo(() => {
    const dailyAvg = {}

    const reversed = [...timeFilteredFeedbacks].reverse()

    reversed.forEach(f => {
      if (!f.created_at || typeof f.rating !== 'number') return
      const dateStr = new Date(f.created_at).toLocaleDateString([], { month: 'short', day: 'numeric' })
      if (!dailyAvg[dateStr]) dailyAvg[dateStr] = { sum: 0, count: 0, critical: 0 }
      dailyAvg[dateStr].sum += f.rating
      dailyAvg[dateStr].count += 1
      if (f.ai_severity === 3) dailyAvg[dateStr].critical += 1
    })

    return Object.keys(dailyAvg).map(date => ({
      date,
      rating: +(dailyAvg[date].sum / dailyAvg[date].count).toFixed(1),
      critical: dailyAvg[date].critical
    }))
  }, [timeFilteredFeedbacks])

  // High Level Stats
  const stats = useMemo(() => {
    const total = timeFilteredFeedbacks.length
    if (total === 0) return { average: 0, total: 0, critical: 0, unresolved: 0 }

    const sum = timeFilteredFeedbacks.reduce((acc, curr) => acc + (curr.rating || 0), 0)
    const average = (sum / total).toFixed(1)
    const critical = timeFilteredFeedbacks.filter((f) => f.ai_severity === 3).length
    const unresolved = timeFilteredFeedbacks.filter((f) => f.ai_severity === 3 && !f.is_resolved).length

    return { average, total, critical, unresolved }
  }, [timeFilteredFeedbacks])

  if (!messId) {
    return (
      <div className="min-h-screen relative overflow-hidden bg-slate-50 flex items-center justify-center p-4">
        <div className="absolute top-[-20%] left-[-10%] w-[140%] h-[140%] bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-blue-100/40 via-purple-50/40 to-slate-50 animate-slow-pulse pointer-events-none" />
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="glass-panel p-8 max-w-md text-center rounded-3xl relative z-10"
        >
          <p className="text-slate-700 text-lg font-medium mb-4">
            No Mess ID provided.
          </p>
          <Link
            to="/"
            className="text-sm px-5 py-2.5 rounded-full bg-white/80 border border-slate-200 text-slate-700 hover:text-slate-900 hover:bg-slate-50 transition-all font-medium shadow-sm"
          >
            ← Go to form
          </Link>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="min-h-screen relative overflow-hidden bg-slate-50 p-4 md:p-10">
      <div className="absolute top-[-20%] left-[-10%] w-[140%] h-[140%] bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-blue-100/40 via-purple-50/40 to-slate-50 animate-slow-pulse pointer-events-none" />

      <div className="relative z-10 max-w-7xl mx-auto space-y-8">

        {/* Header Options */}
        <div className="flex flex-col md:flex-row items-baseline md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-slate-900 tracking-tight">
              Command Center
            </h1>
            <p className="text-slate-500 text-sm mt-1">
              Analyzing insights for Mess: <span className="font-semibold text-purple-600">{messId}</span>
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* Date Range Selector */}
            <div className="relative">
              <select
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value)}
                className="appearance-none pl-10 pr-8 py-2.5 rounded-full bg-white/80 border border-slate-200 text-slate-700 text-sm font-medium hover:bg-white transition cursor-pointer outline-none focus:ring-2 focus:ring-purple-500/50 shadow-sm"
              >
                {DATE_RANGES.map(r => (
                  <option key={r} value={r} className="bg-white text-slate-900">
                    {r}
                  </option>
                ))}
              </select>
              <Calendar className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
              <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 text-[10px]">▼</div>
            </div>

            {/* Menu Updater Link */}
            <Link
              to={`/upload-menu?mess=${messId}`}
              className="text-sm font-medium px-5 py-2.5 rounded-full bg-slate-900 text-white hover:bg-slate-800 transition shadow-md shadow-slate-900/10"
            >
              Menu Manager →
            </Link>
          </div>
        </div>

        {/* Action Highlights */}
        {stats.unresolved > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-4 rounded-2xl bg-red-50 border border-red-100 flex gap-4 items-center shadow-sm"
          >
            <AlertTriangle className="text-red-500 w-6 h-6 flex-shrink-0" />
            <div>
              <h3 className="text-red-800 font-bold mb-0 text-sm">Attention Required</h3>
              <p className="text-red-600/90 text-sm m-0">You have {stats.unresolved} unresolved critical hygiene/health complaints in this timeframe.</p>
            </div>
          </motion.div>
        )}

        {/* Top Analytics row */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="lg:col-span-3 glass-panel rounded-3xl p-8 h-[320px] flex flex-col hide-scrollbar">
            <h3 className="text-slate-800 font-bold mb-6 text-sm flex items-center justify-between uppercase tracking-wider">
              Average Rating Trend
              <span className="text-xs text-slate-400 font-medium capitalize normal-case">({dateRange})</span>
            </h3>

            <div className="flex-1 w-full min-h-0">
              {chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <defs>
                      <linearGradient id="colorRating" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                    <XAxis dataKey="date" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} dy={10} />
                    <YAxis domain={[0, 5]} stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} width={30} dx={-10} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '16px', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                      itemStyle={{ color: '#0f172a', fontWeight: 'bold' }}
                    />
                    <Line type="monotone" dataKey="rating" stroke="#8B5CF6" strokeWidth={3} dot={{ r: 4, fill: '#ffffff', stroke: '#8B5CF6', strokeWidth: 2 }} activeDot={{ r: 6, strokeWidth: 0, fill: '#6366F1' }} />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="w-full h-full flex items-center justify-center text-slate-400 text-sm font-medium">Not enough data to plot trend</div>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-6">
            <div className="glass-panel rounded-3xl p-6 flex-1 flex flex-col justify-center transition-transform hover:-translate-y-1">
              <p className="text-slate-500 text-xs font-bold mb-1 uppercase tracking-wider">Global Average</p>
              <div className="flex items-baseline gap-2">
                <p className="text-5xl font-extrabold text-slate-900 tracking-tighter">{stats.average}</p>
                <span className="text-yellow-400 text-2xl">★</span>
              </div>
            </div>

            <div className="glass-panel rounded-3xl p-6 flex-1 flex flex-col justify-center transition-transform hover:-translate-y-1 border-purple-200/50 shadow-purple-500/5 hover:shadow-purple-500/20 relative overflow-hidden group">
              <div className="absolute -inset-x-0 -bottom-0 h-1/2 bg-gradient-to-t from-purple-100/50 to-transparent pointer-events-none" />
              <p className="text-purple-600 text-xs font-bold mb-3 uppercase tracking-wider relative">Top Concerns</p>
              <div className="space-y-2 relative">
                {tagStats.length > 0 ? tagStats.map(([tag, count]) => (
                  <div key={tag} className="flex justify-between items-center text-sm">
                    <span className="text-slate-700 font-medium">{tag}</span>
                    <span className="bg-purple-100 text-purple-700 px-2 py-0.5 rounded-md font-bold text-xs">{count}</span>
                  </div>
                )) : (
                  <span className="text-slate-400 text-sm">No tags logged</span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════ */}
        {/* SECTION 1: Suggestions (aggregated from all meals)     */}
        {/* ═══════════════════════════════════════════════════════ */}
        <div>
          <div className="bg-white/80 backdrop-blur-xl border border-white/60 p-6 rounded-3xl shadow-sm">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 bg-gradient-to-br from-sky-500 to-indigo-600 rounded-2xl text-white shadow-lg">
                <Lightbulb className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-800">Suggestions</h3>
                <p className="text-sm text-slate-500 font-medium tracking-wide">
                  Student recommendations aggregated from {groupedMeals.length} meal sessions
                </p>
              </div>
            </div>

            {anyMealLoading && groupedMeals.length > 0 ? (
              <div className="flex items-center justify-center gap-3 py-8 text-indigo-500 font-medium">
                <Loader2 className="w-5 h-5 animate-spin" />
                Analyzing meal sessions...
              </div>
            ) : aggregatedSuggestions.length > 0 ? (
              <ul className="space-y-3">
                {aggregatedSuggestions.map((sug, i) => (
                  <li key={i} className="text-sm text-slate-700 font-medium flex items-start gap-3 p-3 rounded-xl bg-indigo-50/50 border border-indigo-100/60">
                    <span className="text-indigo-500 mt-0.5 text-lg">💡</span> {sug}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-slate-500 italic py-4">No suggestions extracted for this timeframe.</p>
            )}
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════ */}
        {/* SECTION 2: Issues (aggregated from all meals)          */}
        {/* ═══════════════════════════════════════════════════════ */}
        <div>
          <div className="bg-white/80 backdrop-blur-xl border border-white/60 p-6 rounded-3xl shadow-sm relative overflow-hidden">
            <div className="absolute top-0 left-0 w-1.5 h-full bg-gradient-to-b from-red-400 to-amber-400"></div>
            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 bg-gradient-to-br from-red-500 to-amber-500 rounded-2xl text-white shadow-lg">
                <ListTodo className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-800">Issues</h3>
                <p className="text-sm text-slate-500 font-medium tracking-wide">
                  Actionable issues requiring resolution
                </p>
              </div>
            </div>

            {anyMealLoading && groupedMeals.length > 0 ? (
              <div className="flex items-center justify-center gap-3 py-8 text-red-500 font-medium">
                <Loader2 className="w-5 h-5 animate-spin" />
                Identifying critical issues...
              </div>
            ) : aggregatedTodos.length > 0 ? (
              <div className="space-y-3">
                {aggregatedTodos.map((todo, i) => {
                  const linkedIds = todo.linked_records || []
                  const isResolved = linkedIds.length > 0 && linkedIds.every(id => {
                    const f = feedbacks.find(x => x.id === id)
                    return f ? f.is_resolved : true
                  })
                  return (
                    <div key={i} className={`flex items-start gap-3 p-4 rounded-xl border ${isResolved ? 'bg-emerald-50 border-emerald-100' : 'bg-slate-50 border-slate-200'} transition-all hover:shadow-sm`}>
                      <button
                        onClick={() => toggleAbstractTodo(linkedIds, isResolved)}
                        className={`mt-0.5 flex-shrink-0 cursor-pointer transition-colors ${isResolved ? 'text-emerald-500 hover:text-emerald-600' : 'text-slate-400 hover:text-slate-600'}`}
                      >
                        {isResolved ? <CheckCircle2 className="w-5 h-5" /> : <Circle className="w-5 h-5" />}
                      </button>
                      <div className="flex-1">
                        <p className={`text-sm font-semibold ${isResolved ? 'text-emerald-800 line-through opacity-70' : 'text-slate-800'}`}>
                          {todo.issue}
                        </p>
                        <div className="flex flex-wrap gap-2 items-center mt-2">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${todo.severity === 3 ? 'bg-red-100 text-red-700 border border-red-200' : todo.severity === 2 ? 'bg-amber-100 text-amber-700 border border-amber-200' : 'bg-slate-200 text-slate-700 border border-slate-300'}`}>
                            Severity {todo.severity}
                          </span>
                          <span className="text-[10px] text-slate-500 font-bold bg-white border border-slate-200 px-2 py-0.5 rounded-md shadow-sm">
                            {linkedIds.length} Linked
                          </span>
                          <span className="text-[10px] text-purple-600 font-bold bg-purple-50 border border-purple-100 px-2 py-0.5 rounded-md">
                            {todo.source}
                          </span>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <p className="text-sm text-slate-500 italic py-4">No critical issues detected in this timeframe.</p>
            )}
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2 pt-4">
          <span className="text-slate-500 text-sm font-medium mr-2 invisible md:visible uppercase tracking-wider">Meal Filter</span>
          {FILTERS.map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-5 py-2 rounded-full text-sm font-semibold transition-all cursor-pointer ${filter === f
                ? 'bg-slate-900 text-white shadow-md shadow-slate-900/20'
                : 'bg-white/80 border border-slate-200 text-slate-500 hover:text-slate-900 hover:bg-white shadow-sm hover:shadow'
                }`}
            >
              {f}
            </button>
          ))}
        </div>

        {/* Meal Session Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4">
          {loading ? (
            <div className="md:col-span-2 text-center p-12 text-slate-400 font-medium">Loading Insights...</div>
          ) : groupedMeals.length === 0 ? (
            <div className="md:col-span-2 text-center p-12 text-slate-400 font-medium">No meal sessions match the selected timeframe.</div>
          ) : (
            groupedMeals.map(meal => (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{ duration: 0.5, ease: "easeOut" }}
                key={meal.id}
                className="glass-panel transition-all duration-300 hover:shadow-2xl hover:-translate-y-1 hover:shadow-purple-500/10 rounded-3xl p-8 flex flex-col"
              >
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <h3 className="text-2xl font-black text-slate-900 tracking-tight">{meal.mealSlot}</h3>
                    <p className="text-sm text-slate-500 font-medium">{meal.dateStr}</p>
                  </div>
                  <div className="text-right">
                    <div className="flex items-baseline gap-1 justify-end">
                      <span className="text-3xl font-extrabold text-slate-900 tracking-tighter">{meal.avg}</span>
                      <span className="text-yellow-400 text-xl">★</span>
                    </div>
                    <p className="text-xs text-slate-500 font-medium mt-1">{meal.feedbacks.length} submissions</p>
                  </div>
                </div>

                {meal.unresolved > 0 && (
                  <div className="mb-6 text-xs font-bold text-red-600 bg-red-50 border border-red-200 px-3 py-2 rounded-xl inline-flex items-center gap-2 self-start shadow-sm">
                    <AlertTriangle className="w-4 h-4" />
                    {meal.unresolved} Unresolved Critical {meal.unresolved === 1 ? 'Issue' : 'Issues'}
                  </div>
                )}

                <div className="mb-8 flex-1">
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-2">Major Concerns</p>
                  <div className="flex flex-wrap gap-2">
                    {meal.topTags.length > 0 ? meal.topTags.map(([tag, count]) => (
                      <span key={tag} className="text-xs px-3 py-1.5 rounded-md bg-slate-100 text-slate-700 font-medium border border-slate-200">
                        {tag} <span className="text-slate-400 ml-1">({count})</span>
                      </span>
                    )) : <span className="text-xs text-slate-400 italic">No specific complaints matched</span>}
                  </div>
                </div>

                <div className="mt-auto pt-6 border-t border-slate-200/60">
                  {aiSummaries[meal.id] ? (
                    <div className="bg-purple-50/80 border border-purple-100 rounded-2xl p-5 shadow-sm">
                      <p className="text-sm text-slate-800 leading-relaxed font-medium">
                        <Sparkles className="w-4 h-4 inline-block mr-2 mb-0.5 text-purple-500" />
                        {typeof aiSummaries[meal.id] === 'string' ? aiSummaries[meal.id] : aiSummaries[meal.id].summary}
                      </p>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center gap-2 py-4 text-purple-500/70 font-medium text-sm animate-pulse">
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Generating venue summary...
                    </div>
                  )}
                </div>
              </motion.div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}

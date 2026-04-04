import { useState, useEffect } from 'react'
// eslint-disable-next-line no-unused-vars
import { motion } from 'framer-motion'
import { supabase } from '../lib/supabase'
import { Link, useSearchParams } from 'react-router-dom'
import * as XLSX from 'xlsx'
import { formatMenuViaAI } from '../lib/openai'

export default function UploadMenu() {
  const [searchParams] = useSearchParams()
  const queryMess = searchParams.get('mess')

  const [messId, setMessId] = useState(queryMess || '')

  // menus holds data for week 1 and week 2
  const [menus, setMenus] = useState({ 1: null, 2: null })

  // editing state for each card
  const [editing, setEditing] = useState({ 1: false, 2: false })
  const [editJson, setEditJson] = useState({ 1: '', 2: '' })
  const [loading, setLoading] = useState(false)
  const [statusMsg, setStatusMsg] = useState(null)

  const handleExcelUpload = async (e, weekNum) => {
    const file = e.target.files?.[0]
    if (!file) return
    setLoading(true)
    setStatusMsg({ type: 'success', msg: 'Reading Excel file and consulting AI...' })
    try {
      const arrayBuffer = await file.arrayBuffer()
      const workbook = XLSX.read(arrayBuffer, { type: 'array' })
      const firstSheetName = workbook.SheetNames[0]
      const worksheet = workbook.Sheets[firstSheetName]
      const rawJson = XLSX.utils.sheet_to_json(worksheet, { header: 1 })

      const aiFormattedData = await formatMenuViaAI(rawJson)

      setEditJson(prev => ({ ...prev, [weekNum]: JSON.stringify(aiFormattedData, null, 2) }))
      setEditing(prev => ({ ...prev, [weekNum]: true }))
      setStatusMsg({ type: 'success', msg: 'Excel processed by AI! Review the JSON and save.' })
    } catch (err) {
      console.error(err)
      setStatusMsg({ type: 'error', msg: 'Failed to extract or format Excel data.' })
    } finally {
      setLoading(false)
      e.target.value = null
    }
  }

  const fetchMenus = async () => {
    if (!messId) {
      setMenus({ 1: null, 2: null })
      return
    }
    const { data } = await supabase
      .from('menus')
      .select('id, week_number, menu_data, is_active')
      .eq('mess_id', messId)

    const updated = { 1: null, 2: null }
    if (data) {
      data.forEach(m => {
        if (m.week_number === 1 || m.week_number === 2) {
          updated[m.week_number] = m
        }
      })
    }
    setMenus(updated)
  }

  useEffect(() => {
    fetchMenus()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messId])

  const handleSetActive = async (weekNum) => {
    setLoading(true)
    setStatusMsg(null)
    try {
      // set all to false first
      await supabase.from('menus').update({ is_active: false }).eq('mess_id', messId)
      // set target to true
      const target = menus[weekNum]
      if (target && target.id) {
        await supabase.from('menus').update({ is_active: true }).eq('id', target.id)
      }
      await fetchMenus()
    } catch (err) {
      console.error(err)
      setStatusMsg({ type: 'error', msg: 'Failed to update active state.' })
    } finally {
      setLoading(false)
    }
  }

  const handleEditClick = (weekNum) => {
    const existing = menus[weekNum]
    const defaultStr = existing && existing.menu_data && Object.keys(existing.menu_data).length > 0
      ? JSON.stringify(existing.menu_data, null, 2)
      : '{\n  "Monday": {\n    "Breakfast": ["Poha", "Tea"],\n    "Lunch": ["Dal", "Rice"]\n  }\n}'
    setEditJson(prev => ({ ...prev, [weekNum]: defaultStr }))
    setEditing(prev => ({ ...prev, [weekNum]: true }))
  }

  const handleSave = async (weekNum) => {
    setStatusMsg(null)
    const rawText = editJson[weekNum]
    let parsed = {}
    try {
      parsed = JSON.parse(rawText || '{}')
    } catch {
      // eslint-disable-next-line no-unused-vars
      setStatusMsg({ type: 'error', msg: 'Invalid JSON format. Please check your syntax.' })
      return
    }

    setLoading(true)
    try {
      const isEmptyMenu = (m) => !m || !m.menu_data || Object.keys(m.menu_data).length === 0
      const bothWereEmpty = isEmptyMenu(menus[1]) && isEmptyMenu(menus[2])
      const isClearing = Object.keys(parsed).length === 0

      // Automatically set active if both weeks were totally empty and we are now inserting valid data
      const shouldBeActive = bothWereEmpty && !isClearing

      const existing = menus[weekNum]
      if (existing && existing.id) {
        await supabase.from('menus').update({
          menu_data: parsed,
          ...(shouldBeActive ? { is_active: true } : {})
        }).eq('id', existing.id)
      } else {
        await supabase.from('menus').insert({
          mess_id: messId,
          week_number: weekNum,
          menu_data: parsed,
          is_active: shouldBeActive
        })
      }
      setEditing(prev => ({ ...prev, [weekNum]: false }))
      await fetchMenus()
      setStatusMsg({ type: 'success', msg: `Week ${weekNum} menu saved successfully.` })
    } catch (err) {
      console.error(err)
      setStatusMsg({ type: 'error', msg: 'Failed to save menu to database.' })
    } finally {
      setLoading(false)
    }
  }

  const renderCard = (weekNum, title) => {
    const menu = menus[weekNum]
    // Determine state: Add Menu, Active, Next
    const isEmpty = !menu || !menu.menu_data || Object.keys(menu.menu_data).length === 0
    const isActive = menu?.is_active

    let badge = null
    if (isEmpty) {
      badge = <span className="text-[10px] px-2 py-0.5 rounded border border-slate-500 text-slate-400 font-bold uppercase tracking-wider">Add Menu</span>
    } else if (isActive) {
      badge = <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 font-bold uppercase tracking-wider">Active</span>
    } else {
      badge = <span className="text-[10px] px-2 py-0.5 rounded bg-blue-500/20 border border-blue-500/30 text-blue-400 font-bold uppercase tracking-wider">Next</span>
    }

    const isEditing = editing[weekNum]

    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-panel rounded-3xl p-8 relative flex flex-col h-full"
      >
        <div className="flex justify-between items-start mb-6">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h3 className="text-xl font-bold text-slate-900 tracking-tight">{title}</h3>
              {badge}
            </div>
            <p className="text-xs text-slate-500 font-medium">
              {isEmpty ? "Needs to be configured" : "Ready for deployment"}
            </p>
          </div>
          {!isEditing && (
            <div className="flex items-center gap-2">
              <button
                disabled={!messId || loading}
                onClick={() => document.getElementById(`excel-upload-${weekNum}`).click()}
                className="text-xs px-4 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-600 font-bold transition shadow-sm cursor-pointer disabled:opacity-50"
              >
                Upload Excel
              </button>
              <input
                type="file"
                id={`excel-upload-${weekNum}`}
                style={{ display: 'none' }}
                accept=".xlsx,.xls"
                onChange={(e) => handleExcelUpload(e, weekNum)}
              />
              <button
                disabled={!messId || loading}
                onClick={() => handleEditClick(weekNum)}
                className="text-xs px-4 py-2 rounded-xl bg-white/80 hover:bg-white border border-slate-200 text-slate-700 font-bold transition shadow-sm cursor-pointer disabled:opacity-50"
              >
                Edit Menu
              </button>
            </div>
          )}
        </div>

        {isEditing ? (
          <div className="space-y-4 flex flex-col flex-1">
            <div className="text-xs text-slate-500 mb-2 font-medium">
              <span className="text-yellow-500">⚠</span> Use standard JSON. Setting it to <code className="bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded text-slate-700">{`{}`}</code> clears the menu.
            </div>
            <textarea
              rows={12}
              className="w-full px-4 py-3 rounded-2xl bg-white/80 border border-slate-200 text-slate-800 font-mono text-xs focus:ring-2 focus:ring-purple-500/50 outline-none resize-y shadow-inner"
              value={editJson[weekNum]}
              onChange={(e) => setEditJson(prev => ({ ...prev, [weekNum]: e.target.value }))}
            />
            <div className="flex gap-3 mt-auto pt-4">
              <button
                disabled={loading}
                onClick={() => handleSave(weekNum)}
                className="flex-1 py-2.5 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-sm font-bold shadow-md shadow-purple-500/20 transition cursor-pointer disabled:opacity-50"
              >
                Save Changes
              </button>
              <button
                disabled={loading}
                onClick={() => setEditing(prev => ({ ...prev, [weekNum]: false }))}
                className="px-6 py-2.5 bg-white hover:bg-slate-50 text-slate-600 border border-slate-200 rounded-xl text-sm font-bold shadow-sm transition cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div className="mt-auto pt-6 border-t border-slate-100 flex flex-col flex-1">
            {isEmpty ? (
              <p className="text-sm text-slate-400 font-medium italic py-2 mt-auto text-center bg-slate-50 border border-slate-100 rounded-xl">Waiting for data...</p>
            ) : (
              <>
                <div className="flex-1 overflow-y-auto min-h-[150px] max-h-72 mb-6 bg-slate-50 border border-slate-200/60 rounded-2xl p-5 space-y-6 custom-scrollbar shadow-inner">
                  {Object.entries(menu.menu_data)
                    .sort((a, b) => {
                      const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
                      return days.indexOf(a[0]) - days.indexOf(b[0])
                    })
                    .map(([day, meals]) => (
                      <div key={day}>
                        <h4 className="text-sm font-extrabold text-slate-800 mb-3 pb-1.5 border-b border-slate-200 uppercase tracking-wider">{day}</h4>
                        {Object.entries(meals || {})
                          .sort((a, b) => {
                            const mealOrder = ['Breakfast', 'Lunch', 'Snacks', 'Dinner']
                            const valA = mealOrder.indexOf(a[0]) === -1 ? 99 : mealOrder.indexOf(a[0])
                            const valB = mealOrder.indexOf(b[0]) === -1 ? 99 : mealOrder.indexOf(b[0])
                            return valA - valB
                          })
                          .map(([mealName, dishes]) => (
                            <div key={mealName} className="mb-2 leading-relaxed flex items-start gap-2">
                              <span className="text-xs font-bold text-purple-600 uppercase tracking-wide pt-0.5 w-20 flex-shrink-0">{mealName}</span>
                              <span className="text-sm text-slate-600 font-medium">
                                {Array.isArray(dishes) ? dishes.join(', ') : dishes}
                              </span>
                            </div>
                          ))}
                      </div>
                    ))}
                </div>
                <div className="flex justify-end mt-auto">
                  {!isActive ? (
                    <button
                      disabled={loading}
                      onClick={() => handleSetActive(weekNum)}
                      className="flex-1 py-3 px-6 rounded-2xl bg-purple-600 hover:bg-purple-500 text-white text-sm font-bold transition shadow-lg shadow-purple-500/20 cursor-pointer disabled:opacity-50"
                    >
                      Set as Active Weekly Menu
                    </button>
                  ) : (
                    <button
                      disabled
                      className="flex-1 py-3 px-6 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-600 text-sm font-bold opacity-80 cursor-not-allowed shadow-sm"
                    >
                      Currently Running
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        )}
      </motion.div>
    )
  }

  return (
    <div className="min-h-screen relative overflow-hidden bg-slate-50 flex justify-center p-4 md:p-10">
      <div className="absolute top-[-20%] left-[-10%] w-[140%] h-[140%] bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-blue-100/40 via-purple-50/40 to-slate-50 animate-slow-pulse pointer-events-none" />
      <div className="w-full max-w-5xl relative z-10">

        {/* HEADER */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-panel rounded-3xl p-8 mb-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6"
        >
          <div>
            <h1 className="text-3xl md:text-4xl font-extrabold text-slate-900 tracking-tight">Menu Manager</h1>
            <p className="text-sm text-slate-500 font-medium mt-1">Configure your bi-weekly rotating meal plans.</p>
          </div>
          <div className="flex items-center gap-4">
            <Link to={`/admin?mess=${messId}`} className="text-sm text-slate-500 hover:text-slate-900 font-medium transition whitespace-nowrap">← Dashboard</Link>
            <div className="flex bg-white/80 border border-slate-200 rounded-full px-5 py-2 items-center gap-3 shadow-sm">
              <span className="text-xs text-slate-400 uppercase tracking-wider font-bold whitespace-nowrap">Mess ID</span>
              <input
                value={messId}
                onChange={(e) => setMessId(e.target.value)}
                readOnly={!!queryMess}
                placeholder="MESS-01"
                className="bg-transparent border-none text-slate-900 focus:outline-none w-24 text-sm font-bold"
              />
            </div>
          </div>
        </motion.div>

        {statusMsg && (
          <div className={`mb-6 p-4 rounded-xl border text-sm ${statusMsg.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
              : 'bg-red-500/10 border-red-500/20 text-red-400'
            }`}>
            {statusMsg.msg}
          </div>
        )}

        {/* CARDS */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-stretch">
          {renderCard(1, "Week 1,3 Menu")}
          {renderCard(2, "Week 2,4 Menu")}
        </div>

      </div>
    </div>
  )
}

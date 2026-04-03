import { Link } from 'react-router-dom'

const SAMPLE_FEEDBACK = [
  { id: 1, name: 'Alice', email: 'alice@example.com', message: 'Great product! Love the new features.' },
  { id: 2, name: 'Bob', email: 'bob@example.com', message: 'Could use better documentation.' },
  { id: 3, name: 'Carol', email: 'carol@example.com', message: 'The UI is clean and intuitive.' },
]

export default function AdminDashboard() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-950 to-slate-900 p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white tracking-tight">
              Admin Dashboard
            </h1>
            <p className="text-slate-400 text-sm mt-1">
              Review submitted feedback
            </p>
          </div>
          <Link
            to="/"
            className="text-sm px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-slate-300 hover:text-white hover:bg-white/10 transition"
          >
            ← Back to Form
          </Link>
        </div>

        <div className="grid gap-4">
          {SAMPLE_FEEDBACK.map((item) => (
            <div
              key={item.id}
              className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-6 hover:bg-white/[0.08] transition"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-white font-semibold">{item.name}</h2>
                  <p className="text-slate-500 text-sm">{item.email}</p>
                </div>
                <span className="text-xs px-2.5 py-1 rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/20">
                  #{item.id}
                </span>
              </div>
              <p className="mt-3 text-slate-300 text-sm leading-relaxed">
                {item.message}
              </p>
            </div>
          ))}
        </div>

        {SAMPLE_FEEDBACK.length === 0 && (
          <div className="text-center py-16 text-slate-500">
            No feedback submitted yet.
          </div>
        )}
      </div>
    </div>
  )
}

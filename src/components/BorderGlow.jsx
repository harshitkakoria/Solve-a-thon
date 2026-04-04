/**
 * BorderGlow — Interactive card with animated glowing border on hover.
 * The glow follows the mouse cursor along the card's edge.
 */
import { useRef, useState, useCallback } from 'react'

export default function BorderGlow({ children, className = '', onClick }) {
  const cardRef = useRef(null)
  const [glowPos, setGlowPos] = useState({ x: 50, y: 50 })
  const [isHovered, setIsHovered] = useState(false)

  const handleMouseMove = useCallback((e) => {
    if (!cardRef.current) return
    const rect = cardRef.current.getBoundingClientRect()
    const x = ((e.clientX - rect.left) / rect.width) * 100
    const y = ((e.clientY - rect.top) / rect.height) * 100
    setGlowPos({ x, y })
  }, [])

  return (
    <div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={onClick}
      className={`relative group cursor-pointer ${className}`}
      style={{ padding: '2px', borderRadius: '24px' }}
    >
      {/* Animated glowing border */}
      <div
        className="absolute inset-0 rounded-3xl transition-opacity duration-300"
        style={{
          opacity: isHovered ? 1 : 0,
          background: `radial-gradient(
            400px circle at ${glowPos.x}% ${glowPos.y}%,
            rgba(200, 150, 255, 1) 0%,
            rgba(99, 102, 241, 0.9) 30%,
            rgba(99, 102, 241, 0) 60%
          )`,
        }}
      />

      {/* Subtle static border glow (always visible) */}
      <div
        className="absolute inset-0 rounded-3xl opacity-30"
        style={{
          background: `linear-gradient(135deg, 
            rgba(139, 92, 246, 0.2), 
            rgba(99, 102, 241, 0.1) 50%, 
            rgba(139, 92, 246, 0.15)
          )`,
        }}
      />

      {/* Card content area */}
      <div className="relative rounded-3xl bg-slate-900/30 backdrop-blur-lg border border-white/10 h-full overflow-hidden transition-all duration-300">
        {/* Inner highlight gradient */}
        <div
          className="absolute inset-0 rounded-3xl transition-opacity duration-500"
          style={{
            opacity: isHovered ? 1 : 0,
            background: `radial-gradient(
              300px circle at ${glowPos.x}% ${glowPos.y}%,
              rgba(139, 92, 246, 0.08),
              transparent 60%
            )`,
          }}
        />
        <div className="relative z-10 h-full">
          {children}
        </div>
      </div>
    </div>
  )
}

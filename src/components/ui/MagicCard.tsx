import type { ReactNode } from 'react'
import { Pencil, Trash2, Copy, LogOut } from 'lucide-react'
import { theme } from '@/lib/theme'

interface MagicCardProps {
  title?: ReactNode
  imageUrl?: string | null
  size?: 'default' | 'compact' | 'fluid'
  onClick?: () => void
  children?: ReactNode
  badge?: ReactNode
  onEdit?: (e: React.MouseEvent) => void
  onDelete?: (e: React.MouseEvent) => void
  onDuplicate?: (e: React.MouseEvent) => void
  onLeave?: (e: React.MouseEvent) => void
  className?: string
}

export function MagicCard({ title, imageUrl, size = 'default', onClick, children, badge, onEdit, onDelete, onDuplicate, onLeave, className }: MagicCardProps) {
  const bgImage = imageUrl || '/default-bg.jpg'
  const isCompact = size === 'compact'
  const isFluid = size === 'fluid'
  const cardSizeClass = isFluid ? 'w-35 h-full' : isCompact ? 'w-48 h-72' : 'w-60 h-95'
  const titleClass = (isCompact || isFluid) ? 'text-lg' : 'text-xl'
  const contentPositionClass = (isCompact || isFluid) ? 'bottom-4 left-3 right-3' : 'bottom-10 left-8 right-8'

  return (
    <div 
      onClick={onClick}
      className={`relative ${cardSizeClass} rounded-lg cursor-pointer group transition-all duration-500 hover:-translate-y-3 hover:shadow-[0_20px_40px_rgba(55,42,132,0.6)] ${className ?? ''}`}
    >
      {/* Inner clipped layers */}
      <div className="absolute inset-0 rounded-lg overflow-hidden">
        {/* Layer 1: Background Image */}
        <div 
          className="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-105" 
          style={{ backgroundImage: `url('${bgImage}')` }} 
        />
        
        {/* Layer 2: Gradient sombre */}
        <div className="absolute inset-0" style={theme.gradientCard} />

        {/* Layer 3: Overlay SVG (Le cadre) */}
        <div 
          className="absolute inset-0 bg-contain bg-center bg-no-repeat pointer-events-none opacity-80 group-hover:opacity-100 transition-opacity" 
          style={{ backgroundImage: "url('/card-overlay.svg')" }} 
        />

        {/* Edit / Duplicate / Delete buttons */}
        {(onEdit || onDuplicate || onDelete || onLeave) && (
          <div className="absolute top-3 right-3 flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity z-10">
            {onEdit && (
              <button
                onClick={onEdit}
                className="p-1.5 rounded-full bg-white/70 backdrop-blur-sm text-violet-400/80 hover:text-violet-600 hover:bg-white transition-colors"
              >
                <Pencil className="w-3.5 h-3.5" />
              </button>
            )}
            {onDuplicate && (
              <button
                onClick={onDuplicate}
                className="p-1.5 rounded-full bg-white/70 backdrop-blur-sm text-sky-400/80 hover:text-sky-600 hover:bg-white transition-colors"
              >
                <Copy className="w-3.5 h-3.5" />
              </button>
            )}
            {onDelete && (
              <button
                onClick={onDelete}
                className="p-1.5 rounded-full bg-white/70 backdrop-blur-sm text-red-400/80 hover:text-red-600 hover:bg-white transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
            {onLeave && (
              <button
                onClick={onLeave}
                className="p-1.5 rounded-full bg-white/70 backdrop-blur-sm text-amber-500/80 hover:text-amber-700 hover:bg-white transition-colors"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        )}
        
        {/* Layer 4: Contenu */}
        <div className={`absolute ${contentPositionClass} flex flex-col justify-end`}>
          {title && (
            <h3 className={`${titleClass} font-serif text-white leading-snug tracking-wideb text-center`}>
              {title}
            </h3>
          )}
          {children && (
            <div className="mt-2">
              {children}
            </div>
          )}
        </div>
      </div>

      {/* Badge (outside overflow-hidden) */}
      {badge && (
        <div className="absolute top-0 right-2 z-30">
          {badge}
        </div>
      )}
    </div>
  )
}
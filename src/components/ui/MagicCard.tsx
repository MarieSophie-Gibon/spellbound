import type { ReactNode } from 'react'
import { Pencil, Trash2 } from 'lucide-react'
import { theme } from '@/lib/theme'

interface MagicCardProps {
  title?: ReactNode
  imageUrl?: string | null
  onClick?: () => void
  children?: ReactNode
  onEdit?: (e: React.MouseEvent) => void
  onDelete?: (e: React.MouseEvent) => void
}

export function MagicCard({ title, imageUrl, onClick, children, onEdit, onDelete }: MagicCardProps) {
  const bgImage = imageUrl || '/default-bg.jpg'

  return (
    <div 
      onClick={onClick}
      className="relative w-60 h-95 rounded-lg overflow-hidden cursor-pointer group transition-all duration-500 hover:-translate-y-3 hover:shadow-[0_20px_40px_rgba(55,42,132,0.6)]"
    >
      {/* Layer 1: Background Image */}
      <div 
        className="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-105" 
        style={{ backgroundImage: `url('${bgImage}')` }} 
      />
      
      {/* Layer 2: Gradient sombre */}
      <div className="absolute inset-0" style={theme.gradientCard} />
      
      {/* Layer 3: Overlay SVG (Le cadre) */}
      <div 
        className="absolute inset-0 bg-cover bg-center pointer-events-none opacity-80 group-hover:opacity-100 transition-opacity" 
        style={{ backgroundImage: "url('/card-overlay.svg')" }} 
      />

      {/* Edit / Delete buttons */}
      {(onEdit || onDelete) && (
        <div className="absolute top-3 right-3 flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity z-10">
          {onEdit && (
            <button
              onClick={onEdit}
              className="p-1.5 rounded-full bg-white/70 backdrop-blur-sm text-violet-400/80 hover:text-violet-600 hover:bg-white transition-colors"
            >
              <Pencil className="w-3.5 h-3.5" />
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
        </div>
      )}
      
      {/* Layer 4: Contenu */}
      <div className="absolute bottom-10 left-8 right-8 flex flex-col justify-end">
        {title && (
          <h3 className="text-xl font-serif text-white leading-snug tracking-wide">
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
  )
}
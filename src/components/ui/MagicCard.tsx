import type { ReactNode } from 'react'
import { theme } from '@/lib/theme'

interface MagicCardProps {
  title?: ReactNode
  imageUrl?: string | null
  onClick?: () => void
  children?: ReactNode
}

export function MagicCard({ title, imageUrl, onClick, children }: MagicCardProps) {
  // Image par défaut si aucune n'est fournie
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
      
      {/* Layer 4: Contenu (Titre + enfants éventuels) */}
      <div className="absolute bottom-10 left-8 right-8 flex flex-col justify-end">
        {title && (
          <h3 className="text-xl font-serif text-white leading-snug tracking-wide">
            {title}
          </h3>
        )}
        {/* Espace pour les futures stats de monstres/PJ */}
        {children && (
          <div className="mt-2">
            {children}
          </div>
        )}
      </div>
    </div>
  )
}
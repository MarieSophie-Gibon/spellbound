// import { useState } from 'react'
import { Plus, ArrowLeft, BookOpen } from 'lucide-react'
import { BookLayout } from '@/components/ui/BookLayout'

interface GrimoireProps {
  // Permettra de savoir si on ajoute un article public (Lobby) ou privé (Campagne)
  isGlobal?: boolean; 
}

export function Grimoire({ isGlobal = true }: GrimoireProps) {
  // La liste est vide pour l'instant
//   const [articles, setArticles] = useState([]);

  const sidebar = (
    <>
      {/* SOMMAIRE VIDE */}
      <div className="flex-1 overflow-y-auto p-4 flex flex-col items-center justify-center">
        <div className="flex flex-col items-center opacity-50">
          <div className="w-8 h-8 border border-white/20 rounded-full flex items-center justify-center mb-3">
            <span className="text-white/60 text-xs">✦</span>
          </div>
          <p className="text-xs text-white/70 font-light text-center italic px-4 leading-relaxed">
            Le sommaire est vierge.
          </p>
        </div>
      </div>

      {/* BOUTONS D'ACTION */}
      <div className="p-4 space-y-3 shrink-0 bg-black/10">
        <button className="w-full flex items-center justify-start px-4 gap-3 py-3 rounded-xl border border-[#E3CCCD]/30 text-white/80 hover:text-white hover:bg-white/5 transition-colors text-[13px]">
          <Plus className="w-4 h-4" />
          Ajouter un article
        </button>
        <button className="w-full flex items-center justify-start px-4 gap-3 py-3 rounded-xl border border-[#E3CCCD]/30 text-white/80 hover:text-white hover:bg-white/5 transition-colors text-[13px]">
          <ArrowLeft className="w-4 h-4" />
          <span className="flex gap-1 items-center px-1">
            <div className="w-1 h-1 rotate-45 bg-white/50" />
            <div className="w-1 h-1 rotate-45 bg-white/50" />
            <div className="w-1 h-1 rotate-45 bg-white/50" />
          </span>
          Retour
        </button>
      </div>
    </>
  )

  return (
    <BookLayout spineTitle="Grimoire" sidebar={sidebar}>
      
      {/* ZONE DE LECTURE - ÉTAT VIDE */}
      <div className="flex-1 flex flex-col items-center justify-center text-center p-10 h-full opacity-80">
        <BookOpen className="w-20 h-20 text-white/10 mb-6" />
        
        <h2 className="font-serif text-2xl text-white tracking-widest uppercase mb-3">
          {isGlobal ? "Grimoire Universel" : "Grimoire de Campagne"}
        </h2>
        
        <p className="text-sm text-slate-300/60 font-light max-w-md leading-relaxed">
          {isGlobal 
            ? "Ce grimoire global est vierge. Cliquez sur « Ajouter un article » pour forger les règles publiques de votre univers." 
            : "Ce grimoire de campagne est vierge. Les articles que vous y ajouterez seront privés par défaut."}
        </p>
      </div>

    </BookLayout>
  )
}
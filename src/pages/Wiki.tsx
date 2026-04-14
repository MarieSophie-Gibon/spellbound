import { useState } from 'react'
import { useWikiCategories, useWikiRules } from '@/hooks/useWiki'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'

export function Wiki() {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const { data: categories, isLoading: isLoadingCats } = useWikiCategories()
  const effectiveCategory = selectedCategory ?? categories?.[0] ?? null
  const { data: rules, isLoading: isLoadingRules } = useWikiRules(effectiveCategory)

  // Petite fonction utilitaire pour rendre le JSONB dynamique proprement
  const renderRuleContent = (stats: Record<string, unknown>) => {
    return Object.entries(stats).map(([key, value]) => {
      const formattedKey = key.replace(/_/g, ' ').toUpperCase()
      
      return (
        <div key={key} className="mb-4">
          <h4 className="text-amber-400/80 text-xs font-bold tracking-widest mb-2">{formattedKey}</h4>
          {typeof value === 'string' ? (
            <p className="text-slate-300 leading-relaxed text-sm">{value}</p>
          ) : Array.isArray(value) ? (
            <ul className="list-disc list-inside text-slate-300 text-sm space-y-1 pl-4">
              {value.map((item, index) => (
                <li key={index}>
                  {typeof item === 'string' ? item : JSON.stringify(item)}
                </li>
              ))}
            </ul>
          ) : typeof value === 'object' && value !== null ? (
            <div className="bg-black/20 p-3 rounded border border-white/5 space-y-2">
              {Object.entries(value).map(([subKey, subValue]) => (
                <div key={subKey} className="text-sm">
                  <span className="text-indigo-300 font-semibold">{subKey} : </span>
                  <span className="text-slate-300">{String(subValue)}</span>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      )
    })
  }

  return (
    <div className="flex h-[calc(100vh-80px)] gap-6 w-full max-w-7xl mx-auto mt-6">
      
      {/* Barre latérale des catégories */}
      <div className="w-72 flex flex-col min-h-0 bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden shadow-2xl">
        <div className="p-6 border-b border-white/10 bg-black/20">
          <h2 className="text-xl font-serif text-amber-300 tracking-wide">Archives</h2>
          <p className="text-xs text-slate-400 uppercase tracking-widest mt-1">Catégories</p>
        </div>
        
        <div className="flex-1 min-h-0">
        <ScrollArea className="h-full p-4">
          {isLoadingCats ? (
            <div className="space-y-3">
              {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-10 w-full bg-white/5" />)}
            </div>
          ) : (
            <div className="space-y-2">
              {categories?.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`w-full text-left px-4 py-3 rounded-xl transition-all duration-300 text-sm font-medium tracking-wide ${
                    effectiveCategory === cat 
                      ? 'bg-linear-to-r from-amber-500/20 to-purple-500/20 text-amber-200 border border-amber-500/30 shadow-[0_0_15px_rgba(245,158,11,0.1)]' 
                      : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          )}
        </ScrollArea>
        </div>
      </div>

      {/* Zone de contenu des règles */}
      <div className="flex-1 flex flex-col min-h-0 bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden shadow-2xl relative">
        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-[100px] pointer-events-none" />
        
        <div className="p-8 pb-4 border-b border-white/10 bg-linear-to-b from-black/40 to-transparent">
          <h1 className="text-3xl font-serif text-transparent bg-clip-text bg-linear-to-r from-slate-100 to-slate-400">
            {effectiveCategory || 'Sélectionnez une catégorie'}
          </h1>
        </div>

        <div className="flex-1 min-h-0">
        <ScrollArea className="h-full p-8">
          {isLoadingRules ? (
            <div className="space-y-4">
              {[1, 2, 3].map(i => <Skeleton key={i} className="h-16 w-full bg-white/5" />)}
            </div>
          ) : rules && rules.length > 0 ? (
            <Accordion type="single" collapsible className="w-full space-y-4">
              {rules.map((rule) => (
                <AccordionItem 
                  key={rule.id} 
                  value={rule.id} 
                  className="bg-black/40 border border-white/10 rounded-lg px-6 data-[state=open]:border-amber-500/30 data-[state=open]:bg-black/60 transition-all"
                >
                  <AccordionTrigger className="text-lg font-medium text-slate-200 hover:text-amber-200 hover:no-underline py-4">
                    {rule.name}
                  </AccordionTrigger>
                  <AccordionContent className="pt-2 pb-6 border-t border-white/5 mt-2">
                    {renderRuleContent(rule.stats)}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          ) : (
            <p className="text-slate-500 text-center mt-10 italic">Aucun manuscrit trouvé dans cette section.</p>
          )}
        </ScrollArea>
        </div>
      </div>
    </div>
  )
}
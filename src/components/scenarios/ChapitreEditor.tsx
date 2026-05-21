/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { Loader2,  Type, Quote, MapPin, Package, Search, Users, Swords } from "lucide-react";

interface ChapitreEditorProps {
  chapitreId: string;
}

export function ChapitreEditor({ chapitreId }: ChapitreEditorProps) {
  const [chapitre, setChapitre] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchChapitre = useCallback(async () => {
    setIsLoading(true);
    const { data } = await supabase
      .from("chapitres")
      .select("*")
      .eq("id", chapitreId)
      .single();
    
    if (data) setChapitre(data);
    setIsLoading(false);
  }, [chapitreId]);

  useEffect(() => {
    const initFetch = async () => {
      await fetchChapitre();
    };
    initFetch();
  }, [fetchChapitre]);

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-white/20" />
      </div>
    );
  }

  if (!chapitre) return null;

  const blocks = chapitre.content || [];

  return (
    <div className="flex-1 h-full overflow-y-auto p-8 md:p-12 scrollbar-thin scrollbar-thumb-white/10">
      <div className="max-w-4xl mx-auto space-y-8 pb-32 animate-in fade-in slide-in-from-bottom-4">
        
        {/* TITRE DU CHAPITRE */}
        <h1 className="text-4xl md:text-5xl font-serif text-white tracking-wide border-b border-white/10 pb-6">
          {chapitre.title}
        </h1>

        {/* ZONE DES BLOCS (En construction) */}
        <div className="space-y-4">
          {blocks.length === 0 ? (
            <p className="text-white/30 italic font-light text-center py-10">
              Ce chapitre est vide. Ajoutez votre premier bloc pour commencer le récit.
            </p>
          ) : (
            <div className="text-white/50 italic">
              {/* Le rendu des blocs viendra ici à l'étape suivante */}
              [ {blocks.length} bloc(s) à afficher ]
            </div>
          )}
        </div>

        {/* MENU D'AJOUT DE BLOCS (Aperçu de ce qu'on va coder) */}
        <div className="pt-8 border-t border-white/10">
          <p className="text-[10px] uppercase tracking-widest text-white/40 mb-3">Ajouter un bloc</p>
          <div className="flex flex-wrap gap-2">
            <button className="flex items-center gap-2 px-3 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-[12px] text-white/70 transition-colors">
              <Type className="w-3.5 h-3.5" /> Texte
            </button>
            <button className="flex items-center gap-2 px-3 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-[12px] text-white/70 transition-colors">
              <Quote className="w-3.5 h-3.5" /> Citation
            </button>
            <button className="flex items-center gap-2 px-3 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-[12px] text-white/70 transition-colors">
              <MapPin className="w-3.5 h-3.5 text-emerald-400" /> Lieu
            </button>
            <button className="flex items-center gap-2 px-3 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-[12px] text-white/70 transition-colors">
              <Package className="w-3.5 h-3.5 text-amber-400" /> Loot
            </button>
            <button className="flex items-center gap-2 px-3 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-[12px] text-white/70 transition-colors">
              <Search className="w-3.5 h-3.5 text-sky-400" /> Enquête
            </button>
            <button className="flex items-center gap-2 px-3 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-[12px] text-white/70 transition-colors">
              <Users className="w-3.5 h-3.5 text-violet-400" /> Rencontre PNJ
            </button>
            <button className="flex items-center gap-2 px-3 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-[12px] text-white/70 transition-colors">
              <Swords className="w-3.5 h-3.5 text-red-400" /> Rencontre Ennemi
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { 
  Loader2, Type, Quote, MapPin, Package, Search, Users, Swords, 
  Save, Trash2, GripVertical 
} from "lucide-react";

interface ChapitreEditorProps {
  chapitreId: string;
}

type BlockType = 'text' | 'quote' | 'location' | 'loot' | 'investigation' | 'npc' | 'enemy';

interface Block {
  id: string;
  type: BlockType;
  data: any;
}

export function ChapitreEditor({ chapitreId }: ChapitreEditorProps) {
  const [chapitre, setChapitre] = useState<any>(null);
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  const fetchChapitre = useCallback(async () => {
    setIsLoading(true);
    const { data } = await supabase
      .from("chapitres")
      .select("*")
      .eq("id", chapitreId)
      .single();
    
    if (data) {
      setChapitre(data);
      setBlocks(data.content || []);
      setHasChanges(false);
    }
    setIsLoading(false);
  }, [chapitreId]);

  useEffect(() => {
    fetchChapitre();
  }, [fetchChapitre]);

  const handleSave = async () => {
    if (!chapitre) return;
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from("chapitres")
        .update({ content: blocks })
        .eq("id", chapitreId);
        
      if (error) throw error;
      setHasChanges(false);
    } catch (err: any) {
      alert("Erreur lors de la sauvegarde : " + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  // --- Gestion des Blocs ---
  const addBlock = (type: BlockType) => {
    const newBlock: Block = {
      id: crypto.randomUUID(),
      type,
      data: type === 'text' ? { text: "" } : type === 'quote' ? { text: "", author: "" } : {},
    };
    setBlocks([...blocks, newBlock]);
    setHasChanges(true);
    
    // Scroll tout en bas doucement après l'ajout
    setTimeout(() => {
      window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
    }, 100);
  };

  const updateBlock = (id: string, newData: any) => {
    setBlocks(blocks.map(b => b.id === id ? { ...b, data: { ...b.data, ...newData } } : b));
    setHasChanges(true);
  };

  const removeBlock = (id: string) => {
    setBlocks(blocks.filter(b => b.id !== id));
    setHasChanges(true);
  };

  // --- Rendu des Blocs Spécifiques ---
  const renderBlock = (block: Block) => {
    switch (block.type) {
      case 'text':
        return (
          <textarea
            value={block.data.text || ""}
            onChange={(e) => updateBlock(block.id, { text: e.target.value })}
            placeholder="Commencez à écrire votre récit ici..."
            className="w-full bg-transparent text-white/80 text-[15px] leading-relaxed outline-none resize-none overflow-hidden min-h-[100px] placeholder:text-white/20"
            onInput={(e) => {
              const target = e.target as HTMLTextAreaElement;
              target.style.height = "auto";
              target.style.height = `${target.scrollHeight}px`;
            }}
          />
        );
      
      case 'quote':
        return (
          <div className="relative pl-6 py-2 border-l-4 border-[#E3CCCD]/40 bg-gradient-to-r from-[#E3CCCD]/5 to-transparent rounded-r-xl">
            <Quote className="absolute top-2 left-2 w-8 h-8 text-[#E3CCCD]/10 -z-10" />
            <textarea
              value={block.data.text || ""}
              onChange={(e) => updateBlock(block.id, { text: e.target.value })}
              placeholder="Texte de la citation (ex: description à lire aux joueurs)..."
              className="w-full bg-transparent text-[#E3CCCD]/90 font-serif text-lg leading-relaxed outline-none resize-none overflow-hidden min-h-[60px] placeholder:text-[#E3CCCD]/30"
              onInput={(e) => {
                const target = e.target as HTMLTextAreaElement;
                target.style.height = "auto";
                target.style.height = `${target.scrollHeight}px`;
              }}
            />
            <input
              type="text"
              value={block.data.author || ""}
              onChange={(e) => updateBlock(block.id, { author: e.target.value })}
              placeholder="— Source ou Orateur (optionnel)"
              className="w-full mt-2 bg-transparent text-white/40 text-sm italic outline-none placeholder:text-white/20"
            />
          </div>
        );

      default:
        return (
          <div className="p-4 border border-dashed border-white/20 rounded-xl bg-white/5 text-white/40 text-sm text-center">
            Bloc [{block.type}] en cours de construction...
          </div>
        );
    }
  };

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-white/20" />
      </div>
    );
  }

  if (!chapitre) return null;

  return (
    <div className="flex-1 flex flex-col h-full relative">
      
      {/* HEADER FIXE : Titre + Bouton Sauvegarder */}
      <div className="shrink-0 flex items-center justify-between p-6 border-b border-white/10 bg-black/20 backdrop-blur-sm z-10 sticky top-0">
        <h1 className="text-3xl font-serif text-white tracking-wide truncate pr-4">
          {chapitre.title}
        </h1>
        <button
          onClick={handleSave}
          disabled={!hasChanges || isSaving}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-all ${
            hasChanges 
              ? "bg-[#E3CCCD]/20 text-[#E3CCCD] border border-[#E3CCCD]/30 hover:bg-[#E3CCCD]/30 shadow-[0_0_15px_rgba(227,204,205,0.15)]" 
              : "bg-white/5 text-white/30 border border-white/5 cursor-not-allowed"
          }`}
        >
          <Save className="w-4 h-4" />
          {isSaving ? "Sauvegarde..." : hasChanges ? "Enregistrer" : "À jour"}
        </button>
      </div>

      {/* ZONE D'ÉDITION */}
      <div className="flex-1 overflow-y-auto p-6 md:p-12 scrollbar-thin scrollbar-thumb-white/10">
        <div className="max-w-4xl mx-auto space-y-6 pb-32 animate-in fade-in slide-in-from-bottom-4">
          
          {/* BOUCLE SUR LES BLOCS */}
          {blocks.length === 0 ? (
            <p className="text-white/30 italic font-light text-center py-10">
              Ce chapitre est vide. Ajoutez votre premier bloc pour commencer le récit.
            </p>
          ) : (
            <div className="space-y-6">
              {blocks.map((block) => (
                <div key={block.id} className="group relative flex gap-3 items-start">
                  
                  {/* Poignée de Drag & Drop + Supprimer (Visible au survol) */}
                  <div className="opacity-0 group-hover:opacity-100 flex flex-col gap-1 transition-opacity pt-1 absolute -left-10">
                    <button className="p-1.5 text-white/30 hover:text-white hover:bg-white/10 rounded cursor-grab">
                      <GripVertical className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => removeBlock(block.id)}
                      className="p-1.5 text-white/30 hover:text-red-400 hover:bg-red-400/10 rounded"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Le contenu du bloc */}
                  <div className="flex-1 min-w-0">
                    {renderBlock(block)}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* MENU D'AJOUT DE BLOCS */}
          <div className="pt-8 mt-12 border-t border-white/10">
            <p className="text-[10px] uppercase tracking-widest text-white/40 mb-4">Ajouter un bloc</p>
            <div className="flex flex-wrap gap-3">
              <button onClick={() => addBlock('text')} className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-[12px] font-medium text-white/80 transition-colors">
                <Type className="w-4 h-4" /> Texte
              </button>
              <button onClick={() => addBlock('quote')} className="flex items-center gap-2 px-4 py-2 bg-[#E3CCCD]/5 hover:bg-[#E3CCCD]/15 border border-[#E3CCCD]/20 rounded-lg text-[12px] font-medium text-[#E3CCCD]/90 transition-colors">
                <Quote className="w-4 h-4" /> Citation
              </button>
              <button onClick={() => addBlock('location')} className="flex items-center gap-2 px-4 py-2 bg-emerald-500/5 hover:bg-emerald-500/15 border border-emerald-500/20 rounded-lg text-[12px] font-medium text-emerald-400 transition-colors">
                <MapPin className="w-4 h-4" /> Lieu
              </button>
              <button onClick={() => addBlock('loot')} className="flex items-center gap-2 px-4 py-2 bg-amber-500/5 hover:bg-amber-500/15 border border-amber-500/20 rounded-lg text-[12px] font-medium text-amber-400 transition-colors">
                <Package className="w-4 h-4" /> Loot
              </button>
              <button onClick={() => addBlock('investigation')} className="flex items-center gap-2 px-4 py-2 bg-sky-500/5 hover:bg-sky-500/15 border border-sky-500/20 rounded-lg text-[12px] font-medium text-sky-400 transition-colors">
                <Search className="w-4 h-4" /> Enquête
              </button>
              <button onClick={() => addBlock('npc')} className="flex items-center gap-2 px-4 py-2 bg-violet-500/5 hover:bg-violet-500/15 border border-violet-500/20 rounded-lg text-[12px] font-medium text-violet-400 transition-colors">
                <Users className="w-4 h-4" /> PNJ
              </button>
              <button onClick={() => addBlock('enemy')} className="flex items-center gap-2 px-4 py-2 bg-red-500/5 hover:bg-red-500/15 border border-red-500/20 rounded-lg text-[12px] font-medium text-red-400 transition-colors">
                <Swords className="w-4 h-4" /> Ennemi
              </button>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
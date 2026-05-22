/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import {
  Loader2, Type, Quote, MapPin, Package, Search, Users, Swords,
  Save, Trash2, GripVertical, Image as ImageIcon, UploadCloud,
  Maximize2, Minimize2
} from "lucide-react";
import { LocationBlock } from "./blocks/LocationBlock";

interface ChapitreEditorProps {
  chapitreId: string;
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
}

type BlockType = 'text' | 'quote' | 'image' | 'location' | 'loot' | 'investigation' | 'npc' | 'enemy';

interface Block {
  id: string;
  type: BlockType;
  data: any;
}

export function ChapitreEditor({ chapitreId, isFullscreen, onToggleFullscreen }: ChapitreEditorProps) {
  const [chapitre, setChapitre] = useState<any>(null);
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // États pour le Drag & Drop
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

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
      data: type === 'text' ? { text: "" }
        : type === 'quote' ? { text: "", author: "" }
          : type === 'image' ? { url: "", caption: "" }
            : type === 'location' ? { title: "", description: "", imageUrl: "" }
              : {},
    };
    setBlocks([...blocks, newBlock]);
    setHasChanges(true);

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

  const handleImageUpload = async (file: File, blockId: string) => {
    try {
      const ext = file.name.split('.').pop();
      const path = `scenarios/${Date.now()}-${Math.random().toString(36).substring(2)}.${ext}`;
      const { error } = await supabase.storage.from("compendium").upload(path, file);
      if (error) throw error;

      const { data: urlData } = supabase.storage.from("compendium").getPublicUrl(path);
      updateBlock(blockId, { url: urlData.publicUrl });
    } catch (err: any) {
      alert("Erreur lors de l'upload : " + err.message);
    }
  };

  // --- Logique Drag & Drop ---
  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    // Permet de rendre l'élément semi-transparent pendant le drag
    setTimeout(() => {
      if (e.target instanceof HTMLElement) {
        e.target.style.opacity = '0.4';
      }
    }, 0);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault(); // Nécessaire pour autoriser le "drop"
    if (dragOverIndex !== index) {
      setDragOverIndex(index);
    }
  };

  const handleDrop = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === targetIndex) return;

    const newBlocks = [...blocks];
    const [movedBlock] = newBlocks.splice(draggedIndex, 1);
    newBlocks.splice(targetIndex, 0, movedBlock);

    setBlocks(newBlocks);
    setHasChanges(true);
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleDragEnd = (e: React.DragEvent) => {
    if (e.target instanceof HTMLElement) {
      e.target.style.opacity = '1';
    }
    setDraggedIndex(null);
    setDragOverIndex(null);
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

      case 'image':
        return (
          <div className="space-y-3">
            {block.data.url ? (
              <div className="relative group/image flex justify-center">
                <img src={block.data.url} alt="Illustration du scénario" className="max-h-[500px] rounded-xl object-contain border border-white/10" />
                <button
                  onClick={() => updateBlock(block.id, { url: "" })}
                  className="absolute top-2 right-2 p-2 bg-black/60 hover:bg-red-500/80 text-white rounded-lg opacity-0 group-hover/image:opacity-100 transition-all backdrop-blur-sm"
                  title="Supprimer l'image"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center p-10 border-2 border-dashed border-white/20 rounded-xl hover:bg-white/5 cursor-pointer transition-colors bg-black/10">
                <UploadCloud className="w-8 h-8 text-white/40 mb-3" />
                <span className="text-sm text-white/60 font-medium">Ajouter une illustration</span>
                <span className="text-xs text-white/30 mt-1">Cliquez ou glissez une image ici</span>
                <input
                  type="file"
                  className="hidden"
                  accept="image/*"
                  onChange={(e) => {
                    if (e.target.files?.[0]) handleImageUpload(e.target.files[0], block.id);
                  }}
                />
              </label>
            )}
            {block.data.url && (
              <input
                type="text"
                value={block.data.caption || ""}
                onChange={(e) => updateBlock(block.id, { caption: e.target.value })}
                placeholder="Légende de l'image (optionnelle)..."
                className="w-full bg-transparent text-center text-sm text-white/40 italic outline-none placeholder:text-white/20"
              />
            )}
          </div>
        );

      case 'location':
        return (
          <LocationBlock
            data={block.data}
            onChange={(newData) => updateBlock(block.id, newData)}
          />
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

      {/* HEADER FIXE */}
      <div className="shrink-0 flex items-center justify-between p-6 border-b border-white/10 bg-black/20 backdrop-blur-sm z-10 sticky top-0">
        <h1 className="text-3xl font-serif text-white tracking-wide truncate pr-4">
          {chapitre.title}
        </h1>

        <div className="flex items-center gap-3">
          <button
            onClick={onToggleFullscreen}
            className="p-2.5 bg-white/5 hover:bg-white/10 text-white/50 hover:text-white rounded-xl transition-colors border border-white/5"
            title={isFullscreen ? "Réduire" : "Plein écran"}
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>

          <button
            onClick={handleSave}
            disabled={!hasChanges || isSaving}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-all ${hasChanges
                ? "bg-[#E3CCCD]/20 text-[#E3CCCD] border border-[#E3CCCD]/30 hover:bg-[#E3CCCD]/30 shadow-[0_0_15px_rgba(227,204,205,0.15)]"
                : "bg-white/5 text-white/30 border border-white/5 cursor-not-allowed"
              }`}
          >
            <Save className="w-4 h-4" />
            {isSaving ? "Sauvegarde..." : hasChanges ? "Enregistrer" : "À jour"}
          </button>
        </div>
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
            <div className="space-y-4">
              {blocks.map((block, index) => (
                <div
                  key={block.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, index)}
                  onDragOver={(e) => handleDragOver(e, index)}
                  onDrop={(e) => handleDrop(e, index)}
                  onDragEnd={handleDragEnd}
                  className={`group relative flex items-start gap-1 md:gap-2 -ml-2 md:-ml-12 p-2 rounded-xl transition-colors focus-within:bg-white/[0.02] ${dragOverIndex === index
                      ? "border-t-2 border-[#E3CCCD] bg-white/[0.03]"
                      : "hover:bg-white/[0.02]"
                    }`}
                >

                  {/* Actions Rapides (Intégrées dans le bloc) */}
                  <div className="opacity-40 md:opacity-0 group-hover:opacity-100 focus-within:opacity-100 flex flex-col items-center gap-1 pt-1 w-7 md:w-10 shrink-0 transition-opacity">
                    <button className="p-1 md:p-1.5 text-white/40 hover:text-white hover:bg-white/10 rounded cursor-grab">
                      <GripVertical className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => removeBlock(block.id)}
                      className="p-1 md:p-1.5 text-white/40 hover:text-red-400 hover:bg-red-400/10 rounded"
                      title="Supprimer ce bloc"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Contenu du bloc */}
                  <div className="flex-1 min-w-0 pt-1 pointer-events-auto">
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
              <button onClick={() => addBlock('image')} className="flex items-center gap-2 px-4 py-2 bg-pink-500/5 hover:bg-pink-500/15 border border-pink-500/20 rounded-lg text-[12px] font-medium text-pink-400 transition-colors">
                <ImageIcon className="w-4 h-4" /> Image
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
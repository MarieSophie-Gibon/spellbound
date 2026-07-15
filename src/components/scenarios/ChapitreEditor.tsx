/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect, useCallback, useRef, useLayoutEffect } from "react";
import { supabase } from "@/lib/supabase";
import {
  Loader2, Type, Quote, MapPin, Package, Search, Users, Swords,
  Trash2, GripVertical, Image as ImageIcon, UploadCloud,
  Maximize2, Minimize2, CheckCircle2, Plus, CloudUpload, PenTool, Eye, Edit3, BookOpen, StickyNote,
  Bookmark, BookmarkCheck, Navigation
} from "lucide-react";
import { useGrimoirePopup } from "@/contexts/GrimoirePopupContext";
import type { PersistedCombatState } from "./combat/types";
import { LocationBlock } from "./blocks/LocationBlock";
import { LootBlock } from "./blocks/LootBlock";
import { InvestigationBlock } from "./blocks/InvestigationBlock";
import { NpcBlock } from "./blocks/NpcBlock";
import { EnemyBlock } from "./blocks/EnemyBlock";
import { MJBlock } from "./blocks/MJBlock";

interface ChapitreEditorProps {
  chapitreId: string;
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
  campaignId: string;
  completed?: boolean;
  onToggleCompleted?: () => void;
  onOpenCombatDashboard?: (chapitreId: string, enemyBlockId?: string) => void;
}

type BlockType = 'text' | 'quote' | 'image' | 'location' | 'loot' | 'investigation' | 'npc' | 'enemy' | 'mj_note';

interface Block {
  id: string;
  type: BlockType;
  data: any;
}

export function ChapitreEditor({ chapitreId, isFullscreen, onToggleFullscreen, campaignId, completed, onToggleCompleted, onOpenCombatDashboard }: ChapitreEditorProps) {
  const { openPopup } = useGrimoirePopup();
  const [chapitre, setChapitre] = useState<any>(null);
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // États d'édition et sauvegarde
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Menu d'ajout volant (Side Tab)
  const [isAddMenuOpen, setIsAddMenuOpen] = useState(false);

  // Repères (bookmarks)
  const [isReperesOpen, setIsReperesOpen] = useState(false);
  const blockRefsMap = useRef<Record<string, HTMLDivElement | null>>({});

  const getRepereLabel = (block: Block): string => {
    switch (block.type) {
      case 'location': return block.data?.title?.trim() || 'Lieu sans titre';
      case 'npc': return block.data?.nom?.trim() || 'PNJ sans nom';
      case 'enemy': return block.data?.nom?.trim() || 'Ennemi sans nom';
      case 'investigation': return block.data?.title?.trim() || 'Enquête sans titre';
      case 'loot': return block.data?.text?.trim()?.slice(0, 40) || 'Trésor';
      case 'text': return (block.data?.text?.trim() || '').slice(0, 40) || 'Texte';
      case 'quote': return (block.data?.text?.trim() || '').slice(0, 40) || 'Citation';
      default: return block.type;
    }
  };

  const scrollToBlock = (blockId: string) => {
    const el = blockRefsMap.current[blockId];
    if (el && scrollContainerRef.current) {
      const containerTop = scrollContainerRef.current.getBoundingClientRect().top;
      const elTop = el.getBoundingClientRect().top;
      scrollContainerRef.current.scrollBy({ top: elTop - containerTop - 80, behavior: 'smooth' });
    }
    setIsReperesOpen(false);
  };

  const toggleRepere = (blockId: string) => {
    updateBlock(blockId, { isRepere: !blocks.find(b => b.id === blockId)?.data?.isRepere });
  };

  const reperes = blocks.filter(b => b.data?.isRepere && b.type !== 'mj_note');

  // États pour le Drag & Drop
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [draggedBlockId, setDraggedBlockId] = useState<string | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  // Pour défiler automatiquement vers le nouveau bloc
  const bottomRef = useRef<HTMLDivElement>(null);
  const editorContentRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const preInputScrollTopRef = useRef<number | null>(null);
  const scrollRestoreRef = useRef<number | null>(null);

  // Restaure le scroll AVANT le repaint (useLayoutEffect) pour éviter tout saut visuel
  useLayoutEffect(() => {
    if (scrollRestoreRef.current !== null && scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = scrollRestoreRef.current;
      scrollRestoreRef.current = null;
    }
  }, [blocks]);

  // --- Chargement initial ---
  const fetchChapitre = useCallback(async () => {
    setIsLoading(true);
    const { data } = await supabase
      .from("chapitres")
      .select("*")
      .eq("id", chapitreId)
      .single();

    if (data) {
      setChapitre(data);
      const loadedBlocks = data.content || [];
      setBlocks(loadedBlocks);
      setHasChanges(false);
      // Si le chapitre est vide, on passe direct en édition
      setIsEditing(loadedBlocks.length === 0);
    }
    setIsLoading(false);
  }, [chapitreId]);

  useEffect(() => {
    fetchChapitre();
  }, [fetchChapitre]);

  // --- Sauvegarde Automatique (Auto-save) ---
  const handleSave = useCallback(async (currentBlocks: Block[], combatStateOverride?: PersistedCombatState) => {
    if (!chapitreId) return;
    setIsSaving(true);
    setSaveError(null);
    try {
      const payload = combatStateOverride
        ? { content: currentBlocks, combat_state: combatStateOverride }
        : { content: currentBlocks };
      const { error } = await supabase
        .from("chapitres")
        .update(payload)
        .eq("id", chapitreId);

      if (error) throw error;
      setHasChanges(false);
      setLastSaved(new Date());
    } catch (err: any) {
      const message = err?.message ?? "Erreur inconnue";
      console.error("Erreur auto-save :", message, err);
      setSaveError(message);
    } finally {
      setIsSaving(false);
    }
  }, [chapitreId]);

  // Déclencheur Auto-save avec Debounce (2 secondes après dernière modif)
  useEffect(() => {
    if (hasChanges && isEditing) {
      const timer = setTimeout(() => {
        handleSave(blocks);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [blocks, hasChanges, isEditing, handleSave]);

  useEffect(() => {
    if (isEditing) return;
    const frame = requestAnimationFrame(() => {
      const textareas = editorContentRef.current?.querySelectorAll("textarea") || [];
      textareas.forEach((textarea) => {
        const target = textarea as HTMLTextAreaElement;
        target.style.height = "auto";
        target.style.height = `${target.scrollHeight}px`;
      });
    });

    return () => cancelAnimationFrame(frame);
  }, [isEditing, chapitreId, blocks]);

  useEffect(() => {
    if (!isEditing) return;
    const frame = requestAnimationFrame(() => {
      const textareas = editorContentRef.current?.querySelectorAll("textarea") || [];
      textareas.forEach((textarea) => {
        const target = textarea as HTMLTextAreaElement;
        target.style.height = "auto";
        target.style.height = `${target.scrollHeight}px`;
      });
    });

    return () => cancelAnimationFrame(frame);
  }, [isEditing, chapitreId]);

  // --- Bascule Lecture / Édition ---
  const toggleMode = (forceEdit?: boolean) => {
    const newMode = forceEdit !== undefined ? forceEdit : !isEditing;
    if (!newMode && hasChanges) {
      handleSave(blocks); // Force la sauvegarde avant de repasser en lecture
    }
    setIsEditing(newMode);
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
        : type === 'loot' ? { text: "", items: [] }
        : type === 'investigation' ? { title: "", description: "", stat: "PER", dd: 10, success: "", failure: "" }
        : type === 'npc' ? { npcId: undefined, nom: undefined, imageUrl: undefined }
        : type === 'enemy' ? { enemyId: undefined, nom: undefined, imageUrl: undefined }
        : type === 'mj_note' ? { session: "", note: "", anchorBlockId: "", position: "below" }
        : {},
    };
    setBlocks([...blocks, newBlock]);
    setHasChanges(true);
    setIsAddMenuOpen(false);

    setTimeout(() => {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  const updateBlock = (id: string, newData: any) => {
    scrollRestoreRef.current = scrollContainerRef.current?.scrollTop ?? null;
    setBlocks((prev) => prev.map((b) => (b.id === id ? { ...b, data: { ...b.data, ...newData } } : b)));
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

  const preserveScrollOnChange = (fn: () => void) => {
    const savedTop = scrollContainerRef.current?.scrollTop ?? null;
    fn();
    requestAnimationFrame(() => {
      if (savedTop !== null && scrollContainerRef.current) {
        scrollContainerRef.current.scrollTop = savedTop;
      }
    });
  };

  const resizeTextareaPreserveScroll = (target: HTMLTextAreaElement) => {
    const savedTop = scrollContainerRef.current?.scrollTop ?? 0;
    target.style.height = "auto";
    target.style.height = `${target.scrollHeight}px`;
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = savedTop;
      requestAnimationFrame(() => {
        if (scrollContainerRef.current) {
          scrollContainerRef.current.scrollTop = savedTop;
        }
      });
    }
  };

  // --- Logique Drag & Drop ---
  const handleDragStart = (e: React.DragEvent, index: number) => {
    if (!isEditing) return e.preventDefault();
    setDraggedIndex(index);
    setDraggedBlockId(blocks[index]?.id ?? null);
    setTimeout(() => {
      if (e.target instanceof HTMLElement) e.target.style.opacity = '0.4';
    }, 0);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    if (!isEditing) return;
    e.preventDefault();
    if (dragOverIndex !== index) setDragOverIndex(index);
  };

  const handleDrop = (e: React.DragEvent, targetIndex: number) => {
    if (!isEditing) return;
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === targetIndex) return;

    const sourceBlock = blocks[draggedIndex];
    const targetBlock = blocks[targetIndex];

    // Drag & drop de post-it sur un bloc pour l'attacher
    if (sourceBlock?.type === 'mj_note' && targetBlock?.type !== 'mj_note') {
      const nextBlocks = blocks.map((b) =>
        b.id === sourceBlock.id
          ? { ...b, data: { ...b.data, anchorBlockId: targetBlock.id, position: b.data?.position || 'below' } }
          : b
      );
      setBlocks(nextBlocks);
      setHasChanges(true);
      setDraggedIndex(null);
      setDraggedBlockId(null);
      setDragOverIndex(null);
      return;
    }

    const newBlocks = [...blocks];
    const [movedBlock] = newBlocks.splice(draggedIndex, 1);
    newBlocks.splice(targetIndex, 0, movedBlock);

    setBlocks(newBlocks);
    setHasChanges(true);
    setDraggedIndex(null);
    setDraggedBlockId(null);
    setDragOverIndex(null);
  };

  const handleDragEnd = (e: React.DragEvent) => {
    if (e.target instanceof HTMLElement) e.target.style.opacity = '1';
    setDraggedIndex(null);
    setDraggedBlockId(null);
    setDragOverIndex(null);
  };

  // --- Rendu des Blocs Spécifiques ---
  const renderBlock = (block: Block) => {
    switch (block.type) {
      case 'text':
        return isEditing ? (
          <textarea
            value={block.data.text || ""}
            onChange={(e) => preserveScrollOnChange(() => updateBlock(block.id, { text: e.target.value }))}
            placeholder="Commencez à écrire votre récit ici..."
            className="w-full bg-transparent text-white/80 text-[15px] leading-relaxed outline-none resize-none overflow-hidden min-h-10 placeholder:text-white/20 focus:bg-white/5 p-2 rounded transition-colors"
            onInput={(e) => {
              const target = e.target as HTMLTextAreaElement;
              resizeTextareaPreserveScroll(target);
            }}
          />
        ) : (
          <div className="w-full text-white/90 text-[15px] leading-relaxed whitespace-pre-wrap px-2 py-1">
            {block.data.text || <span className="italic text-white/30">Texte vide...</span>}
          </div>
        );

      case 'quote':
        return isEditing ? (
          <div className="relative pl-6 py-2 border-l-4 border-[#E3CCCD]/40 bg-linear-to-r from-[#E3CCCD]/5 to-transparent rounded-r-xl group/quote">
            <Quote className="absolute top-2 left-2 w-8 h-8 text-[#E3CCCD]/10 -z-10" />
            <textarea
              value={block.data.text || ""}
              onChange={(e) => preserveScrollOnChange(() => updateBlock(block.id, { text: e.target.value }))}
              placeholder="Texte de la citation (ex: description à lire aux joueurs)..."
              className="w-full bg-transparent text-[#E3CCCD]/90 font-serif text-lg leading-relaxed outline-none resize-none overflow-hidden min-h-10 placeholder:text-[#E3CCCD]/30"
              onInput={(e) => {
                const target = e.target as HTMLTextAreaElement;
                resizeTextareaPreserveScroll(target);
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
        ) : (
          <div className="relative pl-6 py-3 border-l-4 border-[#E3CCCD]/60 bg-linear-to-r from-[#E3CCCD]/10 to-transparent rounded-r-xl mb-2">
            <Quote className="absolute top-2 left-2 w-8 h-8 text-[#E3CCCD]/20 -z-10" />
            <div className="text-[#E3CCCD] font-serif text-lg leading-relaxed whitespace-pre-wrap">
              "{block.data.text}"
            </div>
            {block.data.author && (
              <div className="mt-2 text-[#E3CCCD]/50 text-sm italic">
                — {block.data.author}
              </div>
            )}
          </div>
        );

      case 'image':
        return isEditing ? (
          <div className="space-y-3">
            {block.data.url ? (
              <div className="relative group/image flex justify-center">
                <img src={block.data.url} alt="Illustration du scénario" className="max-h-125 rounded-xl object-contain border border-white/10" />
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
              <textarea
                value={block.data.caption || ""}
                onChange={(e) => updateBlock(block.id, { caption: e.target.value })}
                placeholder="Légende de l'image (optionnelle)..."
                rows={3}
                className="w-full bg-transparent text-center text-sm text-white/50 italic leading-relaxed outline-none placeholder:text-white/20 resize-none min-h-20"
              />
            )}
          </div>
        ) : (
          block.data.url && (
            <div className="flex flex-col items-center py-4">
              <img src={block.data.url} alt="Illustration" className="max-h-125 rounded-xl object-contain border border-white/10 shadow-xl" />
              {block.data.caption && (
                <p className="mt-3 text-sm text-white/60 italic leading-relaxed whitespace-pre-wrap wrap-break-word text-center max-w-3xl">
                  {block.data.caption}
                </p>
              )}
            </div>
          )
        );

      case 'location':
        return (
          <div className={!isEditing ? "pointer-events-none" : ""}>
            <LocationBlock data={block.data} onChange={(newData) => updateBlock(block.id, newData)} />
          </div>
        );
      
      case 'loot': 
        return (
          <div className={!isEditing ? "pointer-events-none opacity-90" : ""}>
            <LootBlock campaignId={campaignId} data={block.data} onChange={(newData) => updateBlock(block.id, newData)} />
          </div>
        );

      case 'investigation':
        return (
          <InvestigationBlock data={block.data} onChange={(newData) => updateBlock(block.id, newData)} isEditing={isEditing} />
        );

      case 'npc':
        return (
          <div className={!isEditing ? "pointer-events-none" : ""}>
            <NpcBlock campaignId={campaignId} data={block.data} onChange={(newData) => updateBlock(block.id, newData)} />
          </div>
        );
      
      case 'enemy':
        return (
          <div className={!isEditing ? "pointer-events-none" : ""}>
            <EnemyBlock
              blockId={block.id}
              campaignId={campaignId}
              data={block.data}
              onChange={(newData) => updateBlock(block.id, newData)}
              isEditing={isEditing}
              onOpenCombatDashboard={() => {
                const nextBlocks = blocks.map((b) => b.id === block.id ? { ...b, data: { ...b.data, combatEngaged: true } } : b);
                setBlocks(nextBlocks);
                void (async () => {
                  await handleSave(nextBlocks);

                  onOpenCombatDashboard?.(chapitreId, block.id);
                })();
              }}
            />
          </div>
        );

      case 'mj_note': {
        const anchor = blocks.find((b) => b.id === block.data?.anchorBlockId && b.type !== 'mj_note');
        const attachedToLabel = anchor
          ? `${anchor.type.toUpperCase()} - ${(anchor.data?.title || anchor.data?.nom || anchor.data?.text || "Bloc").slice(0, 36)}`
          : null;
        const pos = block.data?.position ?? "below";

        return (
          <MJBlock
            data={block.data}
            isEditing={isEditing}
            attachedToLabel={attachedToLabel}
            fullWidth={!!anchor && pos !== "right"}
            onDetach={anchor ? () => updateBlock(block.id, { anchorBlockId: "" }) : undefined}
            onChange={(newData) => updateBlock(block.id, newData)}
          />
        );
      }

        default:
        return (
          <div className="p-4 border border-dashed border-white/20 rounded-xl bg-white/5 text-white/40 text-sm text-center">
            Bloc [{block.type}] en mode lecture seule.
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
      <div className="shrink-0 flex items-center justify-between px-6 h-16 border-b border-white/10 bg-[#1E1941]/90 backdrop-blur-md z-20 sticky top-0 shadow-sm">
        
        {/* Titre et Auto-Save Côte à Côte */}
        <div className="flex items-center gap-4 min-w-0 pr-4">
          <h1 className={`text-xl md:text-2xl font-serif tracking-wide truncate leading-none transition-colors ${completed ? 'text-white/40 line-through' : 'text-white'}`}>
            {chapitre.title}
          </h1>
          
          {/* Repères — menu de navigation rapide */}
          {reperes.length > 0 && (
            <div className="relative">
              <button
                onClick={() => setIsReperesOpen(o => !o)}
                className={`hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-[11px] font-medium transition-all ${
                  isReperesOpen
                    ? 'border-amber-400/50 bg-amber-400/10 text-amber-300'
                    : 'border-white/10 bg-white/5 text-white/50 hover:text-white/80 hover:border-white/20'
                }`}
                title="Navigation rapide par repères"
              >
                <Navigation className="w-3.5 h-3.5" />
                <span>Repères</span>
                <span className="ml-0.5 text-[10px] opacity-60">({reperes.length})</span>
              </button>
              {isReperesOpen && (
                <div className="absolute top-full left-0 mt-2 w-64 bg-[#1E1941]/98 border border-amber-400/20 rounded-xl shadow-2xl py-1.5 z-50 backdrop-blur-xl">
                  <p className="px-3 py-1.5 text-[9px] uppercase tracking-widest text-amber-300/60 border-b border-white/5 mb-1">Aller à…</p>
                  {reperes.map((b) => (
                    <button
                      key={b.id}
                      onClick={() => scrollToBlock(b.id)}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-left hover:bg-amber-400/8 transition-colors text-[12px] text-white/80 hover:text-white"
                    >
                      <BookmarkCheck className="w-3.5 h-3.5 shrink-0 text-amber-400/70" />
                      <span className="truncate">{getRepereLabel(b)}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Indicateur d'Auto-Save (Pilule avec Icônes) */}
          <div className="hidden sm:flex items-center gap-2 px-2.5 py-1 rounded-full bg-black/30 border border-white/5 text-[10px] font-mono select-none">
            {saveError ? (
              <><PenTool className="w-3 h-3 text-red-400" /> <span className="text-red-300/90">Erreur sauvegarde</span></>
            ) : isSaving ? (
              <><CloudUpload className="w-3.5 h-3.5 text-sky-400 animate-pulse" /> <span className="text-white/60">Sauvegarde...</span></>
            ) : hasChanges ? (
              <><PenTool className="w-3 h-3 text-amber-400" /> <span className="text-white/60">Modifié</span></>
            ) : lastSaved ? (
              <><CheckCircle2 className="w-3 h-3 text-emerald-400" /> <span className="text-white/60">Sauvegardé</span></>
            ) : (
              <><CheckCircle2 className="w-3 h-3 text-white/20" /> <span className="text-white/30">À jour</span></>
            )}
          </div>
        </div>

        <div className="flex items-center gap-4 shrink-0">

          {/* Bouton Réalisé */}
          {onToggleCompleted && (
            <button
              onClick={onToggleCompleted}
              title={completed ? "Marquer comme non réalisé" : "Marquer comme réalisé"}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-[11px] font-medium transition-all ${
                completed
                  ? 'border-emerald-400/40 bg-emerald-400/10 text-emerald-400'
                  : 'border-white/10 bg-white/5 text-white/40 hover:border-emerald-400/30 hover:text-emerald-300'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{completed ? 'Réalisé' : 'Réalisé ?'}</span>
            </button>
          )}

          {/* SWITCH SEGMENTÉ : LECTURE / ÉDITION */}
          <div className="flex p-1 bg-black/40 rounded-lg border border-white/10">
            <button
              onClick={() => toggleMode(false)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[11px] font-medium transition-all ${
                !isEditing 
                  ? 'bg-sky-500/20 text-sky-400 shadow-sm' 
                  : 'text-white/40 hover:text-white/80 hover:bg-white/5'
              }`}
            >
              <Eye className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Lecture</span>
            </button>
            <button
              onClick={() => toggleMode(true)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[11px] font-medium transition-all ${
                isEditing 
                  ? 'bg-[#E3CCCD]/20 text-[#E3CCCD] shadow-sm' 
                  : 'text-white/40 hover:text-white/80 hover:bg-white/5'
              }`}
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Édition</span>
            </button>
          </div>

          <div className="w-px h-5 bg-white/10" />

          {/* Bouton Grimoire */}
          <button
            onClick={() => openPopup()}
            className="p-1.5 bg-white/5 hover:bg-white/10 text-white/50 hover:text-white rounded-lg transition-colors border border-white/5"
            title="Ouvrir le grimoire"
          >
            <BookOpen className="w-4 h-4" />
          </button>

          <div className="w-px h-5 bg-white/10" />

          {/* Bouton Plein Écran */}
          <button
            onClick={onToggleFullscreen}
            className="p-1.5 bg-white/5 hover:bg-white/10 text-white/50 hover:text-white rounded-lg transition-colors border border-white/5"
            title={isFullscreen ? "Quitter le plein écran" : "Plein écran"}
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* ZONE PRINCIPALE DU CHAPITRE */}
      <div
        ref={scrollContainerRef}
        data-chapitre-scroll="true"
        className="flex-1 overflow-y-auto p-6 md:p-12 scrollbar-thin scrollbar-thumb-white/10 relative"
        onKeyDownCapture={(e) => {
          const target = e.target as HTMLElement;
          const tagName = target.tagName;
          if (tagName === "TEXTAREA" || tagName === "INPUT" || target.isContentEditable) {
            preInputScrollTopRef.current = scrollContainerRef.current?.scrollTop ?? null;
            e.stopPropagation();
          }
        }}
        onInputCapture={(e) => {
          const target = e.target as HTMLElement;
          if (target.tagName !== "TEXTAREA") return;

          const expectedTop = preInputScrollTopRef.current;
          if (expectedTop === null) return;

          requestAnimationFrame(() => {
            if (scrollContainerRef.current) {
              scrollContainerRef.current.scrollTop = expectedTop;
            }
          });
        }}
      >
        <div ref={editorContentRef} className="max-w-4xl mx-auto space-y-6 pb-40 animate-in fade-in slide-in-from-bottom-4">

          {/* BOUCLE SUR LES BLOCS */}
          {blocks.length === 0 ? (
            <p className="text-white/30 italic font-light text-center py-20">
              {isEditing ? "Ce chapitre est vide. Utilisez l'onglet à droite pour ajouter votre premier bloc." : "Ce chapitre ne contient aucun récit."}
            </p>
          ) : (
            <div className="space-y-4">
              {blocks.map((block, index) => {
                const isMjNote = block.type === 'mj_note';
                const hasValidAnchor = !!block.data?.anchorBlockId && blocks.some((b) => b.id === block.data.anchorBlockId && b.type !== 'mj_note');

                if (isMjNote && hasValidAnchor) {
                  return null;
                }

                const notesAbove = blocks.filter((n) =>
                  n.type === 'mj_note' && n.data?.anchorBlockId === block.id && (n.data?.position || 'below') === 'above'
                );
                const notesRight = blocks.filter((n) =>
                  n.type === 'mj_note' && n.data?.anchorBlockId === block.id && n.data?.position === 'right'
                );
                const notesBelow = blocks.filter((n) =>
                  n.type === 'mj_note' && n.data?.anchorBlockId === block.id && (n.data?.position || 'below') === 'below'
                );

                const draggedBlock = blocks.find((b) => b.id === draggedBlockId);
                const canAttachHere = isEditing && draggedBlock?.type === 'mj_note' && block.type !== 'mj_note' && draggedBlock.id !== block.id;

                return (
                  <div
                    key={block.id}
                    ref={(el) => { blockRefsMap.current[block.id] = el; }}
                    onDragOver={(e) => handleDragOver(e, index)}
                    onDrop={(e) => handleDrop(e, index)}
                    className={`group relative flex items-start gap-1 md:gap-2 -ml-2 md:-ml-12 p-2 rounded-xl transition-colors ${
                      block.data?.isRepere ? 'ring-1 ring-amber-400/20' : ''
                    } ${
                      isEditing && dragOverIndex === index
                        ? canAttachHere
                          ? "ring-1 ring-amber-300/60 bg-amber-300/6"
                          : "border-t-2 border-[#E3CCCD] bg-white/5"
                        : ""
                    } ${isEditing ? "hover:bg-white/5 focus-within:bg-white/5" : ""}`}
                  >
                    {/* Actions Rapides (Grip, Repère & Delete) - Visibles qu'en édition */}
                    {isEditing && (
                      <div className="opacity-30 md:opacity-0 group-hover:opacity-100 focus-within:opacity-100 flex flex-col items-center gap-1 pt-1 w-7 md:w-10 shrink-0 transition-opacity">
                        <button
                          draggable
                          onDragStart={(e) => handleDragStart(e, index)}
                          onDragEnd={handleDragEnd}
                          className="p-1 md:p-1.5 text-white/40 hover:text-white hover:bg-white/10 rounded cursor-grab"
                          title="Déplacer ce bloc"
                        >
                          <GripVertical className="w-4 h-4" />
                        </button>
                        {block.type !== 'mj_note' && (
                          <button
                            onClick={() => toggleRepere(block.id)}
                            className={`p-1 md:p-1.5 rounded transition-all ${
                              block.data?.isRepere
                                ? 'text-amber-400 hover:text-amber-300 hover:bg-amber-400/10'
                                : 'text-white/40 hover:text-amber-400 hover:bg-amber-400/10'
                            }`}
                            title={block.data?.isRepere ? 'Retirer le repère' : 'Marquer comme repère'}
                          >
                            {block.data?.isRepere ? <BookmarkCheck className="w-4 h-4" /> : <Bookmark className="w-4 h-4" />}
                          </button>
                        )}
                        <button
                          onClick={() => removeBlock(block.id)}
                          className="p-1 md:p-1.5 text-white/40 hover:text-red-400 hover:bg-red-400/10 rounded"
                          title="Supprimer ce bloc"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    )}

                    {/* Wrapper factice pour compenser la largeur des actions en mode lecture */}
                    {!isEditing && <div className="w-7 md:w-10 shrink-0 hidden md:block" />}

                    {/* Contenu du bloc + post-its attachés */}
                    <div className="flex-1 min-w-0 pt-1 pointer-events-auto space-y-2">
                      {notesAbove.length > 0 && (
                        <div className="space-y-2">
                          {notesAbove.map((note) => (
                            <div key={note.id}>{renderBlock(note)}</div>
                          ))}
                        </div>
                      )}

                      {notesRight.length > 0 ? (
                        <div className="flex flex-col xl:flex-row gap-3 items-start">
                          <div className="flex-1 min-w-0">{renderBlock(block)}</div>
                          <div className="w-full xl:w-80 space-y-2 shrink-0">
                            {notesRight.map((note) => (
                              <div key={note.id}>{renderBlock(note)}</div>
                            ))}
                          </div>
                        </div>
                      ) : (
                        renderBlock(block)
                      )}

                      {notesBelow.length > 0 && (
                        <div className="space-y-2">
                          {notesBelow.map((note) => (
                            <div key={note.id}>{renderBlock(note)}</div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

            <div ref={bottomRef} className="h-10" />
        </div>
      </div>

      {/* SIDE TAB : AJOUT DE BLOCS (Uniquement en édition) */}
      {isEditing && (
        <div 
          className="absolute right-0 top-25 z-40 flex items-start"
          onMouseLeave={() => setIsAddMenuOpen(false)}
        >
          {/* Menu déroulant vers la gauche */}
          <div className={`overflow-hidden transition-all duration-300 ease-in-out ${isAddMenuOpen ? 'w-45 opacity-100 mr-2' : 'w-0 opacity-0 mr-0'}`}>
            <div className="flex flex-col bg-[#1E1941]/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl p-2 gap-1 w-45">
              <div className="px-3 py-1.5 text-[9px] uppercase tracking-widest text-[#E3CCCD]/50 border-b border-white/5 mb-1 font-bold">
                Ajouter un bloc
              </div>
              <button onClick={() => addBlock('text')} className="flex items-center gap-3 px-3 py-2 hover:bg-white/5 rounded-xl text-[12px] text-white/80 transition-colors w-full text-left">
                <Type className="w-4 h-4 text-white/40" /> Texte
              </button>
              <button onClick={() => addBlock('quote')} className="flex items-center gap-3 px-3 py-2 hover:bg-[#E3CCCD]/10 rounded-xl text-[12px] text-[#E3CCCD]/90 transition-colors w-full text-left">
                <Quote className="w-4 h-4 text-[#E3CCCD]/50" /> Citation
              </button>
              <button onClick={() => addBlock('image')} className="flex items-center gap-3 px-3 py-2 hover:bg-pink-500/10 rounded-xl text-[12px] text-pink-300 transition-colors w-full text-left">
                <ImageIcon className="w-4 h-4 text-pink-400/50" /> Image
              </button>
              <button onClick={() => addBlock('location')} className="flex items-center gap-3 px-3 py-2 hover:bg-emerald-500/10 rounded-xl text-[12px] text-emerald-300 transition-colors w-full text-left">
                <MapPin className="w-4 h-4 text-emerald-400/50" /> Lieu
              </button>
              <button onClick={() => addBlock('loot')} className="flex items-center gap-3 px-3 py-2 hover:bg-amber-500/10 rounded-xl text-[12px] text-amber-300 transition-colors w-full text-left">
                <Package className="w-4 h-4 text-amber-400/50" /> Trésor / Loot
              </button>
              <button onClick={() => addBlock('investigation')} className="flex items-center gap-3 px-3 py-2 hover:bg-sky-500/10 rounded-xl text-[12px] text-sky-300 transition-colors w-full text-left">
                <Search className="w-4 h-4 text-sky-400/50" /> Action / Enquête
              </button>
              <div className="h-px bg-white/5 my-0.5 w-full" />
              <button onClick={() => addBlock('npc')} className="flex items-center gap-3 px-3 py-2 hover:bg-violet-500/10 rounded-xl text-[12px] text-violet-300 transition-colors w-full text-left">
                <Users className="w-4 h-4 text-violet-400/50" /> Personnage (PNJ)
              </button>
              <button onClick={() => addBlock('enemy')} className="flex items-center gap-3 px-3 py-2 hover:bg-red-500/10 rounded-xl text-[12px] text-red-300 transition-colors w-full text-left">
                <Swords className="w-4 h-4 text-red-400/50" /> Ennemi / Combat
              </button>
              <button onClick={() => addBlock('mj_note')} className="flex items-center gap-3 px-3 py-2 hover:bg-amber-500/10 rounded-xl text-[12px] text-amber-200 transition-colors w-full text-left">
                <StickyNote className="w-4 h-4 text-amber-300/70" /> Note MJ (Post-it)
              </button>
            </div>
          </div>

          {/* Onglet Déclencheur */}
          <button
            onMouseEnter={() => setIsAddMenuOpen(true)}
            onClick={() => setIsAddMenuOpen(!isAddMenuOpen)}
            className="flex items-center justify-center bg-[#E3CCCD]/10 hover:bg-[#E3CCCD]/20 border border-[#E3CCCD]/20 border-r-0 rounded-l-xl p-3 text-[#E3CCCD] transition-colors shadow-lg backdrop-blur-md"
            title="Ajouter un bloc"
          >
            <Plus className={`w-5 h-5 transition-transform duration-300 ${isAddMenuOpen ? 'rotate-45' : ''}`} />
          </button>
        </div>
      )}

    </div>
  );
}
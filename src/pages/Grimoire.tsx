/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from "react";
import {
  Plus,
  ArrowLeft,
  BookOpen,
  LayoutGrid,
  Type,
  BookmarkPlus,
  ChevronDown,
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Heading1,
  Heading2,
  List,
  ListOrdered,
  Pilcrow,
} from "lucide-react";
import { BookLayout } from "@/components/layout/BookLayout";
import {
  EditorContent,
  useEditor,
  useEditorState,
  type EditorStateSnapshot,
} from "@tiptap/react";
import type { Editor } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";

// --- 1. SÉLECTEUR D'ÉTAT (Optimisation des performances) ---
function menuBarStateSelector(ctx: EditorStateSnapshot<Editor>) {
  return {
    isBold: ctx.editor.isActive("bold") ?? false,
    canBold: ctx.editor.can().chain().toggleBold().run() ?? false,

    isItalic: ctx.editor.isActive("italic") ?? false,
    canItalic: ctx.editor.can().chain().toggleItalic().run() ?? false,

    isUnderline: ctx.editor.isActive("underline") ?? false,
    canUnderline: ctx.editor.can().chain().toggleUnderline().run() ?? false,

    isParagraph: ctx.editor.isActive("paragraph") ?? false,
    isHeading1: ctx.editor.isActive("heading", { level: 1 }) ?? false,
    isHeading2: ctx.editor.isActive("heading", { level: 2 }) ?? false,

    isBulletList: ctx.editor.isActive("bulletList") ?? false,
    isOrderedList: ctx.editor.isActive("orderedList") ?? false,
  };
}

// --- 2. NOTRE COMPOSANT BOUTON (Sorti de MenuBar pour éviter l'erreur React !) ---
const ToolbarButton = ({ onClick, isActive, disabled, icon: Icon }: any) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    className={`p-1.5 rounded-md transition-colors ${
      isActive
        ? "bg-[#E3CCCD]/20 text-white shadow-inner"
        : disabled
          ? "text-white/20 cursor-not-allowed"
          : "text-white/60 hover:text-white hover:bg-white/10"
    }`}
  >
    <Icon className="w-4 h-4" />
  </button>
);

// --- 3. LA BARRE D'OUTILS (UI avec Lucide) ---
export const MenuBar = ({ editor }: { editor: Editor }) => {
  const editorState = useEditorState({
    editor,
    selector: menuBarStateSelector,
  });

  if (!editor || !editorState) return null;

  return (
    <div className="flex items-center gap-1 p-2 border-b border-[#E3CCCD]/20 bg-black/20 shrink-0 overflow-x-auto">
      <ToolbarButton
        onClick={() => editor.chain().focus().setParagraph().run()}
        isActive={editorState.isParagraph}
        icon={Pilcrow}
      />

      <div className="w-px h-5 bg-[#E3CCCD]/20 mx-1" />

      <ToolbarButton
        onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
        isActive={editorState.isHeading1}
        icon={Heading1}
      />
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        isActive={editorState.isHeading2}
        icon={Heading2}
      />

      <div className="w-px h-5 bg-[#E3CCCD]/20 mx-1" />

      <ToolbarButton
        onClick={() => editor.chain().focus().toggleBold().run()}
        disabled={!editorState.canBold}
        isActive={editorState.isBold}
        icon={Bold}
      />
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleItalic().run()}
        disabled={!editorState.canItalic}
        isActive={editorState.isItalic}
        icon={Italic}
      />
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleUnderline().run()}
        disabled={!editorState.canUnderline}
        isActive={editorState.isUnderline}
        icon={UnderlineIcon}
      />

      <div className="w-px h-5 bg-[#E3CCCD]/20 mx-1" />

      <ToolbarButton
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        isActive={editorState.isBulletList}
        icon={List}
      />
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        isActive={editorState.isOrderedList}
        icon={ListOrdered}
      />
    </div>
  );
};

// --- 3. L'ÉDITEUR COMPLET (Englobe la barre + la zone de texte) ---
const RichTextEditor = () => {
  const editor = useEditor({
    extensions: [StarterKit, Underline],
    content: "",
    editorProps: {
      attributes: {
        class:
          "tiptap-editor min-h-full outline-none text-sm font-light text-white/90 placeholder:text-white/30 leading-relaxed pb-10",
      },
    },
  });

  return (
    <div className="flex-1 flex flex-col min-h-0 border border-[#E3CCCD]/30 rounded-lg bg-[#1E1941]/40 overflow-hidden">
      <style>{`
        .tiptap-editor p.is-editor-empty:first-child::before {
          content: 'Rédigez le savoir de cet article ici...';
          float: left;
          color: rgba(255, 255, 255, 0.3);
          pointer-events: none;
          height: 0;
        }
        .tiptap-editor h1 { display: block !important; font-family: serif !important; font-size: 1.8rem !important; color: white !important; margin-top: 1.5rem !important; margin-bottom: 0.75rem !important; font-weight: normal !important; line-height: 1.2 !important; }
        .tiptap-editor h2 { display: block !important; font-family: serif !important; font-size: 1.3rem !important; color: white !important; margin-top: 1.25rem !important; margin-bottom: 0.5rem !important; font-weight: normal !important; line-height: 1.3 !important; }
        .tiptap-editor p { display: block !important; margin-bottom: 0.75rem !important; min-height: 1rem; }
        .tiptap-editor ul { display: block !important; list-style-type: disc !important; padding-left: 1.5rem !important; margin-bottom: 1rem !important; }
        .tiptap-editor ol { display: block !important; list-style-type: decimal !important; padding-left: 1.5rem !important; margin-bottom: 1rem !important; }
        .tiptap-editor strong { font-weight: 600 !important; color: white !important; }
      `}</style>

      <MenuBar editor={editor} />

      <div className="flex-1 relative min-h-0">
        {/* Et un enfant absolu qui se cale aux bords exacts de ce parent sans jamais le pousser ! */}
        <div
          className="absolute inset-0 p-5 overflow-y-auto cursor-text"
          onClick={() => editor?.chain().focus().run()}
        >
          <EditorContent editor={editor} />
        </div>
      </div>
    </div>
  );
};

// --- 4. LA PAGE PRINCIPALE GRIMOIRE ---
interface GrimoireProps {
  isGlobal?: boolean;
  onBack: () => void;
}

export function Grimoire({ isGlobal = true, onBack }: GrimoireProps) {
  const [isCreating, setIsCreating] = useState(false);

  const sidebar = !isCreating ? (
    <>
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

      <div className="p-4 space-y-3 shrink-0 bg-black/10">
        <button
          onClick={() => setIsCreating(true)}
          className="w-full flex items-center justify-start px-3 gap-3 py-2 rounded-xl border border-[#E3CCCD]/30 text-white/80 hover:text-white hover:bg-white/5 bg-[#29206A]/40 transition-colors text-[13px]"
        >
          <Plus className="w-4 h-4" />
          Ajouter un article
        </button>
        <button
          onClick={onBack}
          className="w-full flex items-center justify-start px-3 gap-3 py-2 rounded-xl border border-transparent text-white/80 hover:text-white hover:bg-white/5 transition-colors text-[13px]"
        >
          <ArrowLeft className="w-4 h-4" />
          Retour
        </button>
      </div>
    </>
  ) : undefined;

  return (
    <BookLayout spineTitle="Grimoire" sidebar={sidebar}>
      {isCreating ? (
        <div className="flex-1 flex flex-col p-5 h-full min-h-0">
          <div className="flex-1 flex flex-col border border-[#E3CCCD]/20 rounded-xl bg-black/10 p-5 gap-3 relative">
            {/* LIGNE 1 : Sélecteurs de catégories */}
            <div className="flex gap-2 shrink-0">
              <button className="flex-1 flex items-center justify-between border border-[#E3CCCD]/30 rounded-lg px-4 py-2.5 bg-[#1E1941]/40 text-white/80 hover:bg-[#1E1941]/60 transition-colors">
                <div className="flex items-center gap-3">
                  <LayoutGrid className="w-4 h-4 text-white/60" />
                  <span className="text-[13px] font-light tracking-wide">
                    Sélectionner une catégorie
                  </span>
                </div>
                <ChevronDown className="w-4 h-4 text-white/50" />
              </button>

              <button className="flex-1 flex items-center justify-between border border-[#E3CCCD]/30 rounded-lg px-4 py-2.5 bg-[#1E1941]/40 text-white/80 hover:bg-[#1E1941]/60 transition-colors">
                <div className="flex items-center gap-3">
                  <LayoutGrid className="w-4 h-4 text-white/60" />
                  <span className="text-[13px] font-light tracking-wide">
                    Sélectionner une sous-catégorie
                  </span>
                </div>
                <ChevronDown className="w-4 h-4 text-white/50" />
              </button>
            </div>

            {/* LIGNE 2 : Titre de l'article */}
            <div className="flex items-center border border-[#E3CCCD]/30 rounded-lg px-4 py-2.5 bg-[#1E1941]/40 shrink-0">
              <Type className="w-4 h-4 text-white/60 mr-3 shrink-0" />
              <input
                type="text"
                placeholder="Ajouter un titre"
                className="flex-1 bg-transparent border-none outline-none text-[13px] font-light text-white placeholder:text-white/50"
              />
            </div>

            {/* LIGNE 3 : Notre Éditeur Riche Optimisé */}
            <RichTextEditor />

            {/* LIGNE 4 : Boutons de sauvegarde */}
            <div className="flex justify-end gap-3 pt-1 shrink-0">
              <button
                onClick={() => setIsCreating(false)}
                className="flex items-center gap-2 px-5 py-2 rounded-lg border border-transparent text-white/60 hover:text-white hover:bg-white/5 transition-colors text-[13px] font-light tracking-wide"
              >
                <ArrowLeft className="w-4 h-4" />
                Annuler
              </button>

              <button
                onClick={() => setIsCreating(false)}
                className="flex items-center gap-2 px-5 py-2 rounded-lg border border-[#E3CCCD]/40 text-white hover:bg-white/10 transition-colors text-[13px] font-light tracking-wide bg-[#29206A]/40 shadow-lg"
              >
                <BookmarkPlus className="w-4 h-4" />
                Sauvegarder
              </button>
            </div>
          </div>
        </div>
      ) : (
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
      )}
    </BookLayout>
  );
}

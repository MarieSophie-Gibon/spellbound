/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import {
  LayoutGrid, Type, BookmarkPlus, Bold, Italic, Underline as UnderlineIcon,
  Heading1, Heading2, List, ListOrdered, Pilcrow, X, Pencil, Trash2,
  AlertTriangle, Table as TableIcon, Rows, Columns,
} from "lucide-react";
import { EditorContent, useEditor, useEditorState } from "@tiptap/react";
import type { Editor } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import { Table } from "@tiptap/extension-table";
import { TableRow } from "@tiptap/extension-table-row";
import { TableCell } from "@tiptap/extension-table-cell";
import { TableHeader } from "@tiptap/extension-table-header";
import { supabase } from "@/lib/supabase";
import type { Category, WikiPage } from "@/types/grimoire";

export interface InitialPageData {
  id: string;
  title: string;
  content: string;
  categoryId: string | null;
  subCategoryId: string | null;
}

interface PageEditorProps {
  initialData?: InitialPageData;
  categories: Category[];
  pages: WikiPage[];
  campaignId?: string;
  isGlobal: boolean;
  onSaveSuccess: (expandCatId?: string, expandSubCatId?: string) => void;
  onCancel: () => void;
  onCategoriesChanged: () => void;
}

// --- TipTap helpers ---

function menuBarStateSelector(ctx: { editor: Editor }) {
  return {
    isBold: ctx.editor.isActive("bold"),
    canBold: ctx.editor.can().chain().toggleBold().run(),
    isItalic: ctx.editor.isActive("italic"),
    isUnderline: ctx.editor.isActive("underline"),
    isParagraph: ctx.editor.isActive("paragraph"),
    isHeading1: ctx.editor.isActive("heading", { level: 1 }),
    isHeading2: ctx.editor.isActive("heading", { level: 2 }),
    isBulletList: ctx.editor.isActive("bulletList"),
    isOrderedList: ctx.editor.isActive("orderedList"),
  };
}

function TableFloatingMenu({ editor }: { editor: Editor }) {
  const [visible, setVisible] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const update = () => {
      if (editor.isActive("table") && editor.isFocused) {
        const { from } = editor.state.selection;
        const coords = editor.view.coordsAtPos(from);
        setPosition({ top: coords.top - 52, left: coords.left });
        setVisible(true);
      } else {
        setVisible(false);
      }
    };
    const hide = () => setVisible(false);
    editor.on("selectionUpdate", update);
    editor.on("focus", update);
    editor.on("blur", hide);
    return () => {
      editor.off("selectionUpdate", update);
      editor.off("focus", update);
      editor.off("blur", hide);
    };
  }, [editor]);

  if (!visible) return null;

  return createPortal(
    <div
      ref={menuRef}
      style={{ position: "fixed", top: position.top, left: position.left, zIndex: 100 }}
      className="flex items-center gap-1 bg-[#1E1941]/95 border border-[#E3CCCD]/40 rounded-xl px-2 py-1.5 backdrop-blur-md shadow-2xl animate-in fade-in zoom-in duration-200"
      onMouseDown={(e) => e.preventDefault()}
    >
      <ToolbarButton onClick={() => editor.chain().focus().addRowAfter().run()} icon={Rows} />
      <ToolbarButton onClick={() => editor.chain().focus().addColumnAfter().run()} icon={Columns} />
      <div className="w-px h-4 bg-[#E3CCCD]/30 mx-1" />
      <button
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => editor.chain().focus().deleteRow().run()}
        className="p-1.5 text-white/50 hover:text-red-400 hover:bg-red-500/10 rounded-md flex items-center gap-0.5"
      >
        <Rows className="w-3.5 h-3.5" /><X className="w-3 h-3" />
      </button>
      <button
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => editor.chain().focus().deleteColumn().run()}
        className="p-1.5 text-white/50 hover:text-red-400 hover:bg-red-500/10 rounded-md flex items-center gap-0.5"
      >
        <Columns className="w-3.5 h-3.5" /><X className="w-3 h-3" />
      </button>
      <div className="w-px h-4 bg-[#E3CCCD]/30 mx-1" />
      <ToolbarButton onClick={() => editor.chain().focus().deleteTable().run()} icon={Trash2} />
    </div>,
    document.body,
  );
}

const ToolbarButton = ({ onClick, isActive, disabled, icon: Icon, title }: any) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    title={title}
    className={`p-1.5 rounded-md transition-colors ${
      isActive ? "bg-[#E3CCCD]/20 text-white shadow-inner"
      : disabled ? "text-white/20 cursor-not-allowed"
      : "text-white/60 hover:text-white hover:bg-white/10"
    }`}
  >
    <Icon className="w-4 h-4" />
  </button>
);

// --- Main component ---

export function PageEditor({
  initialData, categories, pages, campaignId, isGlobal,
  onSaveSuccess, onCancel, onCategoriesChanged,
}: PageEditorProps) {
  const [title, setTitle] = useState(initialData?.title ?? "");
  const [selectedCatId, setSelectedCatId] = useState(initialData?.categoryId ?? "");
  const [selectedSubCatId, setSelectedSubCatId] = useState(initialData?.subCategoryId ?? "");
  const [isCreatingCat, setIsCreatingCat] = useState(false);
  const [newCatName, setNewCatName] = useState("");
  const [isCreatingSubCat, setIsCreatingSubCat] = useState(false);
  const [newSubCatName, setNewSubCatName] = useState("");
  const [showTablePopup, setShowTablePopup] = useState(false);
  const [tableRows, setTableRows] = useState(3);
  const [tableCols, setTableCols] = useState(3);
  const [catToRename, setCatToRename] = useState<{ id: string; newName: string } | null>(null);
  const [catDeleteTarget, setCatDeleteTarget] = useState<string | null>(null);

  const mainCategories = categories
    .filter((c) => !c.parent_id)
    .sort((a, b) => a.position_index - b.position_index);
  const subCategories = categories
    .filter((c) => c.parent_id === selectedCatId)
    .sort((a, b) => a.position_index - b.position_index);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      Table.configure({ resizable: true }),
      TableRow,
      TableHeader,
      TableCell,
    ],
    content: initialData?.content ?? "",
    editorProps: {
      attributes: {
        class: "tiptap-editor min-h-full outline-none text-sm font-light text-white/90 placeholder:text-white/30 leading-relaxed pb-10",
      },
    },
  });

  const handleRenameCategory = async () => {
    if (!catToRename || !catToRename.newName.trim()) return;
    await supabase.from("categories").update({ name: catToRename.newName.trim() }).eq("id", catToRename.id);
    setCatToRename(null);
    onCategoriesChanged();
  };

  const handleDeleteCategory = async () => {
    if (!catDeleteTarget) return;
    const { error } = await supabase.from("categories").delete().eq("id", catDeleteTarget);
    if (error) {
      alert("Erreur: La catégorie contient probablement des éléments (vérifiez ON DELETE CASCADE dans Supabase).");
      return;
    }
    if (selectedCatId === catDeleteTarget) setSelectedCatId("");
    if (selectedSubCatId === catDeleteTarget) setSelectedSubCatId("");
    setCatDeleteTarget(null);
    onCategoriesChanged();
  };

  const handleSave = async () => {
    if (!title || !editor) return alert("Le titre est obligatoire !");
    let fCatId = selectedCatId;
    let fSubCatId = selectedSubCatId;
    try {
      if (isCreatingCat && newCatName.trim() !== "") {
        const { data: nCat } = await supabase
          .from("categories")
          .insert({ name: newCatName.trim(), parent_id: null, position_index: mainCategories.length })
          .select().single();
        fCatId = nCat.id;
      }
      if (isCreatingSubCat && newSubCatName.trim() !== "") {
        const { data: nSub } = await supabase
          .from("categories")
          .insert({ name: newSubCatName.trim(), parent_id: fCatId, position_index: subCategories.length })
          .select().single();
        fSubCatId = nSub.id;
      }
      const payload = {
        title,
        content: editor.getHTML(),
        category_id: fCatId || null,
        subcategory_id: fSubCatId || null,
        campaign_id: campaignId || null,
        is_public: isGlobal,
      };
      if (initialData?.id) {
        await supabase.from("wiki_pages").update(payload).eq("id", initialData.id);
      } else {
        await supabase.from("wiki_pages").insert({ ...payload, position_index: pages.length });
      }
      onSaveSuccess(fCatId || undefined, fSubCatId || undefined);
    } catch (err: any) {
      alert("Erreur : " + err.message);
    }
  };

  const MenuBar = ({ editor }: { editor: Editor }) => {
    const state = useEditorState({ editor, selector: menuBarStateSelector });
    if (!state) return null;
    return (
      <div className="flex items-center gap-1 p-1.5 border-b border-[#E3CCCD]/20 bg-[#1E1941] shrink-0 overflow-x-auto relative z-60">
        <ToolbarButton onClick={() => editor.chain().focus().setParagraph().run()} isActive={state.isParagraph} icon={Pilcrow} />
        <ToolbarButton onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} isActive={state.isHeading1} icon={Heading1} />
        <ToolbarButton onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} isActive={state.isHeading2} icon={Heading2} />
        <div className="w-px h-5 bg-[#E3CCCD]/20 mx-1" />
        <ToolbarButton onClick={() => editor.chain().focus().toggleBold().run()} disabled={!state.canBold} isActive={state.isBold} icon={Bold} />
        <ToolbarButton onClick={() => editor.chain().focus().toggleItalic().run()} isActive={state.isItalic} icon={Italic} />
        <ToolbarButton onClick={() => editor.chain().focus().toggleUnderline().run()} isActive={state.isUnderline} icon={UnderlineIcon} />
        <div className="w-px h-5 bg-[#E3CCCD]/20 mx-1" />
        <ToolbarButton onClick={() => editor.chain().focus().toggleBulletList().run()} isActive={state.isBulletList} icon={List} />
        <ToolbarButton onClick={() => editor.chain().focus().toggleOrderedList().run()} isActive={state.isOrderedList} icon={ListOrdered} />
        <div className="w-px h-5 bg-[#E3CCCD]/20 mx-1" />
        <ToolbarButton onClick={() => setShowTablePopup(true)} icon={TableIcon} title="Insérer un tableau" />
      </div>
    );
  };

  return (
    <>
      {/* Table popup */}
      {showTablePopup && (
        <div className="fixed inset-0 z-300 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#1E1941] border border-[#E3CCCD]/30 p-6 rounded-2xl shadow-2xl w-full max-w-70 animate-in zoom-in duration-200">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-white font-serif text-lg tracking-wide">Tableau</h3>
              <button onClick={() => setShowTablePopup(false)}><X className="w-5 h-5 text-white/40" /></button>
            </div>
            <div className="grid grid-cols-2 gap-6 mb-6">
              <div className="space-y-2">
                <label className="text-[10px] uppercase text-white/40 font-bold">Lignes</label>
                <input type="number" value={tableRows} onChange={(e) => setTableRows(parseInt(e.target.value) || 1)}
                  className="w-full bg-black/40 border border-[#E3CCCD]/20 rounded-lg p-2.5 text-white text-center outline-none focus:border-[#E3CCCD]/60" />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] uppercase text-white/40 font-bold">Colonnes</label>
                <input type="number" value={tableCols} onChange={(e) => setTableCols(parseInt(e.target.value) || 1)}
                  className="w-full bg-black/40 border border-[#E3CCCD]/20 rounded-lg p-2.5 text-white text-center outline-none focus:border-[#E3CCCD]/60" />
              </div>
            </div>
            <button
              onClick={() => {
                editor?.chain().focus().insertTable({ rows: tableRows, cols: tableCols, withHeaderRow: true }).run();
                setShowTablePopup(false);
              }}
              className="w-full py-3 bg-[#29206A] border border-[#E3CCCD]/40 rounded-xl text-white text-[13px] hover:bg-[#29206A]/80 shadow-lg"
            >
              Générer
            </button>
          </div>
        </div>
      )}

      {/* Rename category modal */}
      {catToRename && (
        <div className="fixed inset-0 z-300 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#1E1941] border border-[#E3CCCD]/30 p-6 rounded-2xl shadow-2xl w-full max-w-75 animate-in zoom-in duration-200">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-white font-serif text-lg tracking-wide">Renommer</h3>
              <button onClick={() => setCatToRename(null)}><X className="w-5 h-5 text-white/40 hover:text-white" /></button>
            </div>
            <input
              type="text"
              value={catToRename.newName}
              onChange={(e) => setCatToRename({ ...catToRename, newName: e.target.value })}
              autoFocus
              className="w-full bg-black/40 border border-[#E3CCCD]/20 rounded-lg p-2.5 text-white outline-none focus:border-[#E3CCCD]/60 mb-6"
            />
            <button onClick={handleRenameCategory}
              className="w-full py-3 bg-[#29206A] border border-[#E3CCCD]/40 rounded-xl text-white text-[13px] hover:bg-[#29206A]/80 shadow-lg">
              Sauvegarder
            </button>
          </div>
        </div>
      )}

      {/* Delete category confirm */}
      {catDeleteTarget && (
        <div className="fixed inset-0 z-300 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#1E1941] border border-[#ff6b6b]/30 p-6 rounded-2xl shadow-2xl max-w-sm w-full animate-in fade-in scale-95">
            <div className="flex items-center gap-4 text-[#ff6b6b] mb-4">
              <AlertTriangle className="w-6 h-6" />
              <h3 className="text-xl font-serif">Supprimer ?</h3>
            </div>
            <p className="text-white/70 text-sm mb-6 font-light">La suppression de cette catégorie est définitive.</p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setCatDeleteTarget(null)} className="px-4 py-2 text-white/60 text-sm hover:text-white">Annuler</button>
              <button onClick={handleDeleteCategory}
                className="px-5 py-2 bg-[#ff6b6b]/20 hover:bg-[#ff6b6b]/40 text-[#ff6b6b] border border-[#ff6b6b]/30 rounded-lg text-sm">
                Supprimer
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex-1 flex flex-col p-3 h-full min-h-0">
        <div className="flex-1 flex flex-col border border-[#E3CCCD]/20 rounded-xl bg-black/10 p-3 gap-2 min-h-0 relative overflow-hidden">

          <div className="flex gap-2 shrink-0">
            {/* Main category */}
            {isCreatingCat ? (
              <div className="flex-1 flex items-center border border-[#E3CCCD]/60 rounded-lg px-3 py-1.5 bg-[#1E1941]/60">
                <LayoutGrid className="w-3.5 h-3.5 text-white mr-2 shrink-0" />
                <input autoFocus type="text" placeholder="Catégorie..." value={newCatName}
                  onChange={(e) => setNewCatName(e.target.value)}
                  className="flex-1 bg-transparent border-none outline-none text-[13px] text-white" />
                <button onClick={() => { setIsCreatingCat(false); setNewCatName(""); }}>
                  <X className="w-4 h-4 text-white/50" />
                </button>
              </div>
            ) : (
              <div className="flex-1 flex items-center bg-[#1E1941]/40 border border-[#E3CCCD]/30 rounded-lg hover:border-[#E3CCCD]/60 transition-colors">
                <select
                  value={selectedCatId}
                  onChange={(e) => e.target.value === "NEW" ? (setIsCreatingCat(true), setSelectedCatId("")) : setSelectedCatId(e.target.value)}
                  className="flex-1 bg-transparent px-3 py-1.5 text-white/80 text-[13px] outline-none cursor-pointer"
                >
                  <option value="" className="bg-[#1E1941]">Catégorie</option>
                  {mainCategories.map((cat) => (
                    <option key={cat.id} value={cat.id} className="bg-[#1E1941]">{cat.name}</option>
                  ))}
                  <option value="NEW" className="bg-[#1E1941] font-bold">➕ Créer catégorie...</option>
                </select>
                {selectedCatId && (
                  <div className="flex items-center gap-1 pr-2 shrink-0">
                    <button
                      onClick={() => setCatToRename({ id: selectedCatId, newName: categories.find((c) => c.id === selectedCatId)?.name || "" })}
                      className="p-1 text-white/40 hover:text-white"
                    >
                      <Pencil className="w-3 h-3" />
                    </button>
                    <button onClick={() => setCatDeleteTarget(selectedCatId)} className="p-1 text-white/40 hover:text-red-400">
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Sub category */}
            {isCreatingSubCat ? (
              <div className="flex-1 flex items-center border border-[#E3CCCD]/60 rounded-lg px-3 py-1.5 bg-[#1E1941]/60">
                <LayoutGrid className="w-3.5 h-3.5 text-white mr-2 shrink-0" />
                <input autoFocus type="text" placeholder="Sous-catégorie..." value={newSubCatName}
                  onChange={(e) => setNewSubCatName(e.target.value)}
                  className="flex-1 bg-transparent border-none outline-none text-[13px] text-white" />
                <button onClick={() => { setIsCreatingSubCat(false); setNewSubCatName(""); }}>
                  <X className="w-4 h-4 text-white/50" />
                </button>
              </div>
            ) : (
              <div className={`flex-1 flex items-center bg-[#1E1941]/40 border border-[#E3CCCD]/30 rounded-lg transition-colors ${!selectedCatId && !isCreatingCat ? "opacity-30" : "hover:border-[#E3CCCD]/60"}`}>
                <select
                  value={selectedSubCatId}
                  disabled={!selectedCatId && !isCreatingCat}
                  onChange={(e) => e.target.value === "NEW" ? setIsCreatingSubCat(true) : setSelectedSubCatId(e.target.value)}
                  className="flex-1 bg-transparent px-3 py-1.5 text-white/80 text-[13px] outline-none cursor-pointer"
                >
                  <option value="" className="bg-[#1E1941]">Sous-catégorie</option>
                  {subCategories.map((sub) => (
                    <option key={sub.id} value={sub.id} className="bg-[#1E1941]">{sub.name}</option>
                  ))}
                  <option value="NEW" className="bg-[#1E1941] font-bold">➕ Créer sous-catégorie...</option>
                </select>
                {selectedSubCatId && (
                  <div className="flex items-center gap-1 pr-2 shrink-0">
                    <button
                      onClick={() => setCatToRename({ id: selectedSubCatId, newName: categories.find((c) => c.id === selectedSubCatId)?.name || "" })}
                      className="p-1 text-white/40 hover:text-white"
                    >
                      <Pencil className="w-3 h-3" />
                    </button>
                    <button onClick={() => setCatDeleteTarget(selectedSubCatId)} className="p-1 text-white/40 hover:text-red-400">
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="flex items-center border border-[#E3CCCD]/30 rounded-lg px-3 py-1.5 bg-[#1E1941]/40 shrink-0">
            <Type className="w-3.5 h-3.5 text-white/60 mr-2 shrink-0" />
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              type="text"
              placeholder="Titre de l'article"
              className="flex-1 bg-transparent border-none outline-none text-[13px] text-white font-medium"
            />
          </div>

          <div className="flex-1 flex flex-col min-h-0 border border-[#E3CCCD]/30 rounded-lg bg-[#1E1941]/40 overflow-hidden relative">
            <div className="relative z-70 bg-[#1E1941] shadow-md">
              {editor && <MenuBar editor={editor} />}
            </div>
            <div className="flex-1 relative z-10 min-h-0">
              <div
                className="absolute inset-0 p-4 overflow-y-auto cursor-text scrollbar-thin scrollbar-thumb-white/10"
                onClick={() => editor?.commands.focus()}
              >
                {editor && <TableFloatingMenu editor={editor} />}
                <EditorContent editor={editor} />
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 shrink-0 pt-1">
            <button onClick={onCancel} className="px-4 py-1.5 text-white/60 text-[13px] hover:text-white transition-colors">
              Annuler
            </button>
            <button
              onClick={handleSave}
              className="px-5 py-1.5 rounded-lg border border-[#E3CCCD]/40 text-white bg-[#29206A]/40 text-[13px] shadow-lg hover:bg-[#29206A]/60 transition-all active:scale-95"
            >
              <BookmarkPlus className="w-3.5 h-3.5 mr-2 inline" />
              {initialData ? "Mettre à jour" : "Sauvegarder"}
            </button>
          </div>

        </div>
      </div>
    </>
  );
}

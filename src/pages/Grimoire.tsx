/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import {
  Plus,
  ArrowLeft,
  BookOpen,
  LayoutGrid,
  Type,
  BookmarkPlus,
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Heading1,
  Heading2,
  List,
  ListOrdered,
  Pilcrow,
  X,
  FileText,
  Maximize2,
  Pencil,
  Trash2,
  AlertTriangle,
  Minimize2,
  Table as TableIcon,
  Rows,
  Columns,
  GripVertical,
  ChevronDown,
} from "lucide-react";
import { BookLayout } from "@/components/layout/BookLayout";
import { EditorContent, useEditor, useEditorState } from "@tiptap/react";
import type { Editor } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import { Table } from "@tiptap/extension-table";
import { TableRow } from "@tiptap/extension-table-row";
import { TableCell } from "@tiptap/extension-table-cell";
import { TableHeader } from "@tiptap/extension-table-header";
import { supabase } from "@/lib/supabase";

// --- 1. LOGIQUE DE SÉLECTION D'ÉTAT TIPTAP ---
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
    isTable: ctx.editor.isActive("table"),
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
      style={{
        position: "fixed",
        top: position.top,
        left: position.left,
        zIndex: 100,
      }}
      className="flex items-center gap-1 bg-[#1E1941]/95 border border-[#E3CCCD]/40 rounded-xl px-2 py-1.5 backdrop-blur-md shadow-2xl animate-in fade-in zoom-in duration-200"
      onMouseDown={(e) => e.preventDefault()}
    >
      <ToolbarButton
        onClick={() => editor.chain().focus().addRowAfter().run()}
        icon={Rows}
      />
      <ToolbarButton
        onClick={() => editor.chain().focus().addColumnAfter().run()}
        icon={Columns}
      />
      <div className="w-px h-4 bg-[#E3CCCD]/30 mx-1" />
      <button
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => editor.chain().focus().deleteRow().run()}
        className="p-1.5 text-white/50 hover:text-red-400 hover:bg-red-500/10 rounded-md flex items-center gap-0.5"
      >
        <Rows className="w-3.5 h-3.5" />
        <X className="w-3 h-3" />
      </button>
      <button
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => editor.chain().focus().deleteColumn().run()}
        className="p-1.5 text-white/50 hover:text-red-400 hover:bg-red-500/10 rounded-md flex items-center gap-0.5"
      >
        <Columns className="w-3.5 h-3.5" />
        <X className="w-3 h-3" />
      </button>
      <div className="w-px h-4 bg-[#E3CCCD]/30 mx-1" />
      <ToolbarButton
        onClick={() => editor.chain().focus().deleteTable().run()}
        icon={Trash2}
      />
    </div>,
    document.body,
  );
}

const ToolbarButton = ({
  onClick,
  isActive,
  disabled,
  icon: Icon,
  title,
}: any) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    title={title}
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

// --- 2. COMPOSANT PAGE GRIMOIRE ---
interface Category {
  id: string;
  name: string;
  parent_id: string | null;
}
interface WikiPage {
  id: string;
  title: string;
  content: string;
  category_id: string | null;
  subcategory_id: string | null;
  position_index: number;
}
interface GrimoireProps {
  isGlobal?: boolean;
  onBack: () => void;
  campaignId?: string;
}

// Type unique pour les suppressions
type DeleteTarget = { type: "page" | "category"; id: string } | null;

export function Grimoire({
  isGlobal = true,
  onBack,
  campaignId,
}: GrimoireProps) {
  const [isCreating, setIsCreating] = useState(false);
  const [editingPageId, setEditingPageId] = useState<string | null>(null);
  const [pages, setPages] = useState<WikiPage[]>([]);
  const [selectedPageId, setSelectedPageId] = useState<string | null>(null);

  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const [title, setTitle] = useState("");
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCatId, setSelectedCatId] = useState<string>("");
  const [selectedSubCatId, setSelectedSubCatId] = useState<string>("");
  const [isCreatingCat, setIsCreatingCat] = useState(false);
  const [newCatName, setNewCatName] = useState("");
  const [isCreatingSubCat, setIsCreatingSubCat] = useState(false);
  const [newSubCatName, setNewSubCatName] = useState("");
  const [catToRename, setCatToRename] = useState<{
    id: string;
    newName: string;
  } | null>(null);

  const [showTablePopup, setShowTablePopup] = useState(false);
  const [tableRows, setTableRows] = useState(3);
  const [tableCols, setTableCols] = useState(3);

  // États Drag & Drop et Accordéon
  const [draggedPageId, setDraggedPageId] = useState<string | null>(null);
  const [expandedCats, setExpandedCats] = useState<Record<string, boolean>>({});

  const toggleCat = (id: string) =>
    setExpandedCats((prev) => ({ ...prev, [id]: !prev[id] }));

  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      Table.configure({ resizable: true }),
      TableRow,
      TableHeader,
      TableCell,
    ],
    content: "",
    editorProps: {
      attributes: {
        class:
          "tiptap-editor min-h-full outline-none text-sm font-light text-white/90 placeholder:text-white/30 leading-relaxed pb-10",
      },
    },
  });

  const fetchData = async () => {
    const { data: catData } = await supabase
      .from("categories")
      .select("*")
      .order("name");
    if (catData) setCategories(catData);
    let query = supabase.from("wiki_pages").select("*").order("position_index");
    if (isGlobal) query = query.is("campaign_id", null);
    else if (campaignId) query = query.eq("campaign_id", campaignId);
    const { data: pagesData } = await query;
    if (pagesData) setPages(pagesData);
  };

  useEffect(() => {
    fetchData();
  }, [isGlobal, campaignId]);

  const mainCategories = categories.filter((c) => !c.parent_id);
  const subCategories = categories.filter((c) => c.parent_id === selectedCatId);
  const selectedPage = pages.find((p) => p.id === selectedPageId);

  const handleEdit = () => {
    if (!selectedPage) return;
    setTitle(selectedPage.title);
    setSelectedCatId(selectedPage.category_id || "");
    setSelectedSubCatId(selectedPage.subcategory_id || "");
    editor?.commands.setContent(selectedPage.content);
    setEditingPageId(selectedPage.id);
    setIsCreating(true);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;

    if (deleteTarget.type === "page") {
      const { error } = await supabase
        .from("wiki_pages")
        .delete()
        .eq("id", deleteTarget.id);
      if (!error) {
        setSelectedPageId(null);
        setDeleteTarget(null);
        fetchData();
      }
    } else if (deleteTarget.type === "category") {
      const { error } = await supabase
        .from("categories")
        .delete()
        .eq("id", deleteTarget.id);
      if (!error) {
        if (selectedCatId === deleteTarget.id) setSelectedCatId("");
        if (selectedSubCatId === deleteTarget.id) setSelectedSubCatId("");
        setDeleteTarget(null);
        fetchData();
      } else {
        alert("Erreur: La catégorie contient probablement des éléments.");
      }
    }
  };

  const handleRenameCategory = async () => {
    if (!catToRename || !catToRename.newName.trim()) return;
    const { error } = await supabase
      .from("categories")
      .update({ name: catToRename.newName.trim() })
      .eq("id", catToRename.id);
    if (!error) {
      setCatToRename(null);
      fetchData();
    } else {
      alert("Erreur lors du renommage.");
    }
  };

  const handleCancel = () => {
    setIsCreating(false);
    setEditingPageId(null);
    setIsCreatingCat(false);
    setIsCreatingSubCat(false);
    setTitle("");
    setNewCatName("");
    setNewSubCatName("");
    editor?.commands.setContent("");
  };

  const handleSave = async () => {
    if (!title || !editor) return alert("Le titre est obligatoire !");
    let fCatId = selectedCatId;
    let fSubCatId = selectedSubCatId;
    try {
      if (isCreatingCat && newCatName.trim() !== "") {
        const { data: nCat } = await supabase
          .from("categories")
          .insert({ name: newCatName.trim(), parent_id: null })
          .select()
          .single();
        fCatId = nCat.id;
      }
      if (isCreatingSubCat && newSubCatName.trim() !== "") {
        const { data: nSub } = await supabase
          .from("categories")
          .insert({ name: newSubCatName.trim(), parent_id: fCatId })
          .select()
          .single();
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

      if (editingPageId)
        await supabase
          .from("wiki_pages")
          .update(payload)
          .eq("id", editingPageId);
      else
        await supabase
          .from("wiki_pages")
          .insert({ ...payload, position_index: pages.length });

      // Ouvre l'accordéon pour montrer le nouvel article
      if (fCatId) setExpandedCats((prev) => ({ ...prev, [fCatId]: true }));
      if (fSubCatId)
        setExpandedCats((prev) => ({ ...prev, [fSubCatId]: true }));

      handleCancel();
      fetchData();
    } catch (err: any) {
      alert("Erreur : " + err.message);
    }
  };

  const handleDragStart = (e: React.DragEvent, id: string) => {
    setDraggedPageId(id);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDrop = async (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    if (!draggedPageId || draggedPageId === targetId) {
      setDraggedPageId(null);
      return;
    }

    const draggedPage = pages.find((p) => p.id === draggedPageId);
    const targetPage = pages.find((p) => p.id === targetId);

    if (!draggedPage || !targetPage) return;

    // Ne permet de réordonner que si on est dans la même catégorie/sous-catégorie
    if (
      draggedPage.category_id !== targetPage.category_id ||
      draggedPage.subcategory_id !== targetPage.subcategory_id
    ) {
      setDraggedPageId(null);
      return;
    }

    // Isoler les pages de ce groupe spécifique
    const groupPages = pages
      .filter(
        (p) =>
          p.category_id === draggedPage.category_id &&
          p.subcategory_id === draggedPage.subcategory_id,
      )
      .sort((a, b) => a.position_index - b.position_index);

    const oldIndex = groupPages.findIndex((p) => p.id === draggedPageId);
    const newIndex = groupPages.findIndex((p) => p.id === targetId);
    if (oldIndex === -1 || newIndex === -1) return;

    const newGroupPages = [...groupPages];
    const [movedPage] = newGroupPages.splice(oldIndex, 1);
    newGroupPages.splice(newIndex, 0, movedPage);

    const updatedGroupPages = newGroupPages.map((p, index) => ({
      ...p,
      position_index: index,
    }));

    setPages((prev) =>
      prev.map((p) => {
        const updated = updatedGroupPages.find((up) => up.id === p.id);
        return updated ? updated : p;
      }),
    );
    setDraggedPageId(null);

    const updates = updatedGroupPages.map((p) =>
      supabase
        .from("wiki_pages")
        .update({ position_index: p.position_index })
        .eq("id", p.id),
    );
    await Promise.all(updates);
  };

  const MenuBar = ({ editor }: { editor: Editor }) => {
    const state = useEditorState({ editor, selector: menuBarStateSelector });
    if (!state) return null;
    return (
      <div className="flex items-center gap-1 p-1.5 border-b border-[#E3CCCD]/20 bg-[#1E1941] shrink-0 overflow-x-auto relative z-60">
        <ToolbarButton
          onClick={() => editor.chain().focus().setParagraph().run()}
          isActive={state.isParagraph}
          icon={Pilcrow}
        />
        <ToolbarButton
          onClick={() =>
            editor.chain().focus().toggleHeading({ level: 1 }).run()
          }
          isActive={state.isHeading1}
          icon={Heading1}
        />
        <ToolbarButton
          onClick={() =>
            editor.chain().focus().toggleHeading({ level: 2 }).run()
          }
          isActive={state.isHeading2}
          icon={Heading2}
        />
        <div className="w-px h-5 bg-[#E3CCCD]/20 mx-1" />
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBold().run()}
          disabled={!state.canBold}
          isActive={state.isBold}
          icon={Bold}
        />
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleItalic().run()}
          isActive={state.isItalic}
          icon={Italic}
        />
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          isActive={state.isUnderline}
          icon={UnderlineIcon}
        />
        <div className="w-px h-5 bg-[#E3CCCD]/20 mx-1" />
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          isActive={state.isBulletList}
          icon={List}
        />
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          isActive={state.isOrderedList}
          icon={ListOrdered}
        />
        <div className="w-px h-5 bg-[#E3CCCD]/20 mx-1" />
        <ToolbarButton
          onClick={() => setShowTablePopup(true)}
          icon={TableIcon}
          title="Insérer un tableau"
        />
      </div>
    );
  };

  // Sous-composant pour rendre une liste d'articles
  const renderPageList = (pageList: WikiPage[]) => {
    if (pageList.length === 0) return null;
    return (
      <div className="space-y-0.5 mt-1 mb-2">
        {pageList
          .sort((a, b) => a.position_index - b.position_index)
          .map((page) => (
            <div
              key={page.id}
              draggable
              onDragStart={(e) => handleDragStart(e, page.id)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => handleDrop(e, page.id)}
              className={`w-full group text-left px-3 py-1.5 rounded-lg transition-all text-[12px] font-light flex items-center justify-between cursor-grab active:cursor-grabbing border ${selectedPageId === page.id ? "bg-white/10 text-white border-white/20 shadow-inner" : "hover:bg-white/5 text-white/70 hover:text-white border-transparent"} ${draggedPageId === page.id ? "opacity-50" : ""}`}
            >
              <button
                onClick={() => {
                  setIsCreating(false);
                  setSelectedPageId(page.id);
                }}
                className="flex-1 flex items-center gap-2.5 overflow-hidden text-left"
              >
                <div
                  className={`w-1 h-1 shrink-0 rounded-full ${selectedPageId === page.id ? "bg-[#E3CCCD] shadow-[0_0_8px_#E3CCCD]" : "bg-[#E3CCCD]/30"}`}
                />
                <span className="truncate">{page.title}</span>
              </button>
              <GripVertical className="w-3.5 h-3.5 text-white/20 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
            </div>
          ))}
      </div>
    );
  };

  const uncategorizedPages = pages.filter((p) => !p.category_id);

  const sidebar = !isCreating ? (
    <>
      <div className="flex-1 overflow-y-auto p-2 scrollbar-thin scrollbar-thumb-white/5">
        {pages.length === 0 && categories.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center opacity-30 px-4 text-center">
            <FileText className="w-8 h-8 mb-2" />
            <p className="text-[11px] italic font-light">
              Aucun article dans ce grimoire.
            </p>
          </div>
        ) : (
          <div className="space-y-1 px-1 py-1">
            {/* 1. Affichage en Accordéon des Catégories */}
            {mainCategories.map((cat) => {
              const directPages = pages.filter(
                (p) => p.category_id === cat.id && !p.subcategory_id,
              );
              const subs = categories.filter((c) => c.parent_id === cat.id);
              const isOpen = expandedCats[cat.id];

              return (
                <div key={cat.id} className="w-full">
                  <button
                    onClick={() => toggleCat(cat.id)}
                    className="flex items-center justify-between w-full p-2.5 text-white/90 hover:border-[#E3CCCD]/40 hover:bg-[#1E1941]/20 rounded-lg transition-colors text-[13px] font-medium"
                  >
                    <span className="truncate pr-2">{cat.name}</span>
                    <ChevronDown
                      className={`w-4 h-4 shrink-0 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
                    />
                  </button>

                  {isOpen && (
                    <div className="pl-3 mt-1.5 border-l border-[#E3CCCD]/20 ml-2.5 space-y-1 mb-3">
                      {subs.map((sub) => {
                        const subPages = pages.filter(
                          (p) => p.subcategory_id === sub.id,
                        );
                        const isSubOpen = expandedCats[sub.id];
                        return (
                          <div key={sub.id} className="w-full mt-1">
                            <button
                              onClick={() => toggleCat(sub.id)}
                              className="flex items-center justify-between w-full px-2 py-1.5 text-white/70 hover:text-white transition-colors text-[12px] font-medium"
                            >
                              <span className="truncate pr-2">
                                - {sub.name}
                              </span>
                              <ChevronDown
                                className={`w-3.5 h-3.5 shrink-0 transition-transform duration-200 ${isSubOpen ? "rotate-180" : ""}`}
                              />
                            </button>
                            {isSubOpen && (
                              <div className="pl-3 ml-2 border-l border-white/10 mt-1">
                                {renderPageList(subPages)}
                              </div>
                            )}
                          </div>
                        );
                      })}
                      {renderPageList(directPages)}
                    </div>
                  )}
                </div>
              );
            })}

            {/* 2. Articles sans catégorie */}
            {uncategorizedPages.length > 0 && (
              <div className="pt-3 border-t border-white/10 mt-3">
                <span className="text-[10px] uppercase tracking-widest text-white/30 ml-2 mb-2 block">
                  Sans catégorie
                </span>
                {renderPageList(uncategorizedPages)}
              </div>
            )}
          </div>
        )}
      </div>
      <div className="p-4 space-y-3 shrink-0 bg-black/10 border-t border-white/5">
        <button
          onClick={() => {
            handleCancel();
            setIsCreating(true);
            setSelectedPageId(null);
          }}
          className="w-full flex items-center justify-start px-3 gap-3 py-2 rounded-xl border border-[#E3CCCD]/30 text-white/80 hover:bg-white/5 bg-[#29206A]/40 text-[13px] transition-colors"
        >
          <Plus className="w-4 h-4" /> Ajouter un article
        </button>
        <button
          onClick={onBack}
          className="w-full flex items-center justify-start px-3 gap-3 py-2 text-white/80 hover:text-white text-[13px] transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Retour
        </button>
      </div>
    </>
  ) : undefined;

  return (
    <>
      {/* --- POPUPS ET MODALS --- */}
      {showTablePopup && (
        <div className="fixed inset-0 z-300 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#1E1941] border border-[#E3CCCD]/30 p-6 rounded-2xl shadow-2xl w-full max-w-70 animate-in zoom-in duration-200">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-white font-serif text-lg tracking-wide">
                Tableau
              </h3>
              <button onClick={() => setShowTablePopup(false)}>
                <X className="w-5 h-5 text-white/40" />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-6 mb-6">
              <div className="space-y-2">
                <label className="text-[10px] uppercase text-white/40 font-bold">
                  Lignes
                </label>
                <input
                  type="number"
                  value={tableRows}
                  onChange={(e) => setTableRows(parseInt(e.target.value) || 1)}
                  className="w-full bg-black/40 border border-[#E3CCCD]/20 rounded-lg p-2.5 text-white text-center outline-none focus:border-[#E3CCCD]/60"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] uppercase text-white/40 font-bold">
                  Colonnes
                </label>
                <input
                  type="number"
                  value={tableCols}
                  onChange={(e) => setTableCols(parseInt(e.target.value) || 1)}
                  className="w-full bg-black/40 border border-[#E3CCCD]/20 rounded-lg p-2.5 text-white text-center outline-none focus:border-[#E3CCCD]/60"
                />
              </div>
            </div>
            <button
              onClick={() => {
                editor
                  ?.chain()
                  .focus()
                  .insertTable({
                    rows: tableRows,
                    cols: tableCols,
                    withHeaderRow: true,
                  })
                  .run();
                setShowTablePopup(false);
              }}
              className="w-full py-3 bg-[#29206A] border border-[#E3CCCD]/40 rounded-xl text-white text-[13px] hover:bg-[#29206A]/80 shadow-lg"
            >
              Générer
            </button>
          </div>
        </div>
      )}

      {/* POPUP DE RENOMMAGE CATÉGORIE */}
      {catToRename && (
        <div className="fixed inset-0 z-300 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#1E1941] border border-[#E3CCCD]/30 p-6 rounded-2xl shadow-2xl w-full max-w-75 animate-in zoom-in duration-200">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-white font-serif text-lg tracking-wide">
                Renommer
              </h3>
              <button onClick={() => setCatToRename(null)}>
                <X className="w-5 h-5 text-white/40 hover:text-white" />
              </button>
            </div>
            <div className="mb-6">
              <input
                type="text"
                value={catToRename.newName}
                onChange={(e) =>
                  setCatToRename({ ...catToRename, newName: e.target.value })
                }
                autoFocus
                className="w-full bg-black/40 border border-[#E3CCCD]/20 rounded-lg p-2.5 text-white outline-none focus:border-[#E3CCCD]/60"
              />
            </div>
            <button
              onClick={handleRenameCategory}
              className="w-full py-3 bg-[#29206A] border border-[#E3CCCD]/40 rounded-xl text-white text-[13px] hover:bg-[#29206A]/80 shadow-lg"
            >
              Sauvegarder
            </button>
          </div>
        </div>
      )}

      {/* MODAL SUPPRESSION MUTUALISÉE */}
      {deleteTarget && (
        <div className="fixed inset-0 z-300 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#1E1941] border border-[#ff6b6b]/30 p-6 rounded-2xl shadow-2xl max-w-sm w-full animate-in fade-in scale-95">
            <div className="flex items-center gap-4 text-[#ff6b6b] mb-4">
              <AlertTriangle className="w-6 h-6" />
              <h3 className="text-xl font-serif">Supprimer ?</h3>
            </div>
            <p className="text-white/70 text-sm mb-6 font-light">
              {deleteTarget.type === "category"
                ? "La suppression de cette catégorie est définitive."
                : "Cette action est définitive."}
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setDeleteTarget(null)}
                className="px-4 py-2 text-white/60 text-sm hover:text-white"
              >
                Annuler
              </button>
              <button
                onClick={confirmDelete}
                className="px-5 py-2 bg-[#ff6b6b]/20 hover:bg-[#ff6b6b]/40 text-[#ff6b6b] border border-[#ff6b6b]/30 rounded-lg text-sm shadow-[0_0_15px_rgba(255,107,107,0.2)]"
              >
                Supprimer
              </button>
            </div>
          </div>
        </div>
      )}

      {isFullscreen && selectedPage && (
        <div className="fixed inset-0 z-400 bg-[#0B081A] flex flex-col p-10 overflow-y-auto">
          <div className="max-w-4xl w-full mx-auto relative">
            <button
              onClick={() => setIsFullscreen(false)}
              className="fixed top-8 right-8 p-3 bg-white/5 rounded-full text-white/40 hover:text-white transition-colors"
            >
              <Minimize2 className="w-6 h-6" />
            </button>
            <h1 className="font-serif text-5xl text-white mb-12 border-b border-[#E3CCCD]/20 pb-8 uppercase tracking-wider leading-tight">
              {selectedPage.title}
            </h1>
            <div
              className="tiptap-editor text-white/90 text-lg leading-relaxed pb-20"
              dangerouslySetInnerHTML={{ __html: selectedPage.content }}
            />
          </div>
        </div>
      )}

      {/* --- STRUCTURE LIVRE --- */}
      <BookLayout spineTitle="Grimoire" sidebar={sidebar}>
        {isCreating ? (
          <div className="flex-1 flex flex-col p-3 h-full min-h-0">
            <div className="flex-1 flex flex-col border border-[#E3CCCD]/20 rounded-xl bg-black/10 p-3 gap-2 min-h-0 relative overflow-hidden">
              <div className="flex gap-2 shrink-0">
                {/* SELECT CATÉGORIE PRINCIPALE */}
                {isCreatingCat ? (
                  <div className="flex-1 flex items-center border border-[#E3CCCD]/60 rounded-lg px-3 py-1.5 bg-[#1E1941]/60">
                    <LayoutGrid className="w-3.5 h-3.5 text-white mr-2 shrink-0" />
                    <input
                      autoFocus
                      type="text"
                      placeholder="Catégorie..."
                      value={newCatName}
                      onChange={(e) => setNewCatName(e.target.value)}
                      className="flex-1 bg-transparent border-none outline-none text-[13px] text-white"
                    />
                    <button
                      onClick={() => {
                        setIsCreatingCat(false);
                        setNewCatName("");
                      }}
                    >
                      <X className="w-4 h-4 text-white/50" />
                    </button>
                  </div>
                ) : (
                  <div className="flex-1 flex items-center bg-[#1E1941]/40 border border-[#E3CCCD]/30 rounded-lg hover:border-[#E3CCCD]/60 transition-colors">
                    <select
                      value={selectedCatId}
                      onChange={(e) =>
                        e.target.value === "NEW"
                          ? (setIsCreatingCat(true), setSelectedCatId(""))
                          : setSelectedCatId(e.target.value)
                      }
                      className="flex-1 bg-transparent px-3 py-1.5 text-white/80 text-[13px] outline-none cursor-pointer"
                    >
                      <option value="" className="bg-[#1E1941]">
                        Catégorie
                      </option>
                      {mainCategories.map((cat) => (
                        <option
                          key={cat.id}
                          value={cat.id}
                          className="bg-[#1E1941]"
                        >
                          {cat.name}
                        </option>
                      ))}
                      <option value="NEW" className="bg-[#1E1941] font-bold">
                        ➕ Créer catégorie...
                      </option>
                    </select>
                    {selectedCatId && (
                      <div className="flex items-center gap-1 pr-2 shrink-0">
                        <button
                          onClick={() =>
                            setCatToRename({
                              id: selectedCatId,
                              newName:
                                categories.find((c) => c.id === selectedCatId)
                                  ?.name || "",
                            })
                          }
                          className="p-1 text-white/40 hover:text-white"
                        >
                          <Pencil className="w-3 h-3" />
                        </button>
                        <button
                          onClick={() =>
                            setDeleteTarget({
                              type: "category",
                              id: selectedCatId,
                            })
                          }
                          className="p-1 text-white/40 hover:text-red-400"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* SELECT SOUS-CATÉGORIE */}
                {isCreatingSubCat ? (
                  <div className="flex-1 flex items-center border border-[#E3CCCD]/60 rounded-lg px-3 py-1.5 bg-[#1E1941]/60">
                    <LayoutGrid className="w-3.5 h-3.5 text-white mr-2 shrink-0" />
                    <input
                      autoFocus
                      type="text"
                      placeholder="Sous-catégorie..."
                      value={newSubCatName}
                      onChange={(e) => setNewSubCatName(e.target.value)}
                      className="flex-1 bg-transparent border-none outline-none text-[13px] text-white"
                    />
                    <button
                      onClick={() => {
                        setIsCreatingSubCat(false);
                        setNewSubCatName("");
                      }}
                    >
                      <X className="w-4 h-4 text-white/50" />
                    </button>
                  </div>
                ) : (
                  <div
                    className={`flex-1 flex items-center bg-[#1E1941]/40 border border-[#E3CCCD]/30 rounded-lg transition-colors ${!selectedCatId && !isCreatingCat ? "opacity-30" : "hover:border-[#E3CCCD]/60"}`}
                  >
                    <select
                      value={selectedSubCatId}
                      disabled={!selectedCatId && !isCreatingCat}
                      onChange={(e) =>
                        e.target.value === "NEW"
                          ? setIsCreatingSubCat(true)
                          : setSelectedSubCatId(e.target.value)
                      }
                      className="flex-1 bg-transparent px-3 py-1.5 text-white/80 text-[13px] outline-none cursor-pointer"
                    >
                      <option value="" className="bg-[#1E1941]">
                        Sous-catégorie
                      </option>
                      {subCategories.map((sub) => (
                        <option
                          key={sub.id}
                          value={sub.id}
                          className="bg-[#1E1941]"
                        >
                          {sub.name}
                        </option>
                      ))}
                      <option value="NEW" className="bg-[#1E1941] font-bold">
                        ➕ Créer sous-catégorie...
                      </option>
                    </select>
                    {selectedSubCatId && (
                      <div className="flex items-center gap-1 pr-2 shrink-0">
                        <button
                          onClick={() =>
                            setCatToRename({
                              id: selectedSubCatId,
                              newName:
                                categories.find(
                                  (c) => c.id === selectedSubCatId,
                                )?.name || "",
                            })
                          }
                          className="p-1 text-white/40 hover:text-white"
                        >
                          <Pencil className="w-3 h-3" />
                        </button>
                        <button
                          onClick={() =>
                            setDeleteTarget({
                              type: "category",
                              id: selectedSubCatId,
                            })
                          }
                          className="p-1 text-white/40 hover:text-red-400"
                        >
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
                  <MenuBar editor={editor!} />
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
                <button
                  onClick={handleCancel}
                  className="px-4 py-1.5 text-white/60 text-[13px] hover:text-white transition-colors"
                >
                  Annuler
                </button>
                <button
                  onClick={handleSave}
                  className="px-5 py-1.5 rounded-lg border border-[#E3CCCD]/40 text-white bg-[#29206A]/40 text-[13px] shadow-lg hover:bg-[#29206A]/60 transition-all active:scale-95"
                >
                  <BookmarkPlus className="w-3.5 h-3.5 mr-2 inline" />{" "}
                  {editingPageId ? "Mettre à jour" : "Sauvegarder"}
                </button>
              </div>
            </div>
          </div>
        ) : selectedPage ? (
          <div className="flex-1 relative min-h-0">
            <div className="absolute top-6 right-8 z-50 flex items-center gap-1 bg-[#1E1941]/80 border border-[#E3CCCD]/20 rounded-full px-2 py-1.5 backdrop-blur-md shadow-xl">
              <button
                onClick={() => setIsFullscreen(true)}
                className="p-1.5 text-white/60 hover:text-white hover:bg-white/10 rounded-full transition-colors"
              >
                <Maximize2 className="w-4 h-4" />
              </button>
              <button
                onClick={handleEdit}
                className="p-1.5 text-white/60 hover:text-white hover:bg-white/10 rounded-full transition-colors"
              >
                <Pencil className="w-4 h-4" />
              </button>
              <button
                onClick={() => {
                  if (selectedPageId)
                    setDeleteTarget({ type: "page", id: selectedPageId });
                }}
                className="p-1.5 text-white/60 hover:text-[#ff6b6b] hover:bg-[#ff6b6b]/10 rounded-full transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
            <div className="absolute inset-0 p-10 overflow-y-auto scrollbar-thin scrollbar-thumb-white/10">
              <h1 className="font-serif text-4xl text-white mb-8 border-b border-[#E3CCCD]/20 pb-6 uppercase tracking-wider pr-32 leading-tight">
                {selectedPage.title}
              </h1>
              <div
                className="tiptap-editor text-white/90 font-light text-sm leading-relaxed"
                dangerouslySetInnerHTML={{ __html: selectedPage.content }}
              />
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-10 h-full opacity-60">
            <BookOpen className="w-16 h-16 text-white/20 mb-6" />
            <h2 className="font-serif text-xl text-white tracking-widest uppercase mb-2 leading-none">
              Grimoire
            </h2>
            <p className="text-xs text-white/40 italic font-light">
              Sélectionnez un article ou commencez à écrire une nouvelle
              légende.
            </p>
          </div>
        )}

        <style>{`
          .tiptap-editor h1 { font-family: serif; font-size: 1.6rem; color: white; margin: 1.5rem 0 0.5rem; display: block !important; line-height: 1.3; }
          .tiptap-editor h2 { font-family: serif; font-size: 1.3rem; color: white; margin: 1.2rem 0 0.4rem; display: block !important; line-height: 1.3; }
          .tiptap-editor p { margin-bottom: 0.75rem; min-height: 1rem; display: block !important; }
          .tiptap-editor ul { list-style-type: disc; padding-left: 1.5rem; margin-bottom: 1rem; display: block !important; }
          .tiptap-editor ol { list-style-type: decimal; padding-left: 1.5rem; margin-bottom: 1rem; display: block !important; }
          .tiptap-editor strong { font-weight: 600; color: white; }
          .tiptap-editor table { border-collapse: collapse; table-layout: fixed; width: 100%; margin: 1.5rem 0; border: 1px solid rgba(227, 204, 205, 0.3); background: rgba(30, 25, 65, 0.2); border-radius: 8px; overflow: hidden; }
          .tiptap-editor td, .tiptap-editor th { min-width: 1em; border: 1px solid rgba(227, 204, 205, 0.15); padding: 10px 12px; vertical-align: top; box-sizing: border-box; position: relative; }
          .tiptap-editor th { background-color: rgba(227, 204, 205, 0.1); font-weight: 600; text-align: left; color: white; }
          .tiptap-editor .column-resize-handle { background-color: rgba(227, 204, 205, 0.4); bottom: -2px; pointer-events: none; position: absolute; right: -2px; top: 0; width: 4px; }
        `}</style>
      </BookLayout>
    </>
  );
}

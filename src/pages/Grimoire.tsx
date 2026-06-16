/* eslint-disable react-hooks/exhaustive-deps */
import { useState, useEffect } from "react";
import { BookOpen, AlertTriangle } from "lucide-react";
import { BookLayout } from "@/components/layout/BookLayout";
import { supabase } from "@/lib/supabase";
import { GrimoireSidebar } from "@/components/grimoire/GrimoireSidebar";
import { PageEditor } from "@/components/grimoire/PageEditor";
import { PageView } from "@/components/grimoire/PageView";
import type { InitialPageData } from "@/components/grimoire/PageEditor";
import type { Category, WikiPage, DraggedItem } from "@/types/grimoire";

interface GrimoireProps {
  isGlobal?: boolean;
  onBack: () => void;
  campaignId?: string;
  readOnly?: boolean;
}

export function Grimoire({ isGlobal = true, onBack, campaignId, readOnly = false }: GrimoireProps) {
  const [isCreating, setIsCreating] = useState(false);
  const [editingPageData, setEditingPageData] = useState<InitialPageData | null>(null);
  const [pages, setPages] = useState<WikiPage[]>([]);
  const [selectedPageId, setSelectedPageId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [expandedCats, setExpandedCats] = useState<Record<string, boolean>>({});
  const [draggedItem, setDraggedItem] = useState<DraggedItem>(null);
  const [dragOverTarget, setDragOverTarget] = useState<string | null>(null);

  const fetchData = async () => {
    const { data: catData } = await supabase
      .from("categories").select("*")
      .order("position_index", { ascending: true }).order("name");
    if (catData) {
      if (!isGlobal && campaignId) {
        setCategories(catData.filter((c) => c.campaign_id === campaignId || c.campaign_id === null));
      } else {
        setCategories(catData.filter((c) => c.campaign_id === null));
      }
    }
    let query = supabase.from("wiki_pages").select("*").order("position_index", { ascending: true });
    if (isGlobal) query = query.is("campaign_id", null);
    else if (campaignId) query = query.or(`campaign_id.eq.${campaignId},campaign_id.is.null`);
    const { data: pagesData } = await query;
    if (pagesData) setPages(pagesData);
  };

  useEffect(() => { fetchData(); }, [isGlobal, campaignId]);

  const selectedPage = pages.find((p) => p.id === selectedPageId);

  const handleEdit = () => {
    if (!selectedPage) return;
    setEditingPageData({
      id: selectedPage.id,
      title: selectedPage.title,
      content: selectedPage.content,
      categoryId: selectedPage.category_id,
      subCategoryId: selectedPage.subcategory_id,
    });
    setIsCreating(true);
  };

  const handleCancel = () => {
    setIsCreating(false);
    setEditingPageData(null);
  };

  const handleSaveSuccess = (expandCatId?: string, expandSubCatId?: string) => {
    setIsCreating(false);
    setEditingPageData(null);
    if (expandCatId) setExpandedCats((prev) => ({ ...prev, [expandCatId]: true }));
    if (expandSubCatId) setExpandedCats((prev) => ({ ...prev, [expandSubCatId]: true }));
    fetchData();
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    await supabase.from("wiki_pages").delete().eq("id", deleteTarget);
    setSelectedPageId(null);
    setDeleteTarget(null);
    fetchData();
  };

  // --- Drag & Drop ---
  const handleDragStart = (e: React.DragEvent, type: "page" | "category", id: string) => {
    e.stopPropagation();
    setDraggedItem({ type, id });
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (dragOverTarget !== targetId) setDragOverTarget(targetId);
  };

  const handleDragEnd = () => {
    setDraggedItem(null);
    setDragOverTarget(null);
  };

  const handleDrop = async (e: React.DragEvent, targetType: "page" | "category", targetId: string) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverTarget(null);
    if (!draggedItem || draggedItem.id === targetId) { setDraggedItem(null); return; }

    if (draggedItem.type === "category" && targetType === "category") {
      const draggedCat = categories.find((c) => c.id === draggedItem.id);
      const targetCat = categories.find((c) => c.id === targetId);
      if (!draggedCat || !targetCat || draggedCat.parent_id !== targetCat.parent_id) { setDraggedItem(null); return; }
      const siblings = categories.filter((c) => c.parent_id === draggedCat.parent_id).sort((a, b) => a.position_index - b.position_index);
      const newSiblings = [...siblings];
      const [moved] = newSiblings.splice(siblings.findIndex((c) => c.id === draggedCat.id), 1);
      newSiblings.splice(siblings.findIndex((c) => c.id === targetCat.id), 0, moved);
      const updated = newSiblings.map((c, i) => ({ ...c, position_index: i }));
      setCategories((prev) => prev.map((c) => updated.find((s) => s.id === c.id) || c));
      await Promise.all(updated.map((c) => supabase.from("categories").update({ position_index: c.position_index }).eq("id", c.id)));

    } else if (draggedItem.type === "page") {
      const draggedPage = pages.find((p) => p.id === draggedItem.id);
      if (!draggedPage) { setDraggedItem(null); return; }
      let newCatId = draggedPage.category_id;
      let newSubCatId = draggedPage.subcategory_id;
      let targetIndex = -1;

      if (targetType === "page") {
        const targetPage = pages.find((p) => p.id === targetId);
        if (!targetPage) return;
        newCatId = targetPage.category_id;
        newSubCatId = targetPage.subcategory_id;
        targetIndex = pages.filter((p) => p.category_id === newCatId && p.subcategory_id === newSubCatId).sort((a, b) => a.position_index - b.position_index).findIndex((p) => p.id === targetId);
      } else if (targetType === "category") {
        if (targetId === "uncategorized") { newCatId = null; newSubCatId = null; }
        else {
          const targetCat = categories.find((c) => c.id === targetId);
          if (!targetCat) return;
          newCatId = targetCat.parent_id !== null ? targetCat.parent_id : targetCat.id;
          newSubCatId = targetCat.parent_id !== null ? targetCat.id : null;
          setExpandedCats((prev) => ({ ...prev, [targetId]: true }));
        }
      }

      const newPages = [...pages];
      const [movedPage] = newPages.splice(newPages.findIndex((p) => p.id === draggedPage.id), 1);
      movedPage.category_id = newCatId;
      movedPage.subcategory_id = newSubCatId;
      const group = newPages.filter((p) => p.category_id === newCatId && p.subcategory_id === newSubCatId).sort((a, b) => a.position_index - b.position_index);
      if (targetIndex === -1) group.push(movedPage);
      else group.splice(targetIndex, 0, movedPage);
      const updatedGroup = group.map((p, idx) => ({ ...p, position_index: idx }));
      setPages((prev) => [...prev.filter((p) => p.id !== movedPage.id && !(p.category_id === newCatId && p.subcategory_id === newSubCatId)), ...updatedGroup]);
      await supabase.from("wiki_pages").update({ category_id: newCatId, subcategory_id: newSubCatId, position_index: updatedGroup.find((p) => p.id === movedPage.id)?.position_index }).eq("id", movedPage.id);
      await Promise.all(updatedGroup.map((p) => supabase.from("wiki_pages").update({ position_index: p.position_index }).eq("id", p.id)));
    }

    setDraggedItem(null);
  };

  const sidebar = !isCreating ? (
    <GrimoireSidebar
      pages={pages}
      categories={categories}
      selectedPageId={selectedPageId}
      expandedCats={expandedCats}
      draggedItem={draggedItem}
      dragOverTarget={dragOverTarget}
      readOnly={readOnly}
      onSelectPage={(id) => { handleCancel(); setSelectedPageId(id); }}
      onCreatePage={() => { handleCancel(); setIsCreating(true); setSelectedPageId(null); }}
      onBack={onBack}
      onToggleCat={(id) => setExpandedCats((prev) => ({ ...prev, [id]: !prev[id] }))}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
      onDrop={handleDrop}
    />
  ) : undefined;

  return (
    <>
      {deleteTarget && (
        <div className="fixed inset-0 z-300 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#1E1941] border border-[#ff6b6b]/30 p-6 rounded-2xl shadow-2xl max-w-sm w-full animate-in fade-in scale-95">
            <div className="flex items-center gap-4 text-[#ff6b6b] mb-4">
              <AlertTriangle className="w-6 h-6" />
              <h3 className="text-xl font-serif">Supprimer ?</h3>
            </div>
            <p className="text-white/70 text-sm mb-6 font-light">Cette action est définitive.</p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setDeleteTarget(null)} className="px-4 py-2 text-white/60 text-sm hover:text-white">Annuler</button>
              <button onClick={confirmDelete} className="px-5 py-2 bg-[#ff6b6b]/20 hover:bg-[#ff6b6b]/40 text-[#ff6b6b] border border-[#ff6b6b]/30 rounded-lg text-sm">Supprimer</button>
            </div>
          </div>
        </div>
      )}

      <BookLayout spineTitle="Grimoire" sidebar={sidebar} hideSidebar={isFullscreen}>
        {isCreating && !readOnly ? (
          <PageEditor
            initialData={editingPageData ?? undefined}
            categories={categories}
            pages={pages}
            campaignId={campaignId}
            isGlobal={isGlobal}
            onSaveSuccess={handleSaveSuccess}
            onCancel={handleCancel}
            onCategoriesChanged={fetchData}
          />
        ) : selectedPage ? (
          <PageView
            page={selectedPage}
            isFullscreen={isFullscreen}
            readOnly={readOnly}
            onEdit={handleEdit}
            onDelete={() => setDeleteTarget(selectedPageId!)}
            onToggleFullscreen={() => setIsFullscreen((f) => !f)}
          />
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-10 h-full opacity-60">
            <BookOpen className="w-16 h-16 text-white/20 mb-6" />
            <h2 className="font-serif text-xl text-white tracking-widest uppercase mb-2 leading-none">Grimoire</h2>
            <p className="text-xs text-white/40 italic font-light">Sélectionnez un article ou commencez à écrire une nouvelle légende.</p>
          </div>
        )}

      </BookLayout>
    </>
  );
}

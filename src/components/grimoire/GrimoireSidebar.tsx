import React from "react";
import { FileText, Plus, ArrowLeft, GripVertical, ChevronDown } from "lucide-react";
import type { Category, WikiPage, DraggedItem } from "@/types/grimoire";

function SectionPanel({ open, children }: { open: boolean; children: React.ReactNode }) {
  return (
    <div className={`grid transition-all duration-200 ease-in-out ${open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}>
      <div className="overflow-hidden">
        {children}
      </div>
    </div>
  );
}

interface GrimoireSidebarProps {
  pages: WikiPage[];
  categories: Category[];
  selectedPageId: string | null;
  expandedCats: Record<string, boolean>;
  draggedItem: DraggedItem;
  dragOverTarget: string | null;
  readOnly?: boolean;
  onSelectPage: (id: string) => void;
  onCreatePage: () => void;
  onBack: () => void;
  onToggleCat: (id: string) => void;
  onDragStart: (e: React.DragEvent, type: "page" | "category", id: string) => void;
  onDragOver: (e: React.DragEvent, targetId: string) => void;
  onDragEnd: () => void;
  onDrop: (e: React.DragEvent, targetType: "page" | "category", targetId: string) => void;
}

export function GrimoireSidebar({
  pages, categories, selectedPageId, expandedCats, draggedItem, dragOverTarget,
  readOnly, onSelectPage, onCreatePage, onBack, onToggleCat,
  onDragStart, onDragOver, onDragEnd, onDrop,
}: GrimoireSidebarProps) {
  const mainCategories = categories
    .filter((c) => !c.parent_id)
    .sort((a, b) => a.position_index - b.position_index);

  const uncategorizedPages = pages.filter((p) => !p.category_id);

  const renderPageList = (pageList: WikiPage[]) => {
    if (pageList.length === 0) return null;
    return (
      <div className="space-y-0.5">
        {pageList
          .sort((a, b) => a.position_index - b.position_index)
          .map((page) => (
            <div
              key={page.id}
              draggable
              onDragStart={(e) => onDragStart(e, "page", page.id)}
              onDragOver={(e) => onDragOver(e, page.id)}
              onDrop={(e) => onDrop(e, "page", page.id)}
              onDragEnd={onDragEnd}
              className={`w-full group flex items-center justify-between rounded-lg transition-all text-[12px] font-light cursor-grab active:cursor-grabbing
                ${draggedItem?.id === page.id ? "opacity-30" : ""}
                ${dragOverTarget === page.id ? "bg-white/5" : ""}`}
            >
              <button
                onClick={() => onSelectPage(page.id)}
                className={`flex-1 flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-left transition-all
                  ${selectedPageId === page.id ? "bg-[#29206A]/60 text-white" : "text-white/60 hover:text-white hover:bg-white/5"}`}
              >
                <div className={`w-1 h-1 shrink-0 rounded-full ${selectedPageId === page.id ? "bg-[#E3CCCD]" : "bg-[#E3CCCD]/30"}`} />
                <span className="break-words min-w-0">{page.title}</span>
              </button>
              <GripVertical className="w-3.5 h-3.5 text-white/20 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 mr-1" />
            </div>
          ))}
      </div>
    );
  };

  return (
    <>
      <div className="flex-1 overflow-y-auto py-2 px-3 scrollbar-thin scrollbar-thumb-white/5">
        {pages.length === 0 && categories.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center opacity-30 px-4 text-center">
            <FileText className="w-8 h-8 mb-2" />
            <p className="text-[11px] italic font-light">Aucun contenu.</p>
          </div>
        ) : (
          <div className="space-y-0.5">
            {mainCategories.map((cat) => {
              const directPages = pages.filter((p) => p.category_id === cat.id && !p.subcategory_id);
              const subs = categories
                .filter((c) => c.parent_id === cat.id)
                .sort((a, b) => a.position_index - b.position_index);
              const isOpen = expandedCats[cat.id];

              return (
                <div key={cat.id}
                  draggable
                  onDragStart={(e) => onDragStart(e, "category", cat.id)}
                  onDragOver={(e) => onDragOver(e, cat.id)}
                  onDrop={(e) => onDrop(e, "category", cat.id)}
                  onDragEnd={onDragEnd}
                  className={`group ${draggedItem?.id === cat.id ? "opacity-30" : ""}`}
                >
                  <button
                    onClick={() => onToggleCat(cat.id)}
                    className={`flex items-center justify-between w-full px-2.5 py-1.5 rounded-lg transition-all text-[12px] font-medium
                      ${isOpen ? "text-[#E3CCCD] bg-[#29206A]/40" : "text-white/50 hover:text-white/80 hover:bg-white/5"}
                      ${dragOverTarget === cat.id ? "ring-1 ring-[#E3CCCD]/40" : ""}`}
                  >
                    <div className="flex items-center gap-1.5 min-w-0">
                      <GripVertical className="w-3 h-3 shrink-0 opacity-0 group-hover:opacity-40 transition-opacity" />
                      <span className="truncate">{cat.name}</span>
                    </div>
                    <ChevronDown className={`w-3.5 h-3.5 shrink-0 transition-transform ${isOpen ? "rotate-180" : ""}`} />
                  </button>

                  <SectionPanel open={!!isOpen}>
                    <div className="mt-0.5 ml-2 border-l border-[#E3CCCD]/20 pl-2 mb-1 space-y-0.5">
                      {subs.map((sub) => {
                        const subPages = pages.filter((p) => p.subcategory_id === sub.id);
                        const isSubOpen = expandedCats[sub.id];
                        return (
                          <div key={sub.id}
                            draggable
                            onDragStart={(e) => onDragStart(e, "category", sub.id)}
                            onDragOver={(e) => onDragOver(e, sub.id)}
                            onDrop={(e) => onDrop(e, "category", sub.id)}
                            onDragEnd={onDragEnd}
                            className={`group/sub ${draggedItem?.id === sub.id ? "opacity-30" : ""}`}
                          >
                            <button
                              onClick={() => onToggleCat(sub.id)}
                              className={`flex items-center justify-between w-full px-2 py-1.5 rounded-md transition-all text-[12px] font-medium
                                ${isSubOpen ? "text-[#E3CCCD]/80 bg-[#29206A]/20" : "text-white/40 hover:text-white/70 hover:bg-white/5"}
                                ${dragOverTarget === sub.id ? "ring-1 ring-[#E3CCCD]/30" : ""}`}
                            >
                              <div className="flex items-center gap-1.5 min-w-0">
                                <GripVertical className="w-3 h-3 shrink-0 opacity-0 group-hover/sub:opacity-40 transition-opacity" />
                                <span className="truncate">{sub.name}</span>
                              </div>
                              <ChevronDown className={`w-3 h-3 shrink-0 transition-transform duration-200 ${isSubOpen ? "rotate-180" : ""}`} />
                            </button>
                            <SectionPanel open={!!isSubOpen}>
                              <div className="mt-0.5 ml-2 border-l border-white/10 pl-2">
                                {renderPageList(subPages)}
                              </div>
                            </SectionPanel>
                          </div>
                        );
                      })}
                      {renderPageList(directPages)}
                    </div>
                  </SectionPanel>
                </div>
              );
            })}

            {uncategorizedPages.length > 0 && (
              <div
                onDragOver={(e) => onDragOver(e, "uncategorized")}
                onDrop={(e) => onDrop(e, "category", "uncategorized")}
                className={`pt-2 mt-1 border-t border-white/10 ${dragOverTarget === "uncategorized" ? "bg-white/5 rounded-lg" : ""}`}
              >
                <span className="text-[10px] uppercase tracking-widest text-white/30 px-2.5 mb-1 block">Sans catégorie</span>
                {renderPageList(uncategorizedPages)}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="p-4 space-y-3 shrink-0 bg-black/10 border-t border-white/5">
        {!readOnly && (
          <button
            onClick={onCreatePage}
            className="w-full flex items-center justify-start px-4 gap-3 py-2.5 rounded-xl border border-[#E3CCCD]/30 bg-[#29206A]/40 text-white hover:bg-white/10 text-[13px] transition-all shadow-lg"
          >
            <Plus className="w-4 h-4" /> Ajouter un article
          </button>
        )}
        <button
          onClick={onBack}
          className="w-full flex items-center justify-start px-3 gap-3 py-2 text-white/60 hover:text-white text-[13px] transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Retour
        </button>
      </div>
    </>
  );
}

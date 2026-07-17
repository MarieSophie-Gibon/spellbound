import { useMemo, useState } from "react";
import { BookOpen, ChevronDown, FileText, Menu, Plus, Search, X } from "lucide-react";
import type { Category, WikiPage } from "@/types/grimoire";

interface GrimoireMobileProps {
  pages: WikiPage[];
  categories: Category[];
  selectedPageId: string | null;
  expandedCats: Record<string, boolean>;
  showArticleListInView?: boolean;
  readOnly?: boolean;
  onSelectPage: (id: string) => void;
  onBackToArticleList: () => void;
  onCreatePage: () => void;
  onToggleCat: (id: string) => void;
  children: React.ReactNode;
}

function SmoothPanel({ open, children }: { open: boolean; children: React.ReactNode }) {
  return (
    <div className={`grid transition-all duration-300 ease-out ${open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-70"}`}>
      <div className="overflow-hidden">{children}</div>
    </div>
  );
}

export function GrimoireMobile({
  pages,
  categories,
  selectedPageId,
  expandedCats,
  showArticleListInView,
  readOnly,
  onSelectPage,
  onBackToArticleList,
  onCreatePage,
  onToggleCat,
  children,
}: GrimoireMobileProps) {
  const [isSummaryOpen, setIsSummaryOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [inlineQuery, setInlineQuery] = useState("");

  const normalizedQuery = query.trim().toLowerCase();

  const mainCategories = useMemo(
    () => categories.filter((c) => !c.parent_id).sort((a, b) => a.position_index - b.position_index),
    [categories],
  );

  const subCategoryMap = useMemo(() => {
    const map = new Map<string, Category[]>();
    for (const cat of categories) {
      if (!cat.parent_id) continue;
      const arr = map.get(cat.parent_id) ?? [];
      arr.push(cat);
      map.set(cat.parent_id, arr);
    }
    for (const arr of map.values()) {
      arr.sort((a, b) => a.position_index - b.position_index);
    }
    return map;
  }, [categories]);

  const pageMatches = (page: WikiPage) => {
    if (!normalizedQuery) return true;
    return page.title.toLowerCase().includes(normalizedQuery);
  };

  const inlineVisiblePages = useMemo(() => {
    const q = inlineQuery.trim().toLowerCase();
    const filterByQuery = (page: WikiPage) => !q || page.title.toLowerCase().includes(q);
    const result: Array<{ id: string; label: string; pages: WikiPage[] }> = [];

    for (const cat of mainCategories) {
      const categoryPages = pages
        .filter((p) => p.category_id === cat.id && !p.subcategory_id)
        .filter(filterByQuery)
        .sort((a, b) => a.position_index - b.position_index);

      if (categoryPages.length > 0) {
        result.push({ id: cat.id, label: cat.name, pages: categoryPages });
      }

      const subEntries = (subCategoryMap.get(cat.id) ?? []).map((sub) => ({
        id: sub.id,
        label: sub.name,
        pages: pages
          .filter((p) => p.subcategory_id === sub.id)
          .filter(filterByQuery)
          .sort((a, b) => a.position_index - b.position_index),
      }));

      for (const sub of subEntries) {
        if (sub.pages.length > 0) {
          result.push(sub);
        }
      }
    }

    const uncategorized = pages
      .filter((p) => !p.category_id)
      .filter(filterByQuery)
      .sort((a, b) => a.position_index - b.position_index);

    if (uncategorized.length > 0) {
      result.push({ id: "uncategorized", label: "Sans categorie", pages: uncategorized });
    }

    return result;
  }, [inlineQuery, mainCategories, pages, subCategoryMap]);

  const renderPages = (list: WikiPage[]) => {
    const visible = list.filter(pageMatches).sort((a, b) => a.position_index - b.position_index);
    if (!visible.length) return null;

    return (
      <div className="space-y-1">
        {visible.map((page) => {
          const isSelected = selectedPageId === page.id;
          return (
            <button
              key={page.id}
              type="button"
              onClick={() => {
                onSelectPage(page.id);
                setIsSummaryOpen(false);
              }}
              className={`w-full text-left rounded-xl px-3 py-2.5 text-[12px] transition-all ${
                isSelected
                  ? "bg-[#29206A]/55 text-white border border-[#E3CCCD]/28"
                  : "bg-white/4 text-white/65 border border-white/10 hover:bg-white/10 hover:text-white"
              }`}
            >
              <span className="line-clamp-2 leading-snug">{page.title}</span>
            </button>
          );
        })}
      </div>
    );
  };

  const hasVisibleContent =
    !normalizedQuery || pages.some(pageMatches) || categories.some((c) => c.name.toLowerCase().includes(normalizedQuery));

  return (
    <div className="lg:hidden flex-1 min-h-0 flex flex-col">
      <div className="sticky top-0 z-20 px-3 pt-3 pb-2 bg-linear-to-b from-[#100c2f]/95 via-[#100c2f]/85 to-transparent backdrop-blur-sm">
        <div className="relative h-11 rounded-xl border border-[#E3CCCD]/20 bg-[#1E1941]/72 backdrop-blur-xl px-2.5 flex items-center justify-between shadow-[0_12px_28px_rgba(0,0,0,0.3)] overflow-hidden">
          <div className="absolute inset-1 border border-[#E3CCCD]/14 rounded-[10px] pointer-events-none" />
          <div className="w-8" />

          <h2 className="relative z-10 font-serif text-base text-white tracking-[0.12em] uppercase">Grimoire</h2>

          {selectedPageId ? (
            <button
              type="button"
              onClick={() => {
                setIsSummaryOpen(false);
                onBackToArticleList();
              }}
              className="relative z-10 h-8 px-2.5 text-[#E3CCCD] hover:text-white hover:bg-white/10 transition-colors flex items-center gap-1.5"
              aria-label="Ouvrir le sommaire"
            >
              <Menu className="w-3.5 h-3.5" />
            </button>
          ) : (
            <div className="w-8" />
          )}
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-hidden px-2 pb-2">
        <div className="relative h-full rounded-xl border border-[#E3CCCD]/18 bg-[#1E1941]/35 backdrop-blur-xl overflow-hidden">
          <div className="absolute inset-1 border border-[#E3CCCD]/12 rounded-[10px] pointer-events-none" />
          {showArticleListInView ? (
            <div className="absolute inset-0 flex min-h-0 flex-col">
              <div className="px-4 pt-4 pb-3 border-b border-[#E3CCCD]/14">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/35" />
                  <input
                    value={inlineQuery}
                    onChange={(e) => setInlineQuery(e.target.value)}
                    placeholder="Rechercher un article"
                    className="w-full h-9 rounded-lg border border-[#E3CCCD]/20 bg-white/8 pl-9 pr-3 text-[12px] text-white placeholder:text-white/45 outline-none focus:border-[#E3CCCD]/55"
                  />
                </div>
              </div>

              <div className="flex-1 min-h-0 overflow-y-auto px-4 pb-4 pt-3 space-y-3 scrollbar-thin scrollbar-thumb-white/20">
                {inlineVisiblePages.length === 0 ? (
                  <div className="h-full py-10 flex flex-col items-center justify-center text-center text-white/40">
                    <BookOpen className="w-8 h-8 mb-2" />
                    <p className="text-[12px]">Aucun article trouve.</p>
                  </div>
                ) : (
                  inlineVisiblePages.map((group) => (
                    <div key={group.id} className="space-y-1.5">
                      <p className="text-[10px] uppercase tracking-widest text-[#E3CCCD]/75 px-1">{group.label}</p>
                      <div className="space-y-1">
                        {group.pages.map((page) => (
                          <button
                            key={page.id}
                            type="button"
                            onClick={() => {
                              onSelectPage(page.id);
                            }}
                            className="w-full text-left rounded-xl px-3 py-2.5 bg-white/4 text-white/70 border border-white/10 hover:bg-white/10 hover:text-white transition-colors"
                          >
                            <span className="flex items-center gap-2">
                              <FileText className="w-3.5 h-3.5 shrink-0 text-[#E3CCCD]/75" />
                              <span className="text-[12px] leading-snug line-clamp-2">{page.title}</span>
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          ) : (
            <div className="h-full min-h-0">{children}</div>
          )}
        </div>
      </div>

      {isSummaryOpen && (
        <div className="fixed inset-0 z-70 bg-black/55 backdrop-blur-[2px]" onClick={() => setIsSummaryOpen(false)}>
          <div
            className="absolute inset-0 sm:inset-y-0 sm:right-0 sm:left-auto sm:w-[24rem] bg-linear-to-b from-[#2f2a66]/95 via-[#2b255c]/95 to-[#25204f]/95 border-l border-[#E3CCCD]/20 shadow-[0_20px_45px_rgba(0,0,0,0.35)]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative h-full flex flex-col">
              <div className="absolute inset-1 border border-[#E3CCCD]/12 pointer-events-none" />
              <div className="absolute left-0 top-0 h-full w-2 bg-linear-to-b from-[#4B2757] to-[#372A84] border-r border-[#E3CCCD]/20" />

              <div className="relative z-10 shrink-0 pl-5 pr-4 py-3 border-b border-[#E3CCCD]/18 bg-black/8">
                <div className="flex items-center justify-between gap-2 mb-3">
                  <p className="text-[10px] uppercase tracking-[0.18em] text-[#E3CCCD]">Sommaire du grimoire</p>
                  <button
                    type="button"
                    onClick={() => setIsSummaryOpen(false)}
                    className="p-1.5 rounded-lg text-white/75 hover:text-white hover:bg-white/12 transition-colors"
                    aria-label="Fermer le sommaire"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/35" />
                  <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Rechercher un article"
                    className="w-full h-9 rounded-lg border border-[#E3CCCD]/22 bg-white/10 pl-9 pr-3 text-[12px] text-white placeholder:text-white/45 outline-none focus:border-[#E3CCCD]/55"
                  />
                </div>
              </div>

              <div className="relative z-10 flex-1 min-h-0 overflow-y-auto pl-5 pr-3 py-3 space-y-2 scrollbar-thin scrollbar-thumb-white/20">
                {!hasVisibleContent ? (
                  <div className="h-full flex flex-col items-center justify-center text-center text-white/35 px-5">
                    <BookOpen className="w-8 h-8 mb-2" />
                    <p className="text-[12px]">Aucun resultat pour cette recherche.</p>
                  </div>
                ) : (
                  <>
                    {mainCategories.map((cat) => {
                      const subs = subCategoryMap.get(cat.id) ?? [];
                      const directPages = pages.filter((p) => p.category_id === cat.id && !p.subcategory_id);
                      const isOpen = !!expandedCats[cat.id];

                      const catMatches = normalizedQuery ? cat.name.toLowerCase().includes(normalizedQuery) : true;
                      const hasSubOrPagesMatch =
                        directPages.some(pageMatches) ||
                        subs.some((sub) => sub.name.toLowerCase().includes(normalizedQuery) || pages.some((p) => p.subcategory_id === sub.id && pageMatches(p)));

                      if (normalizedQuery && !catMatches && !hasSubOrPagesMatch) return null;

                      return (
                        <div key={cat.id} className="rounded-xl border border-[#E3CCCD]/16 bg-white/6 overflow-hidden">
                          <button
                            type="button"
                            onClick={() => onToggleCat(cat.id)}
                            className={`w-full px-3 py-2.5 text-left flex items-center justify-between transition-colors ${
                              isOpen ? "bg-[#29206A]/45 text-[#E3CCCD]" : "text-white/68 hover:bg-white/10 hover:text-white"
                            }`}
                          >
                            <span className="text-[12px] font-medium truncate pr-2">{cat.name}</span>
                            <ChevronDown className={`w-3.5 h-3.5 shrink-0 transition-transform ${isOpen ? "rotate-180" : ""}`} />
                          </button>

                          <SmoothPanel open={isOpen}>
                            <div className="px-2 pb-2 space-y-1.5">
                              {subs.map((sub) => {
                                const subPages = pages.filter((p) => p.subcategory_id === sub.id);
                                const isSubOpen = !!expandedCats[sub.id];

                                const subMatches = normalizedQuery ? sub.name.toLowerCase().includes(normalizedQuery) : true;
                                const subPageMatches = subPages.some(pageMatches);
                                if (normalizedQuery && !subMatches && !subPageMatches) return null;

                                return (
                                  <div key={sub.id} className="rounded-lg border border-[#E3CCCD]/12 bg-black/14 overflow-hidden">
                                    <button
                                      type="button"
                                      onClick={() => onToggleCat(sub.id)}
                                      className={`w-full px-2.5 py-2 text-left flex items-center justify-between transition-colors ${
                                        isSubOpen ? "bg-[#29206A]/35 text-[#E3CCCD]/95" : "text-white/60 hover:bg-white/8 hover:text-white/85"
                                      }`}
                                    >
                                      <span className="text-[11px] truncate pr-2">{sub.name}</span>
                                      <ChevronDown className={`w-3 h-3 shrink-0 transition-transform ${isSubOpen ? "rotate-180" : ""}`} />
                                    </button>

                                    <SmoothPanel open={isSubOpen}>
                                      <div className="px-2 pb-2">{renderPages(subPages)}</div>
                                    </SmoothPanel>
                                  </div>
                                );
                              })}

                              {renderPages(directPages)}
                            </div>
                          </SmoothPanel>
                        </div>
                      );
                    })}

                    {(() => {
                      const uncategorizedPages = pages.filter((p) => !p.category_id);
                      const visible = uncategorizedPages.some(pageMatches);
                      if (!visible) return null;

                      return (
                        <div className="rounded-xl border border-[#E3CCCD]/16 bg-white/6 p-2.5">
                          <p className="text-[10px] uppercase tracking-widest text-[#E3CCCD]/70 mb-2">Sans categorie</p>
                          {renderPages(uncategorizedPages)}
                        </div>
                      );
                    })()}
                  </>
                )}
              </div>

              <div className="relative z-10 shrink-0 pl-5 pr-3 py-3 border-t border-[#E3CCCD]/18 bg-black/8 space-y-2">
                {!readOnly && (
                  <button
                    type="button"
                    onClick={() => {
                      onCreatePage();
                      setIsSummaryOpen(false);
                    }}
                    className="w-full h-10 rounded-xl border border-[#E3CCCD]/35 bg-[#29206A]/55 text-white text-[12px] font-medium hover:bg-[#29206A]/70 transition-colors flex items-center justify-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    Ajouter un article
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

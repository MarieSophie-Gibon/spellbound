import { useEffect, useRef, useState } from "react";
import { ArrowLeft, BookOpen, ChevronRight, Search, X } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useGrimoirePopup } from "@/contexts/GrimoirePopupContext";
import type { WikiPage, Category } from "@/types/grimoire";

interface PageListEntry {
  id: string;
  title: string;
  category_id: string | null;
}

export function GrimoirePopupModal() {
  const { state, closePopup } = useGrimoirePopup();
  const { open, pageId, searchQuery: initialQuery } = state;

  const [query, setQuery] = useState(initialQuery);
  const [pages, setPages] = useState<PageListEntry[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedPage, setSelectedPage] = useState<WikiPage | null>(null);
  const [loadingPage, setLoadingPage] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

  // Reset state on open
  useEffect(() => {
    if (open) {
      setQuery(initialQuery);
      setSelectedPage(null);
      setTimeout(() => searchRef.current?.focus(), 50);
    }
  }, [open, initialQuery]);

  // Fetch index on open
  useEffect(() => {
    if (!open) return;
    void Promise.all([
      supabase.from("wiki_pages").select("id, title, category_id").order("title"),
      supabase.from("categories").select("*"),
    ]).then(([{ data: pagesData }, { data: catsData }]) => {
      setPages(pagesData ?? []);
      setCategories(catsData ?? []);
    });
  }, [open]);

  // Auto-open pageId if provided
  useEffect(() => {
    if (!open || !pageId) return;
    setLoadingPage(true);
    void supabase.from("wiki_pages").select("*").eq("id", pageId).single().then(({ data }) => {
      setSelectedPage(data ?? null);
      setLoadingPage(false);
    });
  }, [open, pageId]);

  const filteredPages = query.trim()
    ? pages.filter((p) => p.title.toLowerCase().includes(query.toLowerCase()))
    : pages;

  const getCategoryName = (catId: string | null) =>
    catId ? (categories.find((c) => c.id === catId)?.name ?? "") : "";

  const openPage = (id: string) => {
    setLoadingPage(true);
    void supabase.from("wiki_pages").select("*").eq("id", id).single().then(({ data }) => {
      setSelectedPage(data ?? null);
      setLoadingPage(false);
    });
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-200 flex items-center justify-center p-4"
      onPointerDown={(e) => { if (e.target === e.currentTarget) closePopup(); }}
    >
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      <div className="relative w-full max-w-4xl max-h-[75vh] rounded-2xl border border-white/15 bg-[#1a1635]/95 shadow-2xl flex flex-col overflow-hidden">

        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-3.5 border-b border-white/10 shrink-0">
          {selectedPage ? (
            <button
              onClick={() => setSelectedPage(null)}
              className="p-1 rounded-full text-white/40 hover:text-white hover:bg-white/10 transition-colors shrink-0"
              title="Retour à la liste"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
          ) : (
            <BookOpen className="w-4 h-4 text-indigo-300 shrink-0" />
          )}

          {selectedPage ? (
            <span className="flex-1 text-sm font-medium text-white/80 truncate">{selectedPage.title}</span>
          ) : (
            <div className="flex-1 relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/30 pointer-events-none" />
              <input
                ref={searchRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Rechercher une règle, un sort..."
                className="w-full bg-white/5 border border-white/10 rounded-lg pl-8 pr-3 py-1.5 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-indigo-400/50 transition-colors"
              />
            </div>
          )}

          <button
            onClick={closePopup}
            className="p-1.5 rounded-full text-white/40 hover:text-white hover:bg-white/10 transition-colors shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 min-h-0 overflow-y-auto scrollbar-thin scrollbar-thumb-white/10">

          {/* Liste */}
          {!selectedPage && !loadingPage && (
            <>
              {filteredPages.length === 0 ? (
                <p className="px-5 py-4 text-[12px] text-white/30 italic">Aucun résultat</p>
              ) : (
                <div className="divide-y divide-white/5">
                  {filteredPages.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => openPage(p.id)}
                      className="w-full flex items-center justify-between px-5 py-3 text-left hover:bg-white/5 transition-colors group"
                    >
                      <div className="min-w-0">
                        <span className="block text-[13px] text-white/85 font-medium truncate group-hover:text-white transition-colors">{p.title}</span>
                        {getCategoryName(p.category_id) && (
                          <span className="block text-[10px] text-white/30 mt-0.5">{getCategoryName(p.category_id)}</span>
                        )}
                      </div>
                      <ChevronRight className="w-3.5 h-3.5 text-white/20 shrink-0 ml-3 group-hover:text-white/50 transition-colors" />
                    </button>
                  ))}
                </div>
              )}
            </>
          )}

          {/* Chargement */}
          {loadingPage && (
            <div className="flex items-center justify-center h-40 text-white/30 text-sm">Chargement...</div>
          )}

          {/* Contenu de la page */}
          {!loadingPage && selectedPage && (
            <div className="px-6 py-5">
              <div
                className="tiptap-editor text-white/85 font-light text-sm leading-relaxed"
                dangerouslySetInnerHTML={{ __html: selectedPage.content }}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

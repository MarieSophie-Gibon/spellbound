import { useState } from "react";
import { 
  useWikiCategories, 
  useWikiRules, 
  useDeleteWikiEntity, 
  useDeleteWikiCategory 
} from "@/hooks/useWiki";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Plus, Edit2, Trash2 } from "lucide-react";
import { WikiEditor } from "@/components/wiki/WikiEditor";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export function Wiki() {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const { data: categories, isLoading: isLoadingCats } = useWikiCategories();
  const effectiveCategory = selectedCategory ?? categories?.[0] ?? null;
  const { data: rules, isLoading: isLoadingRules } = useWikiRules(effectiveCategory);

  const deleteEntityMutation = useDeleteWikiEntity();
  const deleteCategoryMutation = useDeleteWikiCategory();

  // États pour l'éditeur
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [editingData, setEditingData] = useState<any | null>(null);

  // États pour la suppression
  const [entityToDelete, setEntityToDelete] = useState<string | null>(null);
  const [categoryToDelete, setCategoryToDelete] = useState<string | null>(null);

  const handleCreateNew = () => {
    setEditingData(null);
    setIsEditorOpen(true);
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleEdit = (rule: any) => {
    setEditingData(rule);
    setIsEditorOpen(true);
  };

  const renderRuleContent = (stats: Record<string, unknown>) => {
    return Object.entries(stats).map(([key, value]) => {
      
      // 1. FORMAT TIPTAP (Le nouveau standard)
      // Tiptap injecte maintenant les classes Tailwind directement dans les balises HTML.
      // On a juste à l'afficher tel quel !
      if (key === "html" && typeof value === "string") {
        return (
          <div 
            key={key} 
            className="w-full"
            dangerouslySetInnerHTML={{ __html: value }} 
          />
        );
      }

      // 2. FORMAT TEXTE BRUT (Transition ancienne édition)
      if (key === "texte") {
        const text = String(value);
        const sections = text.split(/(--- .*? ---)/g);

        return (
          <div key={key} className="space-y-4">
            {sections.map((section, index) => {
              if (section.startsWith("--- ") && section.endsWith(" ---")) {
                const title = section.replace(/---/g, "").trim();
                return (
                  <h4 key={index} className="text-amber-400/80 text-xs font-bold tracking-widest mt-6 first:mt-0 uppercase">
                    {title}
                  </h4>
                );
              }
              if (section.trim().length > 0) {
                return (
                  <p key={index} className="text-slate-300 leading-relaxed text-sm whitespace-pre-wrap">
                    {section.trim()}
                  </p>
                );
              }
              return null;
            })}
          </div>
        );
      }

      // 3. ANCIEN FORMAT JSON 
      const formattedKey = key.replace(/_/g, " ").toUpperCase();
      return (
        <div key={key} className="mb-4">
          <h4 className="text-amber-400/80 text-xs font-bold tracking-widest mb-2">
            {formattedKey}
          </h4>
          {typeof value === "string" ? (
            <p className="text-slate-300 leading-relaxed text-sm whitespace-pre-wrap">
              {value}
            </p>
          ) : Array.isArray(value) ? (
            <ul className="list-disc list-inside text-slate-300 text-sm space-y-1 pl-4">
              {value.map((item, index) => (
                <li key={index}>
                  {typeof item === "string" ? item : JSON.stringify(item)}
                </li>
              ))}
            </ul>
          ) : typeof value === "object" && value !== null ? (
            <div className="bg-black/20 p-3 rounded border border-white/5 space-y-2">
              {Object.entries(value).map(([subKey, subValue]) => (
                <div key={subKey} className="text-sm">
                  <span className="text-indigo-300 font-semibold">
                    {subKey} :{" "}
                  </span>
                  <span className="text-slate-300">{String(subValue)}</span>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      );
    });
  };

  return (
    <>
      <div className="flex h-[calc(100vh-80px)] gap-6 w-full max-w-7xl mx-auto mt-6">
        {/* Barre latérale des catégories */}
        <div className="w-72 flex flex-col min-h-0 bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden shadow-2xl">
          <div className="p-6 border-b border-white/10 bg-black/20 shrink-0 flex justify-between items-center">
            <div>
              <h2 className="text-xl font-serif text-amber-300 tracking-wide">
                Archives
              </h2>
              <p className="text-xs text-slate-400 uppercase tracking-widest mt-1">
                Catégories
              </p>
            </div>
            {/* BOUTON NOUVEAU */}
            <Button
              size="icon"
              variant="ghost"
              onClick={handleCreateNew}
              className="text-amber-400 hover:bg-amber-400/20 hover:text-amber-300 rounded-full"
            >
              <Plus className="w-5 h-5" />
            </Button>
          </div>

          <div className="flex-1 min-h-0">
            <ScrollArea className="h-full p-4">
              {isLoadingCats ? (
                <div className="space-y-3">
                  {[1, 2, 3, 4].map((i) => (
                    <Skeleton key={i} className="h-10 w-full bg-white/5" />
                  ))}
                </div>
              ) : (
                <div className="space-y-2">
                  {categories?.map((cat) => (
                    <div key={cat} className="relative group flex items-center">
                      <button
                        onClick={() => setSelectedCategory(cat)}
                        className={`w-full text-left px-4 py-3 rounded-xl transition-all duration-300 text-sm font-medium tracking-wide pr-10 ${
                          effectiveCategory === cat
                            ? "bg-linear-to-r from-amber-500/20 to-purple-500/20 text-amber-200 border border-amber-500/30 shadow-[0_0_15px_rgba(245,158,11,0.1)]"
                            : "text-slate-400 hover:text-slate-200 hover:bg-white/5"
                        }`}
                      >
                        {cat}
                      </button>
                      {/* BOUTON SUPPRIMER CATÉGORIE */}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="absolute right-1 opacity-0 group-hover:opacity-100 text-red-500/70 hover:text-red-400 hover:bg-red-500/10 h-8 w-8 rounded-full transition-opacity"
                        onClick={(e) => {
                          e.stopPropagation();
                          setCategoryToDelete(cat);
                        }}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>
        </div>

        {/* Zone de contenu des règles */}
        <div className="flex-1 flex flex-col min-h-0 bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden shadow-2xl relative">
          <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-[100px] pointer-events-none" />

          <div className="p-8 pb-4 border-b border-white/10 bg-linear-to-b from-black/40 to-transparent shrink-0">
            <h1 className="text-3xl font-serif text-transparent bg-clip-text bg-linear-to-r from-slate-100 to-slate-400">
              {effectiveCategory || "Sélectionnez une catégorie"}
            </h1>
          </div>

          <div className="flex-1 min-h-0">
            <ScrollArea className="h-full p-8">
              {isLoadingRules ? (
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-16 w-full bg-white/5" />
                  ))}
                </div>
              ) : rules && rules.length > 0 ? (
                <Accordion
                  type="single"
                  collapsible
                  className="w-full space-y-4"
                >
                  {rules.map((rule) => (
                    <AccordionItem
                      key={rule.id}
                      value={rule.id}
                      className="bg-black/40 border border-white/10 rounded-lg px-6 data-[state=open]:border-amber-500/30 data-[state=open]:bg-black/60 transition-all"
                    >
                      <div className="flex justify-between items-center w-full">
                        <AccordionTrigger className="text-lg font-medium text-slate-200 hover:text-amber-200 hover:no-underline py-4 text-left flex-1 pr-4">
                          {rule.name}
                        </AccordionTrigger>
                        
                        {/* BOUTONS D'ACTION (EDITER / SUPPRIMER) */}
                        <div className="flex gap-1 shrink-0">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEdit(rule)}
                            className="text-slate-500 hover:text-amber-300"
                          >
                            <Edit2 className="w-4 h-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => setEntityToDelete(rule.id)} 
                            className="text-slate-500 hover:text-red-400"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>

                      </div>
                      <AccordionContent className="pt-2 pb-6 border-t border-white/5 mt-2">
                        {renderRuleContent(rule.stats)}
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              ) : (
                <p className="text-slate-500 text-center mt-10 italic">
                  Aucun manuscrit trouvé dans cette section.
                </p>
              )}
            </ScrollArea>
          </div>
        </div>
      </div>

      {/* INJECTION DE LA MODALE D'ÉDITION */}
      <WikiEditor
        isOpen={isEditorOpen}
        onClose={() => setIsEditorOpen(false)}
        initialData={editingData}
      />

      {/* ALERTE DE SUPPRESSION D'UN ARTICLE SEUL */}
      <AlertDialog open={!!entityToDelete} onOpenChange={() => setEntityToDelete(null)}>
        <AlertDialogContent className="bg-slate-900 border-red-900/50 text-slate-200">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-red-400">Détruire ce manuscrit ?</AlertDialogTitle>
            <AlertDialogDescription className="text-slate-400">
              Cette action est irréversible. Le sortilège d'oblitération effacera cette règle à tout jamais.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-transparent border-white/10 hover:bg-white/5 hover:text-white">Annuler</AlertDialogCancel>
            <AlertDialogAction 
              className="bg-red-600 hover:bg-red-700 text-white" 
              onClick={() => { 
                if (entityToDelete) deleteEntityMutation.mutate(entityToDelete); 
                setEntityToDelete(null); 
              }}
            >
              Détruire
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ALERTE DE SUPPRESSION DE CATÉGORIE EN CASCADE */}
      <AlertDialog open={!!categoryToDelete} onOpenChange={() => setCategoryToDelete(null)}>
        <AlertDialogContent className="bg-slate-900 border-red-900/50 text-slate-200">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-red-400">Raser la catégorie entière ?</AlertDialogTitle>
            <AlertDialogDescription className="text-slate-400">
              Attention Voyageur ! Cela déclenchera une suppression en cascade. <strong className="text-red-300">TOUTES les règles</strong> appartenant à la catégorie <span className="italic">{categoryToDelete}</span> seront incinérées.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-transparent border-white/10 hover:bg-white/5 hover:text-white">Épargner</AlertDialogCancel>
            <AlertDialogAction 
              className="bg-red-600 hover:bg-red-700 text-white" 
              onClick={() => { 
                if (categoryToDelete) {
                  deleteCategoryMutation.mutate(categoryToDelete);
                  // Si on supprime la catégorie actuellement active, on désélectionne
                  if (effectiveCategory === categoryToDelete) setSelectedCategory(null);
                }
                setCategoryToDelete(null); 
              }}
            >
              Incinérer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
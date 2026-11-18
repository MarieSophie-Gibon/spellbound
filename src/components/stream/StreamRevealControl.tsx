import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Eye, EyeOff, Loader2, Sparkles, X } from "lucide-react";
import { isCharacterReveal, type StreamReveal } from "@/lib/streamReveal";
import type { useStreamReveal } from "@/hooks/scenarios/useStreamReveal";

type StreamRevealApi = ReturnType<typeof useStreamReveal>;

function revealLabel(reveal: StreamReveal) {
  if (reveal.cards.length > 1) return `Rencontre (${reveal.cards.reduce((n, c) => n + (c.count ?? 1), 0)})`;
  return reveal.cards[0]?.name || (reveal.kind === "location" ? "Lieu" : "Image");
}

/**
 * Bouton « Montrer aux joueurs » ; actif (et retire la révélation) quand cette
 * source est affichée. Pour un PNJ ou un monstre, propose aussi de révéler sans le nom.
 */
export function StreamRevealButton({
  active,
  onReveal,
  onClear,
  allowHiddenName = false,
  disabled = false,
  menuPlacement = "right",
  className = "",
  title = "Montrer aux joueurs",
}: {
  active: boolean;
  onReveal: (nameHidden: boolean) => void;
  onClear: () => void;
  allowHiddenName?: boolean;
  disabled?: boolean;
  /** right : à droite du bouton (colonne d'actions) ; below : dessous, aligné à droite (barre d'outils). */
  menuPlacement?: "right" | "below";
  className?: string;
  title?: string;
}) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isMenuOpen) return;
    const close = (e: MouseEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) setIsMenuOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [isMenuOpen]);

  const handleClick = () => {
    if (active) return onClear();
    if (allowHiddenName) return setIsMenuOpen((open) => !open);
    onReveal(false);
  };

  const choose = (nameHidden: boolean) => {
    setIsMenuOpen(false);
    onReveal(nameHidden);
  };

  return (
    <div ref={menuRef} className="relative">
      <button
        type="button"
        onClick={handleClick}
        disabled={disabled}
        title={active ? "Retirer de l'écran des joueurs" : title}
        className={`p-1 md:p-1.5 rounded transition-all disabled:opacity-40 disabled:cursor-not-allowed ${
          active
            ? "text-amber-300 bg-amber-400/15 hover:bg-amber-400/25"
            : "text-white/40 hover:text-amber-300 hover:bg-amber-400/10"
        } ${className}`}
      >
        <Sparkles className="w-4 h-4" />
      </button>
      {isMenuOpen && (
        <div
          className={`absolute z-50 min-w-44 ${
            menuPlacement === "below" ? "right-0 top-full mt-1" : "left-full top-0 ml-1"
          }`}
        >
          <div className="rounded-xl bg-[#1b1738] border border-white/15 shadow-2xl overflow-hidden">
            <div className="px-3 py-1.5 text-[9px] uppercase tracking-widest text-white/30 border-b border-white/5">
              Écran des joueurs
            </div>
            <button
              onClick={() => choose(false)}
              className="w-full flex items-center gap-2 px-3 py-2 text-[12px] text-white/80 hover:bg-amber-500/10 transition-colors"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-300" /> Révéler
            </button>
            <button
              onClick={() => choose(true)}
              className="w-full flex items-center gap-2 px-3 py-2 text-[12px] text-white/80 hover:bg-amber-500/10 transition-colors border-t border-white/5"
            >
              <EyeOff className="w-3.5 h-3.5 text-white/50" /> Révéler sans le nom
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/** Pastille « En direct » : ce que voient les joueurs, avec nom à dévoiler et retrait. */
export function StreamRevealControl({ api }: { api: StreamRevealApi }) {
  const { current, isOpeningScreen, clear, setNameHidden } = api;
  if (!current && !isOpeningScreen) return null;

  return createPortal(
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-200 max-w-[calc(100vw-2rem)]">
      <div className="flex items-center gap-2 pl-2 pr-1.5 py-1.5 rounded-full bg-[#1b1738]/95 border border-amber-300/30 shadow-2xl shadow-black/50 backdrop-blur">
        {isOpeningScreen && !current ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin text-amber-300 shrink-0 ml-1" />
            <span className="text-[12px] text-white/70 pr-2">Ouverture de l'écran des joueurs…</span>
            <button
              onClick={clear}
              className="p-1.5 rounded-full text-white/40 hover:text-white hover:bg-white/10 transition-colors"
              title="Annuler"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </>
        ) : current ? (
          <>
            <span className="relative flex w-2 h-2 shrink-0 ml-1">
              <span className="absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75 animate-ping" />
              <span className="relative inline-flex w-2 h-2 rounded-full bg-red-500" />
            </span>
            {current.cards[0]?.imageUrl && (
              <img src={current.cards[0].imageUrl} alt="" className="w-7 h-7 rounded-full object-cover border border-white/15 shrink-0" />
            )}
            <span className="text-[12px] text-white/85 truncate max-w-48">
              <span className="text-white/40">Joueurs : </span>
              {revealLabel(current)}
            </span>
            {isCharacterReveal(current.kind) && (
              <button
                onClick={() => setNameHidden(!current.nameHidden)}
                className={`flex items-center gap-1 px-2 py-1 rounded-full text-[11px] transition-colors ${
                  current.nameHidden
                    ? "bg-amber-400/15 text-amber-200 hover:bg-amber-400/25"
                    : "text-white/50 hover:text-white hover:bg-white/10"
                }`}
                title={current.nameHidden ? "Dévoiler le nom aux joueurs" : "Masquer le nom (???)"}
              >
                {current.nameHidden ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                {current.nameHidden ? "Dévoiler le nom" : "Masquer le nom"}
              </button>
            )}
            <button
              onClick={clear}
              className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium bg-white/8 text-white/80 hover:bg-red-500/20 hover:text-red-200 transition-colors"
              title="Retirer de l'écran des joueurs"
            >
              <X className="w-3.5 h-3.5" /> Retirer
            </button>
          </>
        ) : null}
      </div>
    </div>,
    document.body,
  );
}

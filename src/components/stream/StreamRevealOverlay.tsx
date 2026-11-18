import { useEffect, useRef, useState } from "react";
import { Skull, User } from "lucide-react";
import {
  STREAM_REVEAL_CHANNEL,
  isCharacterReveal,
  type StreamReveal,
  type StreamRevealCard,
  type StreamRevealMessage,
} from "@/lib/streamReveal";
import "./streamReveal.css";

const LEAVE_MS = 450;
const PRELOAD_TIMEOUT_MS = 2500;
const ENTRANCE_DELAY_S = 0.35;
const STAGGER_S = 0.18;

// Les images sont chargées avant l'animation : une carte ne doit jamais
// arriver vide puis se remplir sous les yeux des joueurs.
function preloadImages(urls: string[]) {
  const loads = urls.map(
    (url) =>
      new Promise<void>((resolve) => {
        const img = new Image();
        img.onload = img.onerror = () => resolve();
        img.src = url;
      }),
  );
  const timeout = new Promise<void>((resolve) => window.setTimeout(resolve, PRELOAD_TIMEOUT_MS));
  return Promise.race([Promise.all(loads).then(() => undefined), timeout]);
}

const HEADLINES: Record<StreamReveal["kind"], string | null> = {
  monster: "Nouvelle rencontre",
  npc: "Nouvelle rencontre",
  location: "Nouveau lieu",
  image: null,
};

function cardWidth(count: number) {
  if (count <= 2) return "clamp(190px, 22vw, 320px)";
  if (count <= 4) return "clamp(150px, 17vw, 260px)";
  return "clamp(110px, 12.5vw, 200px)";
}

function Headline({ text }: { text: string }) {
  return (
    <div className="flex items-center gap-4 sm:gap-6 mb-8 sm:mb-12">
      <div className="sr-line-in h-px w-12 sm:w-28 bg-linear-to-r from-transparent to-amber-300/70 origin-right" />
      <h2
        className="sr-label-in font-serif uppercase text-amber-100 text-lg sm:text-3xl tracking-[0.35em] whitespace-nowrap"
        style={{ textShadow: "0 0 24px rgba(251,191,36,0.55)", animationDelay: "0.15s" }}
      >
        {text}
      </h2>
      <div className="sr-line-in h-px w-12 sm:w-28 bg-linear-to-l from-transparent to-amber-300/70 origin-left" />
    </div>
  );
}

function CharacterCard({
  card,
  index,
  total,
  kind,
  nameHidden,
}: {
  card: StreamRevealCard;
  index: number;
  total: number;
  kind: StreamReveal["kind"];
  nameHidden: boolean;
}) {
  const offset = index - (total - 1) / 2;
  const step = total > 1 ? Math.min(7, 28 / (total - 1)) : 0;
  const delay = ENTRANCE_DELAY_S + index * STAGGER_S;
  const Placeholder = kind === "monster" ? Skull : User;
  // À l'entrée, le nom suit la carte ; quand le MJ le dévoile ensuite, il apparaît aussitôt.
  const [initialNameHidden] = useState(nameHidden);
  const nameDelay = nameHidden === initialNameHidden ? delay + 0.5 : 0;

  return (
    // Éventail : rotation fixe ; l'animation d'entrée et le flottement sont sur des enfants.
    <div
      className="flex flex-col items-center"
      style={{
        width: cardWidth(total),
        transform: `rotate(${offset * step}deg) translateY(${Math.abs(offset) * 14}px)`,
        marginInline: total > 3 ? "-0.8vw" : "1vw",
        zIndex: 10 - Math.round(Math.abs(offset)),
      }}
    >
      <div className="sr-float w-full" style={{ animationDelay: `${index * 0.7}s` }}>
        <div className="sr-card-in w-full" style={{ animationDelay: `${delay}s`, perspective: "900px" }}>
          <div
            className="sr-glow relative w-full aspect-3/4 rounded-2xl overflow-hidden border-2 border-amber-200/60 bg-linear-to-b from-[#2a2350] to-[#120f26]"
            style={{ animationDelay: `${delay + 1}s` }}
          >
            {card.imageUrl ? (
              <img src={card.imageUrl} alt="" className="absolute inset-0 w-full h-full object-cover" draggable={false} />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center">
                <Placeholder className="w-1/3 h-1/3 text-white/15" />
              </div>
            )}
            <div className="absolute inset-0 bg-linear-to-t from-black/50 via-transparent to-transparent" />
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
              <div
                className="sr-shine absolute inset-y-0 w-1/3 bg-linear-to-r from-transparent via-white/35 to-transparent"
                style={{ animationDelay: `${delay + 0.85}s` }}
              />
            </div>
            {card.count && card.count > 1 && (
              <div className="absolute top-2 right-2 px-2 py-0.5 rounded-full bg-black/70 border border-amber-200/50 text-amber-100 font-serif text-sm sm:text-lg">
                ×{card.count}
              </div>
            )}
          </div>
        </div>
      </div>
      <div
        // Rejoue l'apparition du nom quand le MJ le dévoile.
        key={nameHidden ? "hidden" : "shown"}
        className="sr-label-in mt-4 sm:mt-6 font-serif uppercase text-center text-white text-sm sm:text-2xl tracking-[0.18em] leading-tight"
        style={{ textShadow: "0 2px 14px rgba(0,0,0,0.9), 0 0 18px rgba(251,191,36,0.35)", animationDelay: `${nameDelay}s` }}
      >
        {nameHidden ? "???" : card.name}
      </div>
    </div>
  );
}

function SceneImage({ card }: { card: StreamRevealCard }) {
  return (
    <div className="flex flex-col items-center max-w-[86vw]">
      <div
        className="sr-image-in sr-glow relative rounded-2xl overflow-hidden border-2 border-amber-200/50"
        style={{ animationDelay: `${ENTRANCE_DELAY_S}s` }}
      >
        {card.imageUrl && (
          <img
            src={card.imageUrl}
            alt=""
            className="sr-kenburns block max-w-[86vw] max-h-[68vh] object-contain"
            draggable={false}
          />
        )}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div
            className="sr-shine absolute inset-y-0 w-1/4 bg-linear-to-r from-transparent via-white/25 to-transparent"
            style={{ animationDelay: `${ENTRANCE_DELAY_S + 1}s` }}
          />
        </div>
      </div>
      {card.name && (
        <p
          className="sr-label-in mt-5 sm:mt-7 font-serif text-center text-white text-base sm:text-3xl tracking-[0.12em]"
          style={{ textShadow: "0 2px 14px rgba(0,0,0,0.9)", animationDelay: `${ENTRANCE_DELAY_S + 0.6}s` }}
        >
          {card.name}
        </p>
      )}
    </div>
  );
}

/** Écran streaming : reçoit les révélations du MJ et les met en scène par-dessus la map. */
export function StreamRevealOverlay() {
  const [shown, setShown] = useState<StreamReveal | null>(null);
  const [leaving, setLeaving] = useState(false);
  // Révélation demandée par le MJ (peut être en cours de préchargement).
  const targetRef = useRef<StreamReveal | null>(null);
  const shownIdRef = useRef<string | null>(null);
  const leaveTimerRef = useRef<number | null>(null);

  useEffect(() => {
    if (typeof BroadcastChannel === "undefined") return;
    const ch = new BroadcastChannel(STREAM_REVEAL_CHANNEL);
    const postState = () =>
      ch.postMessage({ type: "state", reveal: targetRef.current } satisfies StreamRevealMessage);

    const display = (reveal: StreamReveal) => {
      if (leaveTimerRef.current !== null) window.clearTimeout(leaveTimerRef.current);
      leaveTimerRef.current = null;
      shownIdRef.current = reveal.id;
      setLeaving(false);
      setShown(reveal);
    };

    ch.onmessage = (e: MessageEvent<StreamRevealMessage>) => {
      const msg = e.data;
      if (msg?.type === "query") {
        postState();
      } else if (msg?.type === "show") {
        const reveal = msg.reveal;
        targetRef.current = reveal;
        postState();
        if (reveal.id === shownIdRef.current) {
          // Même révélation (nom dévoilé ou masqué) : pas de nouvelle entrée.
          setShown(reveal);
          return;
        }
        const urls = reveal.cards.map((c) => c.imageUrl).filter((u): u is string => !!u);
        void preloadImages(urls).then(() => {
          // Une autre révélation ou un retrait est arrivé entre-temps.
          if (targetRef.current?.id === reveal.id) display(targetRef.current);
        });
      } else if (msg?.type === "clear") {
        targetRef.current = null;
        postState();
        if (!shownIdRef.current) return;
        setLeaving(true);
        if (leaveTimerRef.current !== null) window.clearTimeout(leaveTimerRef.current);
        leaveTimerRef.current = window.setTimeout(() => {
          leaveTimerRef.current = null;
          shownIdRef.current = null;
          setShown(null);
          setLeaving(false);
        }, LEAVE_MS);
      }
    };

    // Annonce l'écran aux onglets MJ (et récupère une révélation en attente).
    postState();
    const onPageHide = () => ch.postMessage({ type: "closed" } satisfies StreamRevealMessage);
    window.addEventListener("pagehide", onPageHide);
    return () => {
      window.removeEventListener("pagehide", onPageHide);
      if (leaveTimerRef.current !== null) window.clearTimeout(leaveTimerRef.current);
      ch.close();
    };
  }, []);

  if (!shown) return null;

  const isCharacter = isCharacterReveal(shown.kind);
  const headline = HEADLINES[shown.kind];

  return (
    <div className={`fixed inset-0 z-40 pointer-events-none ${leaving ? "sr-leaving" : ""}`}>
      <div className="sr-backdrop absolute inset-0 bg-black/70 backdrop-blur-md" />
      <div key={shown.id} className="absolute inset-0 flex flex-col items-center justify-center px-4 overflow-hidden">
        <div
          className="sr-burst absolute left-1/2 top-1/2 w-[70vmin] h-[70vmin] rounded-full pointer-events-none"
          style={{
            background: "radial-gradient(circle, rgba(253,230,138,0.55) 0%, rgba(251,191,36,0.18) 35%, transparent 70%)",
            animationDelay: `${ENTRANCE_DELAY_S - 0.1}s`,
          }}
        />
        {headline && <Headline text={headline} />}
        {isCharacter ? (
          <div className="relative flex items-start justify-center">
            {shown.cards.map((card, i) => (
              <CharacterCard
                key={`${card.name}-${i}`}
                card={card}
                index={i}
                total={shown.cards.length}
                kind={shown.kind}
                nameHidden={shown.nameHidden}
              />
            ))}
          </div>
        ) : (
          shown.cards[0] && <SceneImage card={shown.cards[0]} />
        )}
      </div>
    </div>
  );
}

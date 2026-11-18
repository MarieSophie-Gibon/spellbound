import { useCallback, useEffect, useRef, useState } from "react";
import {
  STREAM_REVEAL_CHANNEL,
  STREAM_SCREEN_PATH,
  type StreamReveal,
  type StreamRevealMessage,
} from "@/lib/streamReveal";

/**
 * Côté MJ : envoie les révélations à l'écran streaming et suit ce qu'il affiche.
 * Si aucun écran n'est ouvert, la révélation l'ouvre et lui est envoyée dès
 * qu'il est prêt.
 */
export function useStreamReveal() {
  const [current, setCurrent] = useState<StreamReveal | null>(null);
  const [screenOpen, setScreenOpen] = useState(false);
  const [isOpeningScreen, setIsOpeningScreen] = useState(false);
  const channelRef = useRef<BroadcastChannel | null>(null);
  const pendingRef = useRef<StreamReveal | null>(null);
  const screenOpenRef = useRef(false);

  useEffect(() => {
    if (typeof BroadcastChannel === "undefined") return;
    const ch = new BroadcastChannel(STREAM_REVEAL_CHANNEL);
    channelRef.current = ch;
    ch.onmessage = (e: MessageEvent<StreamRevealMessage>) => {
      const msg = e.data;
      if (msg?.type === "state") {
        screenOpenRef.current = true;
        setScreenOpen(true);
        const pending = pendingRef.current;
        if (pending) {
          pendingRef.current = null;
          setIsOpeningScreen(false);
          ch.postMessage({ type: "show", reveal: pending } satisfies StreamRevealMessage);
          setCurrent(pending);
          return;
        }
        setCurrent(msg.reveal);
      } else if (msg?.type === "closed") {
        screenOpenRef.current = false;
        setScreenOpen(false);
        setCurrent(null);
      }
    };
    ch.postMessage({ type: "query" } satisfies StreamRevealMessage);
    return () => {
      ch.close();
      channelRef.current = null;
    };
  }, []);

  const reveal = useCallback((next: StreamReveal) => {
    const ch = channelRef.current;
    if (!ch) return;
    if (!screenOpenRef.current) {
      // L'écran envoie son état à l'ouverture : la révélation partira à ce moment-là.
      pendingRef.current = next;
      setIsOpeningScreen(true);
      window.open(STREAM_SCREEN_PATH, "_blank", "noopener");
      return;
    }
    ch.postMessage({ type: "show", reveal: next } satisfies StreamRevealMessage);
    setCurrent(next);
  }, []);

  const clear = useCallback(() => {
    pendingRef.current = null;
    setIsOpeningScreen(false);
    channelRef.current?.postMessage({ type: "clear" } satisfies StreamRevealMessage);
    setCurrent(null);
  }, []);

  // Même id : l'écran met le nom à jour sans rejouer l'animation d'entrée.
  const setNameHidden = useCallback(
    (nameHidden: boolean) => {
      if (!current) return;
      const next = { ...current, nameHidden };
      channelRef.current?.postMessage({ type: "show", reveal: next } satisfies StreamRevealMessage);
      setCurrent(next);
    },
    [current],
  );

  return { current, screenOpen, isOpeningScreen, reveal, clear, setNameHidden };
}

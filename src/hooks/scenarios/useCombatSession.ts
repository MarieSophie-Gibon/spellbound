import { useCallback, useEffect, useRef, useState } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

// Session de combat partagée en temps réel entre le MJ et ses co-MJ (sessions/ordinateurs distincts).
// Transport : Supabase Realtime Broadcast (WebSocket, sans passer par la base) + Presence.
// L'état est découpé en tranches indépendantes : chaque changement local n'envoie que sa tranche,
// ce qui évite qu'une modification de l'un écrase une modification simultanée de l'autre.

export type CombatSlice =
  | "combatants"
  | "activeCombatantId"
  | "round"
  | "mapTokens"
  | "encounters"
  | "fogEnabled"
  | "fogReveals"
  | "combatNote"
  | "roundTriggers"
  | "battlemapUrl";

export type CombatSnapshot = Partial<Record<CombatSlice, unknown>>;

export interface CombatSessionPeer {
  clientId: string;
  userId: string | null;
  name: string;
  joinedAt: number;
}

export type CombatSessionStatus = "idle" | "connecting" | "syncing" | "ready" | "error";

// Événements ponctuels, hors tranches d'état :
// - "combatants-patch" : combattants ajoutés/modifiés/retirés (la liste complète dépasse vite
//   la taille max d'un message Broadcast, surtout avec les voies des PJ) ;
// - "drag-preview" : positions des jetons en cours de glissement (null = fin du glissement).
export type CombatSessionEvent = "combatants-patch" | "drag-preview";

interface UseCombatSessionOptions {
  chapitreId: string;
  // La session ne démarre qu'une fois l'état local hydraté (sinon l'hydratation écraserait la synchro).
  enabled: boolean;
  userId: string | null;
  name: string;
  getSnapshot: () => CombatSnapshot;
  onRemoteSlice: (slice: CombatSlice, value: unknown) => void;
  onRemoteSnapshot: (snapshot: CombatSnapshot) => void;
  onRemoteEvent?: (event: CombatSessionEvent, payload: unknown) => void;
}

// Délai max d'attente d'un état complet à l'arrivée ; au-delà, on se considère seul.
const SYNC_TIMEOUT_MS = 1500;

// Envoie un message et journalise les rejets (ex. message trop gros pour Supabase Realtime).
async function sendLogged(channel: RealtimeChannel, event: string, payload: unknown) {
  try {
    const result = await channel.send({ type: "broadcast", event, payload });
    if (result !== "ok") {
      const size = JSON.stringify(payload)?.length ?? 0;
      console.warn(`[combat-session] envoi "${event}" refusé (${result}), ~${Math.round(size / 1024)} Ko`);
    }
  } catch (error) {
    console.warn(`[combat-session] envoi "${event}" en erreur`, error);
  }
}

function makeClientId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function useCombatSession({
  chapitreId,
  enabled,
  userId,
  name,
  getSnapshot,
  onRemoteSlice,
  onRemoteSnapshot,
  onRemoteEvent,
}: UseCombatSessionOptions) {
  const [status, setStatus] = useState<CombatSessionStatus>("idle");
  const [peers, setPeers] = useState<CombatSessionPeer[]>([]);

  const clientIdRef = useRef<string>(makeClientId());
  const channelRef = useRef<RealtimeChannel | null>(null);
  const readyRef = useRef(false);

  // Les callbacks changent à chaque rendu : on les lit via des refs pour ne pas recréer le canal.
  const getSnapshotRef = useRef(getSnapshot);
  const onRemoteSliceRef = useRef(onRemoteSlice);
  const onRemoteSnapshotRef = useRef(onRemoteSnapshot);
  const onRemoteEventRef = useRef(onRemoteEvent);
  useEffect(() => {
    getSnapshotRef.current = getSnapshot;
    onRemoteSliceRef.current = onRemoteSlice;
    onRemoteSnapshotRef.current = onRemoteSnapshot;
    onRemoteEventRef.current = onRemoteEvent;
  }, [getSnapshot, onRemoteSlice, onRemoteSnapshot, onRemoteEvent]);

  const identityRef = useRef({ userId, name });
  useEffect(() => {
    identityRef.current = { userId, name };
  }, [userId, name]);

  useEffect(() => {
    if (!enabled || !chapitreId) return;

    const clientId = clientIdRef.current;
    const joinedAt = Date.now();
    let syncTimer: number | null = null;
    readyRef.current = false;

    const markReady = () => {
      if (!readyRef.current) console.info("[combat-session] session prête");
      if (syncTimer !== null) window.clearTimeout(syncTimer);
      syncTimer = null;
      readyRef.current = true;
      setStatus("ready");
    };

    const topic = `combat-session:${chapitreId}`;
    let cancelled = false;
    let channel: RealtimeChannel | null = null;

    const connect = () => {
      channel = supabase.channel(topic, {
        config: {
          // ack : le serveur confirme chaque message, ce qui permet de détecter les rejets.
          broadcast: { self: false, ack: true },
          presence: { key: clientId },
        },
      });
      const ch = channel;
      channelRef.current = ch;

      ch
        .on("broadcast", { event: "slice" }, ({ payload }) => {
          const msg = payload as { from: string; slice: CombatSlice; value: unknown };
          if (!msg || msg.from === clientId) return;
          onRemoteSliceRef.current(msg.slice, msg.value);
        })
        .on("broadcast", { event: "event" }, ({ payload }) => {
          const msg = payload as { from: string; event: CombatSessionEvent; data: unknown };
          if (!msg || msg.from === clientId) return;
          onRemoteEventRef.current?.(msg.event, msg.data);
        })
        .on("broadcast", { event: "sync-request" }, ({ payload }) => {
          const msg = payload as { from: string };
          // Seules les sessions déjà synchronisées répondent : deux sessions qui arrivent en même
          // temps ne s'échangent pas leurs états (pas de comparaison d'horloges entre machines).
          if (!msg || msg.from === clientId) return;
          console.info(`[combat-session] demande d'état reçue de ${msg.from}${readyRef.current ? ", envoi de l'état" : " (pas encore prête, ignorée)"}`);
          if (!readyRef.current) return;
          void sendLogged(ch, "sync-snapshot", { from: clientId, to: msg.from, snapshot: getSnapshotRef.current() });
        })
        .on("broadcast", { event: "sync-snapshot" }, ({ payload }) => {
          const msg = payload as { from: string; to: string; snapshot: CombatSnapshot };
          if (!msg || msg.to !== clientId || readyRef.current) return;
          console.info("[combat-session] état complet reçu de", msg.from);
          onRemoteSnapshotRef.current(msg.snapshot ?? {});
          markReady();
        })
        .on("presence", { event: "sync" }, () => {
          const state = ch.presenceState<CombatSessionPeer>();
          const list = Object.values(state)
            .map((entries) => entries[0])
            .filter((p): p is CombatSessionPeer & { presence_ref: string } => !!p && p.clientId !== clientId)
            .map(({ clientId: id, userId: uid, name: peerName, joinedAt: at }) => ({ clientId: id, userId: uid, name: peerName, joinedAt: at }))
            .sort((a, b) => a.joinedAt - b.joinedAt);
          console.info(`[combat-session] présence : ${list.length} autre(s) session(s)`, list.map((p) => p.name));
          setPeers(list);
        })
        .subscribe((subscribeStatus, err) => {
          if (subscribeStatus === "CHANNEL_ERROR" || subscribeStatus === "TIMED_OUT") {
            console.warn(`[combat-session] canal ${subscribeStatus}`, err ?? "");
            if (!cancelled) setStatus("error");
            return;
          }
          console.info(`[combat-session] canal ${topic} : ${subscribeStatus}`);
          if (subscribeStatus !== "SUBSCRIBED" || cancelled) return;
          void ch.track({
            clientId,
            userId: identityRef.current.userId,
            name: identityRef.current.name,
            joinedAt,
          });
          setStatus("syncing");
          if (readyRef.current) {
            setStatus("ready");
            return;
          }
          console.info(`[combat-session] je suis ${clientId} (${identityRef.current.name}), demande d'état envoyée`);
          void sendLogged(ch, "sync-request", { from: clientId });
          if (syncTimer !== null) window.clearTimeout(syncTimer);
          syncTimer = window.setTimeout(markReady, SYNC_TIMEOUT_MS);
        });
    };

    // Création différée d'un tour : un montage aussitôt démonté (StrictMode en dev) ne crée aucun
    // canal. Deux canaux du même nom sur la même connexion se marchent dessus (la sortie de
    // l'ancien efface la présence du nouveau) : on attend aussi la suppression des restes éventuels.
    const startTimer = window.setTimeout(() => {
      const stale = supabase.getChannels().filter((c) => c.topic === `realtime:${topic}`);
      void Promise.all(stale.map((c) => supabase.removeChannel(c))).then(() => {
        if (!cancelled) connect();
      });
    }, 0);

    return () => {
      cancelled = true;
      window.clearTimeout(startTimer);
      if (syncTimer !== null) window.clearTimeout(syncTimer);
      readyRef.current = false;
      channelRef.current = null;
      setPeers([]);
      setStatus("idle");
      if (channel) void supabase.removeChannel(channel);
    };
  }, [chapitreId, enabled]);

  // Envoie une tranche modifiée localement. Ignoré tant que la synchro initiale n'est pas faite,
  // pour ne pas pousser un état local potentiellement obsolète aux autres sessions.
  const publishSlice = useCallback((slice: CombatSlice, value: unknown) => {
    const channel = channelRef.current;
    if (!channel || !readyRef.current) return;
    void sendLogged(channel, "slice", { from: clientIdRef.current, slice, value });
  }, []);

  const publishEvent = useCallback((event: CombatSessionEvent, data: unknown) => {
    const channel = channelRef.current;
    if (!channel || !readyRef.current) return;
    void sendLogged(channel, "event", { from: clientIdRef.current, event, data });
  }, []);

  // Tant que le canal n'a pas répondu, une session activée est « en connexion ».
  const effectiveStatus: CombatSessionStatus = enabled && status === "idle" ? "connecting" : status;
  return { status: effectiveStatus, peers, publishSlice, publishEvent, isReady: effectiveStatus === "ready" };
}

// Publie une tranche à chaque changement local de sa valeur.
// remoteValuesRef contient la dernière valeur reçue par tranche : une valeur qui vient d'être
// appliquée depuis le réseau (même référence) n'est pas renvoyée, ce qui évite les échos.
export function usePublishSlice(
  slice: CombatSlice,
  value: unknown,
  isReady: boolean,
  publishSlice: (slice: CombatSlice, value: unknown) => void,
  remoteValuesRef: React.MutableRefObject<CombatSnapshot>,
) {
  const prevRef = useRef(value);
  useEffect(() => {
    if (Object.is(prevRef.current, value)) return;
    prevRef.current = value;
    const remote = remoteValuesRef.current;
    if (slice in remote && Object.is(remote[slice], value)) {
      delete remote[slice];
      return;
    }
    if (!isReady) return;
    publishSlice(slice, value);
  }, [slice, value, isReady, publishSlice, remoteValuesRef]);
}

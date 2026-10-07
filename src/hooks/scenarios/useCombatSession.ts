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

export type CombatSessionStatus = "idle" | "connecting" | "syncing" | "ready";

interface UseCombatSessionOptions {
  chapitreId: string;
  // La session ne démarre qu'une fois l'état local hydraté (sinon l'hydratation écraserait la synchro).
  enabled: boolean;
  userId: string | null;
  name: string;
  getSnapshot: () => CombatSnapshot;
  onRemoteSlice: (slice: CombatSlice, value: unknown) => void;
  onRemoteSnapshot: (snapshot: CombatSnapshot) => void;
}

// Délai max d'attente d'un état complet à l'arrivée ; au-delà, on se considère seul.
const SYNC_TIMEOUT_MS = 1500;

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
  useEffect(() => {
    getSnapshotRef.current = getSnapshot;
    onRemoteSliceRef.current = onRemoteSlice;
    onRemoteSnapshotRef.current = onRemoteSnapshot;
  }, [getSnapshot, onRemoteSlice, onRemoteSnapshot]);

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
      if (syncTimer !== null) window.clearTimeout(syncTimer);
      syncTimer = null;
      readyRef.current = true;
      setStatus("ready");
    };

    const channel = supabase.channel(`combat-session:${chapitreId}`, {
      config: {
        broadcast: { self: false },
        presence: { key: clientId },
      },
    });
    channelRef.current = channel;

    channel
      .on("broadcast", { event: "slice" }, ({ payload }) => {
        const msg = payload as { from: string; slice: CombatSlice; value: unknown };
        if (!msg || msg.from === clientId) return;
        onRemoteSliceRef.current(msg.slice, msg.value);
      })
      .on("broadcast", { event: "sync-request" }, ({ payload }) => {
        const msg = payload as { from: string; joinedAt: number };
        if (!msg || msg.from === clientId || !readyRef.current) return;
        // Seule une session arrivée avant le demandeur répond : deux sessions qui arrivent
        // en même temps ne s'échangent pas leurs états respectifs.
        if (joinedAt > msg.joinedAt) return;
        void channel.send({
          type: "broadcast",
          event: "sync-snapshot",
          payload: { from: clientId, to: msg.from, snapshot: getSnapshotRef.current() },
        });
      })
      .on("broadcast", { event: "sync-snapshot" }, ({ payload }) => {
        const msg = payload as { from: string; to: string; snapshot: CombatSnapshot };
        if (!msg || msg.to !== clientId || readyRef.current) return;
        onRemoteSnapshotRef.current(msg.snapshot ?? {});
        markReady();
      })
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState<CombatSessionPeer>();
        const list = Object.values(state)
          .map((entries) => entries[0])
          .filter((p): p is CombatSessionPeer & { presence_ref: string } => !!p && p.clientId !== clientId)
          .map(({ clientId: id, userId: uid, name: peerName, joinedAt: at }) => ({ clientId: id, userId: uid, name: peerName, joinedAt: at }))
          .sort((a, b) => a.joinedAt - b.joinedAt);
        setPeers(list);
      })
      .subscribe((subscribeStatus) => {
        if (subscribeStatus !== "SUBSCRIBED") return;
        void channel.track({
          clientId,
          userId: identityRef.current.userId,
          name: identityRef.current.name,
          joinedAt,
        });
        setStatus("syncing");
        void channel.send({
          type: "broadcast",
          event: "sync-request",
          payload: { from: clientId, joinedAt },
        });
        syncTimer = window.setTimeout(markReady, SYNC_TIMEOUT_MS);
      });

    return () => {
      if (syncTimer !== null) window.clearTimeout(syncTimer);
      readyRef.current = false;
      channelRef.current = null;
      setPeers([]);
      setStatus("idle");
      void supabase.removeChannel(channel);
    };
  }, [chapitreId, enabled]);

  // Envoie une tranche modifiée localement. Ignoré tant que la synchro initiale n'est pas faite,
  // pour ne pas pousser un état local potentiellement obsolète aux autres sessions.
  const publishSlice = useCallback((slice: CombatSlice, value: unknown) => {
    const channel = channelRef.current;
    if (!channel || !readyRef.current) return;
    void channel.send({
      type: "broadcast",
      event: "slice",
      payload: { from: clientIdRef.current, slice, value },
    });
  }, []);

  // Tant que le canal n'a pas répondu, une session activée est « en connexion ».
  const effectiveStatus: CombatSessionStatus = enabled && status === "idle" ? "connecting" : status;
  return { status: effectiveStatus, peers, publishSlice, isReady: effectiveStatus === "ready" };
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

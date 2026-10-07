import { useCallback, useEffect, useRef, useState } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import { isCombatSlice, sanitizeEvent, sanitizeSlice, sanitizeSnapshot } from "./combatSessionSchema";

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
  // Rôle affiché ("MJ" ou "co-MJ").
  role: string;
  joinedAt: number;
  // Vrai si cette session a envoyé une action dans les dernières secondes.
  active?: boolean;
}

export type CombatSessionStatus = "idle" | "connecting" | "syncing" | "ready" | "error";

// Événements ponctuels, hors tranches d'état :
// - "combatants-patch" : combattants ajoutés/modifiés/retirés (la liste complète dépasse vite
//   la taille max d'un message Broadcast, surtout avec les voies des PJ) ;
// - "drag-preview" : positions des jetons en cours de glissement (null = fin du glissement) ;
// - "ping" : point signalé sur la battle map ;
// - "tokens-patch" : jetons ajoutés/déplacés/retirés ;
// - "fog-patch" : coups de pinceau du brouillard ajoutés/prolongés/retirés (reset = tout effacer).
export type CombatSessionEvent = "combatants-patch" | "drag-preview" | "ping" | "tokens-patch" | "fog-patch";

const SESSION_EVENTS: readonly CombatSessionEvent[] = ["combatants-patch", "drag-preview", "ping", "tokens-patch", "fog-patch"];

// Événements qui modifient l'état : mis de côté pendant une coupure puis réappliqués et renvoyés.
const DURABLE_EVENTS = new Set<CombatSessionEvent>(["combatants-patch", "tokens-patch", "fog-patch"]);

// Message envoyé à une seule session (ex. brouillard découpé envoyé à une session qui arrive).
export interface CombatSessionFollowUp {
  event: CombatSessionEvent;
  data: unknown;
}

type OutboxEntry =
  | { kind: "slice"; slice: CombatSlice; value: unknown }
  | { kind: "event"; event: CombatSessionEvent; data: unknown };

const OUTBOX_LIMIT = 500;
// Durée pendant laquelle une session est montrée « en train d'agir » après une action.
const ACTIVITY_WINDOW_MS = 2000;

interface UseCombatSessionOptions {
  chapitreId: string;
  // La session ne démarre qu'une fois l'état local hydraté (sinon l'hydratation écraserait la synchro).
  enabled: boolean;
  userId: string | null;
  name: string;
  role: string;
  getSnapshot: () => CombatSnapshot;
  // Messages envoyés à la session qui arrive, juste après l'état complet (ex. brouillard découpé).
  getSnapshotFollowUps?: () => CombatSessionFollowUp[];
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
  role,
  getSnapshot,
  getSnapshotFollowUps,
  onRemoteSlice,
  onRemoteSnapshot,
  onRemoteEvent,
}: UseCombatSessionOptions) {
  const [status, setStatus] = useState<CombatSessionStatus>("idle");
  const [peers, setPeers] = useState<CombatSessionPeer[]>([]);

  const [clientId] = useState(makeClientId);
  const clientIdRef = useRef(clientId);
  // Heure d'arrivée de cette session, publiée dans la présence (sert à désigner qui écrit en base).
  const [selfJoinedAt, setSelfJoinedAt] = useState(0);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const readyRef = useRef(false);
  // Vrai entre une reconnexion et la réception de l'état à jour (ou le délai d'attente).
  const resyncingRef = useRef(false);
  // Modifications locales faites pendant une coupure ou une resynchronisation.
  const outboxRef = useRef<OutboxEntry[]>([]);
  // Dernière action reçue de chaque session, pour l'indicateur « en train d'agir ».
  const activityRef = useRef(new Map<string, number>());
  const [activeClientIds, setActiveClientIds] = useState<string[]>([]);

  // Les callbacks changent à chaque rendu : on les lit via des refs pour ne pas recréer le canal.
  const getSnapshotRef = useRef(getSnapshot);
  const getSnapshotFollowUpsRef = useRef(getSnapshotFollowUps);
  const onRemoteSliceRef = useRef(onRemoteSlice);
  const onRemoteSnapshotRef = useRef(onRemoteSnapshot);
  const onRemoteEventRef = useRef(onRemoteEvent);
  useEffect(() => {
    getSnapshotRef.current = getSnapshot;
    getSnapshotFollowUpsRef.current = getSnapshotFollowUps;
    onRemoteSliceRef.current = onRemoteSlice;
    onRemoteSnapshotRef.current = onRemoteSnapshot;
    onRemoteEventRef.current = onRemoteEvent;
  }, [getSnapshot, getSnapshotFollowUps, onRemoteSlice, onRemoteSnapshot, onRemoteEvent]);

  const identityRef = useRef({ userId, name, role });
  useEffect(() => {
    identityRef.current = { userId, name, role };
  }, [userId, name, role]);

  // Indicateur « en train d'agir » : recalculé deux fois par seconde, pas à chaque message.
  useEffect(() => {
    if (!enabled) return;
    const timer = window.setInterval(() => {
      const now = Date.now();
      const active = [...activityRef.current.entries()]
        .filter(([, at]) => now - at < ACTIVITY_WINDOW_MS)
        .map(([id]) => id)
        .sort();
      setActiveClientIds((prev) => (prev.join("|") === active.join("|") ? prev : active));
    }, 500);
    return () => window.clearInterval(timer);
  }, [enabled]);

  useEffect(() => {
    if (!enabled || !chapitreId) return;

    const clientId = clientIdRef.current;
    const activity = activityRef.current;
    const joinedAt = Date.now();
    let syncTimer: number | null = null;
    let hasSubscribed = false;
    readyRef.current = false;
    resyncingRef.current = false;
    outboxRef.current = [];

    const clearSyncTimer = () => {
      if (syncTimer !== null) window.clearTimeout(syncTimer);
      syncTimer = null;
    };

    // Après une resynchronisation : les modifications locales faites pendant la coupure sont
    // réappliquées par-dessus l'état reçu, puis envoyées aux autres sessions.
    const flushOutbox = (ch: RealtimeChannel) => {
      const pending = outboxRef.current;
      outboxRef.current = [];
      if (pending.length === 0) return;
      console.info(`[combat-session] ${pending.length} modification(s) faite(s) pendant la coupure renvoyée(s)`);
      for (const entry of pending) {
        if (entry.kind === "slice") {
          onRemoteSliceRef.current(entry.slice, entry.value);
          void sendLogged(ch, "slice", { from: clientId, slice: entry.slice, value: entry.value });
        } else {
          onRemoteEventRef.current?.(entry.event, entry.data);
          void sendLogged(ch, "event", { from: clientId, event: entry.event, data: entry.data });
        }
      }
    };

    const markReady = () => {
      const wasResyncing = resyncingRef.current;
      if (!readyRef.current) console.info("[combat-session] session prête");
      else if (wasResyncing) console.info("[combat-session] resynchronisation terminée");
      clearSyncTimer();
      resyncingRef.current = false;
      readyRef.current = true;
      setStatus("ready");
      if (wasResyncing && channel) flushOutbox(channel);
    };

    const topic = `combat-session:${chapitreId}`;
    let cancelled = false;
    let channel: RealtimeChannel | null = null;

    const connect = () => {
      channel = supabase.channel(topic, {
        config: {
          // Canal privé : Realtime applique les règles RLS de realtime.messages
          // (seuls les MJ / co-MJ de la campagne du chapitre peuvent écouter et émettre).
          private: true,
          // ack : le serveur confirme chaque message, ce qui permet de détecter les rejets.
          broadcast: { self: false, ack: true },
          presence: { key: clientId },
        },
      });
      const ch = channel;
      channelRef.current = ch;

      ch
        .on("broadcast", { event: "slice" }, ({ payload }) => {
          const msg = payload as { from?: unknown; slice?: unknown; value?: unknown } | null;
          if (!msg || msg.from === clientId || !isCombatSlice(msg.slice)) return;
          if (typeof msg.from === "string") activityRef.current.set(msg.from, Date.now());
          const checked = sanitizeSlice(msg.slice, msg.value);
          if (!checked.ok) {
            console.warn(`[combat-session] tranche "${msg.slice}" invalide ignorée`);
            return;
          }
          onRemoteSliceRef.current(msg.slice, checked.value);
        })
        .on("broadcast", { event: "event" }, ({ payload }) => {
          const msg = payload as { from?: unknown; to?: unknown; event?: unknown; data?: unknown } | null;
          if (!msg || msg.from === clientId) return;
          // Message adressé à une autre session.
          if (msg.to !== undefined && msg.to !== clientId) return;
          if (!SESSION_EVENTS.includes(msg.event as CombatSessionEvent)) return;
          const event = msg.event as CombatSessionEvent;
          if (typeof msg.from === "string" && msg.to === undefined) activityRef.current.set(msg.from, Date.now());
          const checked = sanitizeEvent(event, msg.data);
          if (!checked.ok) {
            console.warn(`[combat-session] événement "${event}" invalide ignoré`);
            return;
          }
          onRemoteEventRef.current?.(event, checked.value);
        })
        .on("broadcast", { event: "sync-request" }, ({ payload }) => {
          const msg = payload as { from?: unknown } | null;
          if (!msg || typeof msg.from !== "string" || msg.from === clientId) return;
          // Seules les sessions synchronisées (et pas en train de se resynchroniser) répondent :
          // deux sessions qui arrivent ou se reconnectent en même temps ne s'échangent pas leurs états.
          const canAnswer = readyRef.current && !resyncingRef.current;
          console.info(`[combat-session] demande d'état reçue de ${msg.from}${canAnswer ? ", envoi de l'état" : " (pas synchronisée, ignorée)"}`);
          if (!canAnswer) return;
          void sendLogged(ch, "sync-snapshot", { from: clientId, to: msg.from, snapshot: getSnapshotRef.current() });
          for (const followUp of getSnapshotFollowUpsRef.current?.() ?? []) {
            void sendLogged(ch, "event", { from: clientId, to: msg.from, event: followUp.event, data: followUp.data });
          }
        })
        .on("broadcast", { event: "sync-snapshot" }, ({ payload }) => {
          const msg = payload as { from?: unknown; to?: unknown; snapshot?: unknown } | null;
          if (!msg || msg.to !== clientId) return;
          if (readyRef.current && !resyncingRef.current) return;
          console.info("[combat-session] état complet reçu de", msg.from);
          onRemoteSnapshotRef.current(sanitizeSnapshot(msg.snapshot));
          markReady();
        })
        .on("presence", { event: "sync" }, () => {
          const state = ch.presenceState<CombatSessionPeer>();
          const list = Object.values(state)
            .map((entries) => entries[0])
            .filter((p): p is CombatSessionPeer & { presence_ref: string } =>
              !!p && typeof p.clientId === "string" && p.clientId !== clientId && Number.isFinite(p.joinedAt))
            .map(({ clientId: id, userId: uid, name: peerName, role: peerRole, joinedAt: at }) => ({
              clientId: id,
              userId: typeof uid === "string" ? uid : null,
              name: typeof peerName === "string" ? peerName.slice(0, 100) : "MJ",
              role: typeof peerRole === "string" ? peerRole.slice(0, 20) : "MJ",
              joinedAt: at,
            }))
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
          setSelfJoinedAt(joinedAt);
          void ch.track({
            clientId,
            userId: identityRef.current.userId,
            name: identityRef.current.name,
            role: identityRef.current.role,
            joinedAt,
          });
          setStatus("syncing");
          if (hasSubscribed) {
            // Reconnexion après une coupure : des changements ont pu être manqués,
            // on redemande l'état courant aux autres sessions.
            resyncingRef.current = true;
            console.info("[combat-session] reconnecté, demande de resynchronisation");
          } else {
            console.info(`[combat-session] je suis ${clientId} (${identityRef.current.name}), demande d'état envoyée`);
          }
          hasSubscribed = true;
          void sendLogged(ch, "sync-request", { from: clientId });
          clearSyncTimer();
          syncTimer = window.setTimeout(markReady, SYNC_TIMEOUT_MS);
        });
    };

    // Création différée d'un tour : un montage aussitôt démonté (StrictMode en dev) ne crée aucun
    // canal. Deux canaux du même nom sur la même connexion se marchent dessus (la sortie de
    // l'ancien efface la présence du nouveau) : on attend aussi la suppression des restes éventuels.
    // Le jeton de l'utilisateur est transmis à Realtime avant de rejoindre le canal privé.
    const startTimer = window.setTimeout(() => {
      const stale = supabase.getChannels().filter((c) => c.topic === `realtime:${topic}`);
      void Promise.all([...stale.map((c) => supabase.removeChannel(c)), supabase.realtime.setAuth()])
        .catch((error) => console.warn("[combat-session] préparation du canal en erreur", error))
        .then(() => {
          if (!cancelled) connect();
        });
    }, 0);

    return () => {
      cancelled = true;
      window.clearTimeout(startTimer);
      clearSyncTimer();
      readyRef.current = false;
      resyncingRef.current = false;
      outboxRef.current = [];
      activity.clear();
      channelRef.current = null;
      setPeers([]);
      setStatus("idle");
      if (channel) void supabase.removeChannel(channel);
    };
  }, [chapitreId, enabled]);

  // Envoie une tranche modifiée localement. Ignoré tant que la synchro initiale n'est pas faite,
  // pour ne pas pousser un état local potentiellement obsolète aux autres sessions.
  // Pendant une coupure (canal non rejoint) ou une resynchronisation, les modifications sont mises
  // de côté (la dernière valeur par tranche, les modifications dans l'ordre) pour être renvoyées ensuite.
  const shouldQueue = (channel: RealtimeChannel) => channel.state !== "joined" || resyncingRef.current;
  const queue = (entry: OutboxEntry) => {
    const outbox = entry.kind === "slice"
      ? outboxRef.current.filter((e) => !(e.kind === "slice" && e.slice === entry.slice))
      : outboxRef.current;
    outboxRef.current = [...outbox, entry].slice(-OUTBOX_LIMIT);
  };

  const publishSlice = useCallback((slice: CombatSlice, value: unknown) => {
    const channel = channelRef.current;
    if (!channel || !readyRef.current) return;
    if (shouldQueue(channel)) {
      queue({ kind: "slice", slice, value });
      return;
    }
    void sendLogged(channel, "slice", { from: clientIdRef.current, slice, value });
  }, []);

  const publishEvent = useCallback((event: CombatSessionEvent, data: unknown) => {
    const channel = channelRef.current;
    if (!channel || !readyRef.current) return;
    if (shouldQueue(channel)) {
      // Les aperçus (glissement, ping) n'ont plus de sens après coup : seuls les changements d'état sont gardés.
      if (DURABLE_EVENTS.has(event)) queue({ kind: "event", event, data });
      return;
    }
    void sendLogged(channel, "event", { from: clientIdRef.current, event, data });
  }, []);

  // Tant que le canal n'a pas répondu, une session activée est « en connexion ».
  const effectiveStatus: CombatSessionStatus = enabled && status === "idle" ? "connecting" : status;

  // Une seule session écrit l'état en base : la plus ancienne présente (départage par clientId).
  // Tous voient les mêmes joinedAt via la présence, donc tous désignent la même session.
  // Hors session prête (seul, en connexion, en erreur), on écrit soi-même par sécurité.
  const isPrimaryWriter = effectiveStatus !== "ready" || peers.every((p) =>
    p.joinedAt > selfJoinedAt || (p.joinedAt === selfJoinedAt && p.clientId > clientId));

  const peersWithActivity = peers.map((p) => ({ ...p, active: activeClientIds.includes(p.clientId) }));

  return { status: effectiveStatus, peers: peersWithActivity, publishSlice, publishEvent, isReady: effectiveStatus === "ready", isPrimaryWriter };
}

// Publie une tranche à chaque changement local de sa valeur.
// remoteValuesRef contient la dernière valeur reçue par tranche : une valeur qui vient d'être
// appliquée depuis le réseau (même référence) n'est pas renvoyée, ce qui évite les échos.
export function usePublishSlice(
  slice: CombatSlice,
  value: unknown,
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
    // La session décide : envoi, mise de côté (coupure) ou rien (avant la synchro initiale).
    publishSlice(slice, value);
  }, [slice, value, publishSlice, remoteValuesRef]);
}

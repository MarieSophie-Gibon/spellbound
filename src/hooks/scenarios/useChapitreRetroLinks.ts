/* eslint-disable @typescript-eslint/no-explicit-any */
import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";

export type LinkMode = "internal_block" | "cross_chapter";

export interface LinkBlockData {
  mode: LinkMode;
  label: string;
  targetBlockId?: string;
  targetChapitreId?: string;
}

interface ScenarioBlock {
  id: string;
  type: string;
  data?: any;
}

interface IndexedChapitre {
  id: string;
  title: string;
  scenarioId: string;
  scenarioTitle: string;
  content: ScenarioBlock[];
}

interface BacklinkItem {
  sourceChapitreId: string;
  sourceChapitreTitle: string;
  sourceScenarioTitle: string;
  sourceBlockId: string;
  label: string;
}

interface LinkTargetOption {
  id: string;
  label: string;
}

function getBlockLabel(block: ScenarioBlock): string {
  const text = (block.data?.title || block.data?.nom || block.data?.text || "").toString().trim();
  if (text) return text.slice(0, 42);

  switch (block.type) {
    case "text":
      return "Text";
    case "quote":
      return "Quote";
    case "image":
      return "Image";
    case "location":
      return "Location";
    case "loot":
      return "Loot";
    case "investigation":
      return "Investigation";
    case "npc":
      return "NPC";
    case "enemy":
      return "Enemy";
    case "clue":
      return "Clue";
    default:
      return block.type;
  }
}

function isLinkBlockData(value: any): value is LinkBlockData {
  return value && typeof value === "object" && (value.mode === "internal_block" || value.mode === "cross_chapter");
}

function normalizeLinkData(value: any): LinkBlockData {
  if (!isLinkBlockData(value)) {
    return { mode: "internal_block", label: "", targetBlockId: "", targetChapitreId: "" };
  }

  return {
    mode: value.mode,
    label: typeof value.label === "string" ? value.label : "",
    targetBlockId: typeof value.targetBlockId === "string" ? value.targetBlockId : "",
    targetChapitreId: typeof value.targetChapitreId === "string" ? value.targetChapitreId : "",
  };
}

export function useChapitreRetroLinks({
  campaignId,
  chapitreId,
  blocks,
}: {
  campaignId: string;
  chapitreId: string;
  blocks: Array<{ id: string; type: string; data: any }>;
}) {
  const [indexedChapitres, setIndexedChapitres] = useState<IndexedChapitre[]>([]);
  const [isLoadingIndex, setIsLoadingIndex] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const fetchIndex = async () => {
      setIsLoadingIndex(true);
      try {
        const { data: scenarios, error: scenariosError } = await supabase
          .from("scenarios")
          .select("id, title")
          .eq("campaign_id", campaignId)
          .order("ordre", { ascending: true });

        if (scenariosError) throw scenariosError;

        const scenarioIds = (scenarios ?? []).map((scenario) => scenario.id);
        if (!scenarioIds.length) {
          if (isMounted) setIndexedChapitres([]);
          return;
        }

        const scenarioTitleById = new Map((scenarios ?? []).map((scenario) => [scenario.id, scenario.title || "Untitled scenario"]));

        const { data: chapitres, error: chapitresError } = await supabase
          .from("chapitres")
          .select("id, title, scenario_id, content")
          .in("scenario_id", scenarioIds)
          .order("ordre", { ascending: true });

        if (chapitresError) throw chapitresError;

        const normalized: IndexedChapitre[] = (chapitres ?? []).map((chapitre: any) => ({
          id: chapitre.id,
          title: chapitre.title || "Untitled chapitre",
          scenarioId: chapitre.scenario_id,
          scenarioTitle: scenarioTitleById.get(chapitre.scenario_id) || "Untitled scenario",
          content: Array.isArray(chapitre.content) ? chapitre.content : [],
        }));

        if (isMounted) {
          setIndexedChapitres(normalized);
        }
      } catch (error) {
        console.error("Failed to index chapitres for retro links:", error);
        if (isMounted) {
          setIndexedChapitres([]);
        }
      } finally {
        if (isMounted) setIsLoadingIndex(false);
      }
    };

    void fetchIndex();

    return () => {
      isMounted = false;
    };
  }, [campaignId, chapitreId]);

  const currentChapitreBlockTargets = useMemo<LinkTargetOption[]>(() => {
    return blocks
      .filter((block) => block.type !== "mj_note")
      .map((block, index) => ({
        id: block.id,
        label: `${index + 1}. ${getBlockLabel(block)}`,
      }));
  }, [blocks]);

  const chapterTargets = useMemo(() => {
    return indexedChapitres
      .filter((chapitre) => chapitre.id !== chapitreId)
      .map((chapitre) => ({
        id: chapitre.id,
        label: `${chapitre.scenarioTitle} / ${chapitre.title}`,
      }));
  }, [indexedChapitres, chapitreId]);

  const getChapitreBlockTargets = useCallback((targetChapitreId: string) => {
    if (!targetChapitreId) return [] as LinkTargetOption[];
    if (targetChapitreId === chapitreId) return currentChapitreBlockTargets;

    const target = indexedChapitres.find((chapitre) => chapitre.id === targetChapitreId);
    if (!target) return [] as LinkTargetOption[];

    return target.content
      .filter((block) => block.type !== "mj_note")
      .map((block, index) => ({
        id: block.id,
        label: `${index + 1}. ${getBlockLabel(block)}`,
      }));
  }, [chapitreId, currentChapitreBlockTargets, indexedChapitres]);

  const backlinks = useMemo<BacklinkItem[]>(() => {
    const rows: BacklinkItem[] = [];

    for (const sourceChapitre of indexedChapitres) {
      if (sourceChapitre.id === chapitreId) continue;

      for (const block of sourceChapitre.content) {
        if (block.type !== "link") continue;

        const linkData = normalizeLinkData(block.data);
        if (linkData.mode !== "cross_chapter") continue;
        if (linkData.targetChapitreId !== chapitreId) continue;

        rows.push({
          sourceChapitreId: sourceChapitre.id,
          sourceChapitreTitle: sourceChapitre.title,
          sourceScenarioTitle: sourceChapitre.scenarioTitle,
          sourceBlockId: block.id,
          label: linkData.label || "Untitled link",
        });
      }
    }

    return rows.sort((a, b) => {
      const byScenario = a.sourceScenarioTitle.localeCompare(b.sourceScenarioTitle);
      if (byScenario !== 0) return byScenario;
      return a.sourceChapitreTitle.localeCompare(b.sourceChapitreTitle);
    });
  }, [indexedChapitres, chapitreId]);

  const defaultLinkData = useCallback((): LinkBlockData => ({
    mode: "internal_block",
    label: "",
    targetBlockId: "",
    targetChapitreId: "",
  }), []);

  return {
    isLoadingIndex,
    currentChapitreBlockTargets,
    chapterTargets,
    backlinks,
    defaultLinkData,
    getChapitreBlockTargets,
    normalizeLinkData,
  };
}

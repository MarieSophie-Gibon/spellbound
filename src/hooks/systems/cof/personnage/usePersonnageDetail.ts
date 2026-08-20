/* eslint-disable @typescript-eslint/no-explicit-any */
import { useMemo } from "react";
import { supabase } from "@/lib/supabase";

export const STATS_KEYS = ["FOR", "CON", "AGI", "PER", "CHA", "INT", "VOL"] as const;
export type StatKey = (typeof STATS_KEYS)[number];

export interface VoieDetail {
	id: string;
	nom: string;
	type: string;
	peuple_id?: string | null;
	profil_id?: string | null;
	capacites: Record<string, { nom: string; type?: string; description: string }>;
}

type CharacterType = "pj" | "pnj";

type CharacterEntity = {
	id: string;
	stats: Record<string, any> | null;
	pathways: any[] | null;
};

function getTable(type: CharacterType) {
	return type === "pnj" ? "pnj" : "pj";
}

export function getDerivedAttacks(
	level: number,
	characteristics: Record<string, number>,
) {
	const forStat = Number(characteristics?.FOR ?? 0);
	const agi = Number(characteristics?.AGI ?? 0);
	const vol = Number(characteristics?.VOL ?? 0);

	return {
		contact: level + forStat,
		distance: level + agi,
		magie: level + vol,
	};
}

function getDieFaces(die: string | number | null | undefined) {
	const raw = String(die ?? "d6");
	const match = raw.match(/\d+/);
	return match ? Number(match[0]) : 6;
}

export function getHpGainPerLevel(stats: Record<string, any> | null | undefined) {
	const characteristics = stats?.caracteristiques ?? {};
	const con = Number(characteristics?.CON ?? 0);
	if (typeof stats?.pv_par_niveau === "number") {
		return stats.pv_par_niveau + con;
	}
	const drFaces = getDieFaces(stats?.dr_de ?? "d6");
	return Math.max(1, drFaces + con);
}

export function usePersonnageDetail() {
	return useMemo(
		() => ({
			async fetchVoieDetailsByPathways(pathways: any[] | null | undefined) {
				if (!pathways?.length) return [] as VoieDetail[];
				const ids = pathways.map((p) => p?.voie_id).filter(Boolean);
				if (!ids.length) return [] as VoieDetail[];

				const { data, error } = await supabase
					.from("voies")
					.select("id, nom, type, peuple_id, profil_id, capacites")
					.in("id", ids);
				if (error) throw error;
				return (data ?? []) as VoieDetail[];
			},

			async fetchAllVoies() {
				const { data, error } = await supabase
					.from("voies")
					.select("id, nom, type, peuple_id, profil_id, capacites")
					.order("nom");
				if (error) throw error;
				return (data ?? []) as VoieDetail[];
			},

			async fetchPlayers() {
				const { data, error } = await supabase
					.from("utilisateurs")
					.select("id, pseudo, role")
					.order("pseudo");
				if (error) throw error;

				return (data ?? [])
					.filter((p: any) => p.role !== "super_admin")
					.map((p: any) => ({ id: p.id as string, pseudo: p.pseudo as string }));
			},

			async fetchPnjMeta(pnjId: string, peupleId?: string | null) {
				const [familiersRes, peupleRes] = await Promise.all([
					supabase
						.from("pj_familiers")
						.select("id", { count: "exact", head: true })
						.eq("pnj_id", pnjId),
					peupleId
						? supabase.from("peuples").select("nom").eq("id", peupleId).single()
						: Promise.resolve({ data: null, error: null } as any),
				]);

				if (familiersRes.error) throw familiersRes.error;
				if (peupleRes?.error) throw peupleRes.error;

				return {
					hasFamiliers: (familiersRes.count ?? 0) > 0,
					peupleNom: peupleRes?.data?.nom ?? null,
				};
			},

			async fetchWeapons(characterId: string, type: CharacterType) {
				if (type === "pnj") {
					const { data, error } = await supabase
						.from("pnj")
						.select("inventory")
						.eq("id", characterId)
						.single();
					if (error) throw error;
					const items: any[] = data?.inventory?.items ?? [];
					return items.filter(
						(i: any) =>
							(i.item_type === "arme_contact" || i.item_type === "arme_distance") &&
							i.is_equipped,
					);
				}

				const { data: invData, error: invError } = await supabase
					.from("pj_inventaire")
					.select("*")
					.eq("pj_id", characterId)
					.in("item_type", ["arme_contact", "arme_distance"])
					.eq("is_equipped", true);
				if (invError) throw invError;
				if (!invData || invData.length === 0) return [] as any[];

				const contactIds = invData
					.filter((i) => i.item_type === "arme_contact" && i.item_id != null)
					.map((i) => String(i.item_id));
				const distanceIds = invData
					.filter((i) => i.item_type === "arme_distance" && i.item_id != null)
					.map((i) => String(i.item_id));

				const [contactRes, distanceRes] = await Promise.all([
					contactIds.length > 0
						? supabase.from("armes_contact").select("id, dm, type_de_dm").in("id", contactIds)
						: Promise.resolve({ data: [], error: null } as any),
					distanceIds.length > 0
						? supabase
								.from("armes_distance")
								.select("id, dm, type_de_dm, portee")
								.in("id", distanceIds)
						: Promise.resolve({ data: [], error: null } as any),
				]);

				if (contactRes.error) throw contactRes.error;
				if (distanceRes.error) throw distanceRes.error;

				const contactMap = new Map<string, any>(
					(contactRes.data || []).map((a: any) => [String(a.id), a]),
				);
				const distanceMap = new Map<string, any>(
					(distanceRes.data || []).map((a: any) => [String(a.id), a]),
				);

				return invData.map((item: any) => {
					let baseWeapon: any = null;
					const itemIdStr = item.item_id != null ? String(item.item_id) : null;

					if (item.item_type === "arme_contact" && itemIdStr) {
						baseWeapon = contactMap.get(itemIdStr);
					} else if (item.item_type === "arme_distance" && itemIdStr) {
						baseWeapon = distanceMap.get(itemIdStr);
					}

					const dmDirect = item.dm ?? item.degats;
					const dmCompendium = baseWeapon?.dm
						? `${baseWeapon.dm}${baseWeapon.type_de_dm ? ` ${baseWeapon.type_de_dm}` : ""}`.trim()
						: null;

					return {
						...item,
						degats: dmDirect ?? dmCompendium ?? null,
						portee: item.portee ?? baseWeapon?.portee ?? null,
					};
				});
			},

			async uploadImage(type: CharacterType, file: File) {
				const ext = file.name.split(".").pop();
				const path = `${type}/${Date.now()}-${Math.random().toString(36).substring(2)}.${ext}`;
				const { error: uploadError } = await supabase.storage
					.from("compendium")
					.upload(path, file, { upsert: true });
				if (uploadError) throw uploadError;

				const { data: urlData } = supabase.storage.from("compendium").getPublicUrl(path);
				return urlData.publicUrl;
			},

			async updateCharacterName(id: string, type: CharacterType, name: string) {
				const { error } = await supabase
					.from(getTable(type))
					.update({ name })
					.eq("id", id);
				if (error) throw error;
			},

			async updateCharacterStats(
				id: string,
				type: CharacterType,
				stats: Record<string, any>,
			) {
				const { error } = await supabase
					.from(getTable(type))
					.update({ stats })
					.eq("id", id);
				if (error) throw error;
			},

			async updateCharacter(id: string, type: CharacterType, patch: Record<string, any>) {
				const { error } = await supabase.from(getTable(type)).update(patch).eq("id", id);
				if (error) throw error;
			},

			async assignPlayer(id: string, userId: string | null) {
				const { error } = await supabase.from("pj").update({ user_id: userId }).eq("id", id);
				if (error) throw error;
			},

			async saveQuickStats(
				entity: CharacterEntity,
				type: CharacterType,
				patch: Record<string, unknown>,
			) {
				const mergedStats = { ...(entity.stats ?? {}), ...patch };
				await supabase
					.from(getTable(type))
					.update({ stats: mergedStats })
					.eq("id", entity.id)
					.throwOnError();
			},

			async saveLevelUp(
				entity: CharacterEntity,
				type: CharacterType,
				pendingRanks: { voie_id: string; rang: number }[],
			) {
				const newLevel = (entity.stats?.niveau ?? 1) + 1;
				const updatedPathways = [...(entity.pathways || [])];

				pendingRanks.forEach((pr) => {
					const pathwayIndex = updatedPathways.findIndex(
						(p: any) => p.voie_id === pr.voie_id,
					);
					if (pathwayIndex !== -1) {
						const rangsAcquis = [...(updatedPathways[pathwayIndex].rangs_acquis || [])];
						if (!rangsAcquis.includes(pr.rang)) {
							rangsAcquis.push(pr.rang);
							updatedPathways[pathwayIndex].rangs_acquis = rangsAcquis.sort(
								(a, b) => a - b,
							);
						}
					} else {
						updatedPathways.push({ voie_id: pr.voie_id, rangs_acquis: [pr.rang] });
					}
				});

				const stats = entity.stats ?? {};
				const caract = stats.caracteristiques ?? {};
				const derivedAttacks = getDerivedAttacks(newLevel, caract as Record<string, number>);
				const hpGain = getHpGainPerLevel(stats);
				const currentPvMax = Math.max(
					Number(stats.pv_max ?? stats.pv ?? 0),
					Number(stats.pv ?? 0),
				);

				const nextStats = {
					...stats,
					niveau: newLevel,
					pv: Number(stats.pv ?? 0) + hpGain,
					pv_max: currentPvMax + hpGain,
					att_contact: derivedAttacks.contact,
					att_distance: derivedAttacks.distance,
					att_magie: derivedAttacks.magie,
				};

				await supabase
					.from(getTable(type))
					.update({ pathways: updatedPathways, stats: nextStats })
					.eq("id", entity.id)
					.throwOnError();
			},
		}),
		[],
	);
}

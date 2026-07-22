import type { Campaign } from "@/hooks/useCampaigns";
import { useCampaignProgress, useCreateCampaignInvitation, useRevealedPnjs } from "@/hooks/useCampaigns";
import { CalendarDays, Ticket, Copy, Check, Loader2, UserSearch } from "lucide-react";
import { CampaignHomeMobile } from "@/components/campaign/CampaignHomeMobile";
import { useIsMobile } from "@/hooks/useIsMobile";
import { PJList } from "@/components/campaign/PJList";
import { useAuthStore } from "@/stores/useAuthStore";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { MagicCard } from "@/components/ui/MagicCard";

interface CampaignProps {
    campaign: Campaign;
}

export function CampaignHome({ campaign }: CampaignProps) {
    const isMobile = useIsMobile();
    const role = useAuthStore((s) => s.role);
    const isMJ = role === "mj";
    const { data: progress } = useCampaignProgress(campaign.id);
    const { data: revealedPnjs } = useRevealedPnjs(campaign.id);
    const createInvitation = useCreateCampaignInvitation();
    const [inviteCode, setInviteCode] = useState<string | null>(null);
    const [inviteError, setInviteError] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);
    const [selectedPnjId, setSelectedPnjId] = useState<string | null>(null);
    const [selectedPnjVoies, setSelectedPnjVoies] = useState<Array<{ id: string; nom: string; rang: number }>>([]);

    const selectedPnj = (revealedPnjs ?? []).find((pnj) => pnj.id === selectedPnjId) ?? null;

    useEffect(() => {
        const loadVoies = async () => {
            if (!selectedPnj?.pathways?.length) {
                setSelectedPnjVoies([]);
                return;
            }
            const voieIds = selectedPnj.pathways.map((p) => p.voie_id).filter(Boolean);
            if (voieIds.length === 0) {
                setSelectedPnjVoies([]);
                return;
            }
            const { data } = await supabase
                .from("voies")
                .select("id, nom")
                .in("id", voieIds);

            const voieName = new Map((data ?? []).map((v) => [v.id, v.nom]));
            setSelectedPnjVoies(
                selectedPnj.pathways
                    .map((p) => ({
                        id: p.voie_id,
                        nom: voieName.get(p.voie_id) ?? "Voie inconnue",
                        rang: (p.rangs_acquis && p.rangs_acquis.length > 0) ? Math.max(...p.rangs_acquis) : 0,
                    }))
                    .sort((a, b) => a.nom.localeCompare(b.nom))
            );
        };
        void loadVoies();
    }, [selectedPnjId, selectedPnj]);

    const createdAt = campaign.created_at
        ? new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", year: "numeric" }).format(new Date(campaign.created_at))
        : null;

    if (isMobile) {
        return <CampaignHomeMobile campaign={campaign} />;
    }

    return (
        <div className="flex-1 relative p-10">
            {/* Campaign card + stats — top right */}
            <div className="absolute top-6 right-8 flex flex-col gap-3 w-56">
                {/* Card */}
                <MagicCard
                    size="medium"
                    imageUrl={campaign.image_url}
                    title={campaign.nom}
                >
                    {campaign.description && (
                        <p className="text-[11px] text-white/80 leading-relaxed px-2">
                            {campaign.description}
                        </p>
                    )}
                </MagicCard>

                {/* Stats block */}
                <div className="rounded-xl border border-white/10 bg-white/5 backdrop-blur-sm px-4 py-3 flex flex-col gap-2">
                    {createdAt && (
                        
                            <div className="flex items-center gap-2 text-white/40">
                                <CalendarDays className="w-3.5 h-3.5 shrink-0" />
                                <span className="text-[11px]">Créée le {createdAt}</span>
                            </div>
                        
                    )}

                    {/* Barre de progression de la campagne */}
                    {(progress?.totalChapitres ?? 0) > 0 && (
                        <>
                            <div className="h-px bg-white/10 my-0.5" />
                            <div className="space-y-1.5">
                                <div className="flex items-center justify-between">
                                    <span className="text-[10px] uppercase tracking-widest text-white/40">Progression</span>
                                    <span className="text-[11px] font-semibold text-white/60 tabular-nums">
                                        {progress!.completedChapitres}/{progress!.totalChapitres}
                                    </span>
                                </div>
                                <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                                    <div
                                        className="h-full rounded-full transition-all duration-500"
                                        style={{
                                            width: `${Math.round((progress!.completedChapitres / progress!.totalChapitres) * 100)}%`,
                                            background: "linear-gradient(90deg, #E3CCCD 0%, #c9a8aa 100%)",
                                        }}
                                    />
                                </div>
                                <span className="text-[10px] text-white/30">
                                    {progress!.totalScenarios} scénario{progress!.totalScenarios > 1 ? "s" : ""}
                                </span>
                            </div>
                        </>
                    )}
                </div>

                {isMJ && (
                    <div className="rounded-xl border border-amber-300/20 bg-amber-500/5 backdrop-blur-sm px-4 py-3 flex flex-col gap-2">
                        <div className="flex items-center gap-2 text-amber-200/90">
                            <Ticket className="w-3.5 h-3.5" />
                            <span className="text-[11px] uppercase tracking-widest">Invitation joueurs</span>
                        </div>
                        <button
                            onClick={() => {
                                setInviteError(null);
                                createInvitation.mutate(
                                    { campaignId: campaign.id },
                                    {
                                        onSuccess: (inv) => setInviteCode(inv.code),
                                        onError: (err: Error) => setInviteError(err?.message ?? "Impossible de créer le code"),
                                    }
                                );
                            }}
                            className="w-full rounded-lg border border-amber-200/20 bg-amber-400/10 hover:bg-amber-400/20 text-amber-100 text-[11px] py-2 transition-colors"
                        >
                            {createInvitation.isPending ? <Loader2 className="w-3.5 h-3.5 mx-auto animate-spin" /> : "Générer un code"}
                        </button>
                        {inviteCode && (
                            <button
                            onClick={async () => {
                                    await navigator.clipboard.writeText(inviteCode);
                                    setCopied(true);
                                    setTimeout(() => setCopied(false), 2000);
                                }}
                                className={`w-full flex items-center justify-center gap-1.5 rounded-lg border text-[11px] py-2 transition-colors ${
                                    copied
                                        ? "border-emerald-400/40 bg-emerald-400/15 text-emerald-200"
                                        : "border-white/15 bg-white/5 hover:bg-white/10 text-white"
                                }`}
                            >
                                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                                {copied ? "Copié !" : inviteCode}
                            </button>
                        )}
                        {inviteError && <p className="text-[10px] text-red-300">{inviteError}</p>}
                    </div>
                )}
            </div>

            {/* PNJs rencontrés */}
            {(revealedPnjs?.length ?? 0) > 0 && (
                <div className="max-w-6xl mx-auto mb-10">
                    <div className="flex items-center gap-2 mb-4">
                        <UserSearch className="w-4 h-4 text-violet-400/70" />
                        <h2 className="text-[11px] uppercase tracking-widest text-violet-300/60 font-semibold">PNJs rencontrés</h2>
                    </div>
                    <div className="flex flex-wrap gap-4">
                        {revealedPnjs!.map((pnj) => (
                            <button
                                key={pnj.id}
                                type="button"
                                onClick={() => setSelectedPnjId(pnj.id)}
                                className="flex flex-col items-center gap-2 w-24 group text-left"
                            >
                                <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-violet-500/30 bg-white/5 shadow-lg group-hover:border-violet-400/60 transition-colors">
                                    <img
                                        src={pnj.image_url || '/default-avatar.png'}
                                        alt={pnj.name}
                                        className="w-full h-full object-cover"
                                    />
                                </div>
                                <span className="text-[11px] text-white/70 text-center leading-tight font-medium group-hover:text-white transition-colors">
                                    {pnj.name}
                                </span>
                                {pnj.description && (
                                    <span className="text-[10px] text-white/30 text-center leading-tight line-clamp-2">
                                        {pnj.description}
                                    </span>
                                )}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {selectedPnj && (
                <div className="fixed inset-0 z-60 bg-black/65 backdrop-blur-sm p-4 flex items-center justify-center" onClick={() => setSelectedPnjId(null)}>
                    <div className="w-full max-w-xl rounded-2xl border border-violet-300/25 bg-[#1E1941]/95 shadow-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
                        <div className="px-5 py-4 border-b border-white/10 flex items-start gap-3">
                            <div className="w-12 h-12 rounded-full border-2 border-violet-400/60 overflow-hidden shrink-0">
                                <img src={selectedPnj.image_url || '/default-avatar.png'} alt={selectedPnj.name} className="w-full h-full object-cover" />
                            </div>
                            <div className="min-w-0 flex-1">
                                <p className="text-[10px] uppercase tracking-widest text-violet-300/55">Fiche technique PNJ</p>
                                <h3 className="font-serif text-xl text-white truncate">{selectedPnj.name}</h3>
                            </div>
                            <button onClick={() => setSelectedPnjId(null)} className="p-1.5 rounded-full text-white/45 hover:text-white hover:bg-white/10 transition-colors" aria-label="Fermer la fiche PNJ">
                                ✕
                            </button>
                        </div>

                        <div className="p-5 space-y-4">
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                                <div className="rounded-lg border border-white/10 bg-white/5 p-2.5">
                                    <p className="text-[10px] uppercase tracking-wide text-white/45">Initiative</p>
                                    <p className="text-sm text-white font-semibold mt-1 tabular-nums">{Number(selectedPnj.stats?.initiative ?? 0)}</p>
                                </div>
                                <div className="rounded-lg border border-white/10 bg-white/5 p-2.5">
                                    <p className="text-[10px] uppercase tracking-wide text-white/45">Défense</p>
                                    <p className="text-sm text-white font-semibold mt-1 tabular-nums">{Number(selectedPnj.stats?.defense ?? 0)}</p>
                                </div>
                                <div className="rounded-lg border border-white/10 bg-white/5 p-2.5">
                                    <p className="text-[10px] uppercase tracking-wide text-white/45">Niveau</p>
                                    <p className="text-sm text-white font-semibold mt-1 tabular-nums">{Number(selectedPnj.stats?.niveau ?? 1)}</p>
                                </div>
                                <div className="rounded-lg border border-white/10 bg-white/5 p-2.5">
                                    <p className="text-[10px] uppercase tracking-wide text-white/45">Att. contact</p>
                                    <p className="text-sm text-white font-semibold mt-1 tabular-nums">+{Number(selectedPnj.stats?.att_contact ?? 0)}</p>
                                </div>
                                <div className="rounded-lg border border-white/10 bg-white/5 p-2.5">
                                    <p className="text-[10px] uppercase tracking-wide text-white/45">Att. distance</p>
                                    <p className="text-sm text-white font-semibold mt-1 tabular-nums">+{Number(selectedPnj.stats?.att_distance ?? 0)}</p>
                                </div>
                                <div className="rounded-lg border border-white/10 bg-white/5 p-2.5">
                                    <p className="text-[10px] uppercase tracking-wide text-white/45">Att. magie</p>
                                    <p className="text-sm text-white font-semibold mt-1 tabular-nums">+{Number(selectedPnj.stats?.att_magie ?? 0)}</p>
                                </div>
                            </div>

                            {selectedPnjVoies.length > 0 && (
                                <div className="space-y-2">
                                    <p className="text-[10px] uppercase tracking-[0.15em] text-violet-300/60">Voies connues</p>
                                    <div className="flex flex-wrap gap-2">
                                        {selectedPnjVoies.map((voie) => (
                                            <span key={`${voie.id}-${voie.rang}`} className="text-[11px] px-2.5 py-1 rounded-full border border-violet-300/25 bg-violet-500/10 text-violet-100/90">
                                                {voie.nom}{voie.rang > 0 ? ` (R${voie.rang})` : ""}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {selectedPnj.description && (
                                <div className="space-y-1.5">
                                    <p className="text-[10px] uppercase tracking-[0.15em] text-white/45">Description publique</p>
                                    <p className="text-[13px] text-white/70 leading-relaxed">{selectedPnj.description}</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Liste design des personnages joueurs */}
            <div className="max-w-6xl mx-auto">
                <PJList campaignId={campaign.id} isMJ={isMJ} />
            </div>
        </div>
    );
}

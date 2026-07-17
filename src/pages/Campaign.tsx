import { theme } from "@/lib/theme";
import type { Campaign } from "@/hooks/useCampaigns";
import { useCampaignProgress, useCreateCampaignInvitation, useRevealedPnjs } from "@/hooks/useCampaigns";
import { CalendarDays, Ticket, Copy, Check, Loader2, UserSearch } from "lucide-react";
import { PJList } from "@/components/campaign/PJList";
import { useAuthStore } from "@/stores/useAuthStore";
import { useState } from "react";

interface CampaignProps {
    campaign: Campaign;
}

export function CampaignHome({ campaign }: CampaignProps) {
    const role = useAuthStore((s) => s.role);
    const isMJ = role === "mj";
    const bgImage = campaign.image_url || '/default-bg.jpg';
    const { data: progress } = useCampaignProgress(campaign.id);
    const { data: revealedPnjs } = useRevealedPnjs(campaign.id);
    const createInvitation = useCreateCampaignInvitation();
    const [inviteCode, setInviteCode] = useState<string | null>(null);
    const [inviteError, setInviteError] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);

    const createdAt = campaign.created_at
        ? new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", year: "numeric" }).format(new Date(campaign.created_at))
        : null;

    return (
        <div className="flex-1 relative p-10">
            {/* Campaign card + stats — top right */}
            <div className="absolute top-6 right-8 flex flex-col gap-3 w-56">
                {/* Card */}
                <div className="relative w-56 h-80 rounded-xl overflow-hidden shadow-[0_8px_32px_rgba(0,0,0,0.5)] group">
                    <div
                        className="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-105"
                        style={{ backgroundImage: `url('${bgImage}')` }}
                    />
                    <div className="absolute inset-0" style={theme.gradientCard} />
                    <div
                        className="absolute inset-0 bg-cover bg-center pointer-events-none opacity-80 group-hover:opacity-100 transition-opacity"
                        style={{ backgroundImage: "url('/card-overlay.svg')" }}
                    />
                    <div className="absolute bottom-8 left-6 right-6 flex flex-col gap-1.5">
                        <h2 className="text-lg font-serif text-white leading-snug tracking-wide">
                            {campaign.nom}
                        </h2>
                        {campaign.description && (
                            <p className="text-[11px] text-white/60 leading-relaxed">
                                {campaign.description}
                            </p>
                        )}
                    </div>
                </div>

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
                            <div
                                key={pnj.id}
                                className="flex flex-col items-center gap-2 w-24 group"
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
                            </div>
                        ))}
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

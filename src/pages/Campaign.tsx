import { theme } from "@/lib/theme";
import type { Campaign } from "@/hooks/useCampaigns";
import { useCampaignStats } from "@/hooks/useCampaigns";
import { Users, Skull, BookMarked, CalendarDays } from "lucide-react";

interface CampaignProps {
    campaign: Campaign;
}

export function CampaignHome({ campaign }: CampaignProps) {
    const bgImage = campaign.image_url || '/default-bg.jpg';
    const { data: stats } = useCampaignStats(campaign.id);

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
                    {[
                        { icon: Users,      label: "Personnages joueurs", value: stats?.pj },
                        { icon: Skull,      label: "Monstres",            value: stats?.monstres },
                        { icon: BookMarked, label: "Profils",             value: stats?.profils },
                    ].filter(({ value }) => (value ?? 0) > 0).map(({ icon: Icon, label, value }) => (
                        <div key={label} className="flex items-center justify-between">
                            <div className="flex items-center gap-2 text-white/50">
                                <Icon className="w-3.5 h-3.5 shrink-0" />
                                <span className="text-[11px]">{label}</span>
                            </div>
                            <span className="text-[12px] font-semibold text-white/80 tabular-nums">
                                {value}
                            </span>
                        </div>
                    ))}

                    {createdAt && (
                        <>
                            {[(stats?.pj ?? 0), (stats?.monstres ?? 0), (stats?.profils ?? 0)].some(v => v > 0) && (
                                <div className="h-px bg-white/10 my-0.5" />
                            )}
                            <div className="flex items-center gap-2 text-white/40">
                                <CalendarDays className="w-3.5 h-3.5 shrink-0" />
                                <span className="text-[11px]">Créée le {createdAt}</span>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}

import type { Campaign } from "@/hooks/useCampaigns";
import {
  useCreateCampaignInvitation,
  useRevealedPnjs,
} from "@/hooks/useCampaigns";
import {
  CalendarDays,
  Ticket,
  Loader2,
  UserSearch,
  Bell,
  X,
  Users,
} from "lucide-react";
import { CampaignHomeMobile } from "@/components/campaign/CampaignHomeMobile";
import { useIsMobile } from "@/hooks/useIsMobile";
import { PJList } from "@/components/campaign/PJList";
import { useAuthStore } from "@/stores/useAuthStore";
import { useEffect, useRef, useState } from "react";
import { useCampaignHomeData } from "@/hooks/useCampaignHomeData";
import { MagicCard } from "@/components/ui/MagicCard";

interface CampaignActivity {
  id: string;
  pseudo: string;
  at: string;
}

interface CampaignProps {
  campaign: Campaign;
  activityLog?: CampaignActivity[];
  onClearActivity?: (id?: string) => void;
}

export function CampaignHome({
  campaign,
  activityLog = [],
  onClearActivity,
}: CampaignProps) {
  const isMobile = useIsMobile();
  const role = useAuthStore((s) => s.role);
  const isMJ = role === "mj";
  const { data: revealedPnjs } = useRevealedPnjs(campaign.id);
  const createInvitation = useCreateCampaignInvitation();
  const [inviteCode, setInviteCode] = useState<string | null>(null);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [isActivityPanelOpen, setIsActivityPanelOpen] = useState(false);
  const activityPanelRef = useRef<HTMLDivElement | null>(null);
  const activityToggleRef = useRef<HTMLButtonElement | null>(null);
  const { fetchCampaignMembers } = useCampaignHomeData();
  const [membres, setMembres] = useState<Array<{ id: string; pseudo: string }>>(
    [],
  );

  useEffect(() => {
    fetchCampaignMembers(campaign.id).then(setMembres);
  }, [campaign.id, fetchCampaignMembers]);

  useEffect(() => {
    if (!isActivityPanelOpen) return;

    const handleOutsideClick = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        activityPanelRef.current?.contains(target) ||
        activityToggleRef.current?.contains(target)
      ) {
        return;
      }
      setIsActivityPanelOpen(false);
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsActivityPanelOpen(false);
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isActivityPanelOpen]);

  const createdAt = campaign.created_at
    ? new Intl.DateTimeFormat("fr-FR", {
        day: "numeric",
        month: "long",
        year: "numeric",
      }).format(new Date(campaign.created_at))
    : null;

  if (isMobile) {
    return <CampaignHomeMobile campaign={campaign} />;
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* ── Contenu principal + colonne droite ── */}
      <div className="flex-1 flex overflow-hidden">
        {/* ── Zone principale (scrollable) ── */}
        <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-white/10 p-8 pr-4 flex flex-col gap-8">
          {/* PNJs rencontrés */}
          {(revealedPnjs?.length ?? 0) > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-4">
                <UserSearch className="w-4 h-4 text-violet-400/70" />
                <h2 className="text-[11px] uppercase tracking-widest text-violet-300/60 font-semibold">
                  PNJs rencontrés
                </h2>
              </div>
              <div className="flex flex-wrap gap-4">
                {revealedPnjs!.map((pnj) => (
                  <div
                    key={pnj.id}
                    className="flex flex-col items-center gap-2 w-24 group text-left"
                  >
                    <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-violet-500/30 bg-white/5 shadow-lg group-hover:border-violet-400/60 transition-colors">
                      <img
                        src={pnj.image_url || "/default-avatar.png"}
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

          {/* Liste des personnages joueurs */}
          <div>
            <PJList campaignId={campaign.id} isMJ={isMJ} />
          </div>
        </div>

        {/* ── Colonne droite (fixe) ── */}
        <div className="w-60 shrink-0 overflow-visible p-4 flex flex-col gap-1 min-h-0 relative">
          {/* Card campagne */}
          <div className="relative overflow-visible">
            <MagicCard
              size="medium"
              imageUrl={campaign.image_url}
              title={campaign.nom}
              className="w-full pointer-events-none cursor-default hover:translate-y-0 hover:shadow-none"
            >
              {campaign.description && (
                <p className="text-[11px] text-white/80 leading-relaxed px-2">
                  {campaign.description}
                </p>
              )}
            </MagicCard>

            {isMJ && (
              <>
                <button
                  ref={activityToggleRef}
                  type="button"
                  onClick={() => setIsActivityPanelOpen((v) => !v)}
                  className="absolute top-2 right-2 z-30 h-7 w-7 rounded-full border border-white/25 bg-[#1E1941]/70 backdrop-blur-md text-white/80 hover:text-white hover:bg-[#2a2356]/80 transition-colors flex items-center justify-center"
                  aria-label="Afficher les notifications"
                >
                  <Bell className="w-3.5 h-3.5" />
                  {activityLog.length > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-amber-300 shadow-[0_0_10px_rgba(252,211,77,0.65)]" />
                  )}
                </button>

                <div
                  ref={activityPanelRef}
                  className={`absolute top-full right-full mr-3 mt-2 z-40 w-64 rounded-xl border border-[#E3CCCD]/20 bg-[#1E1941]/88 backdrop-blur-xl shadow-[0_18px_34px_rgba(7,6,18,0.55)] transition-all duration-300 ${
                    isActivityPanelOpen
                      ? "opacity-100 translate-y-0 pointer-events-auto"
                      : "opacity-0 translate-y-3 pointer-events-none"
                  }`}
                >
                  <div className="p-3 flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-[#E3CCCD]/80">
                        <Bell className="w-3.5 h-3.5" />
                        <span className="text-[10px] uppercase tracking-widest font-semibold">
                          Activité
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setIsActivityPanelOpen(false)}
                        className="p-1 rounded text-white/35 hover:text-white/75 transition-colors"
                        aria-label="Fermer les notifications"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>

                    {activityLog.length > 0 ? (
                      <>
                        <div className="h-px bg-white/12" />
                        <div className="max-h-56 overflow-y-auto scrollbar-thin scrollbar-thumb-white/10 flex flex-col gap-1.5 pr-1">
                          {activityLog.map((notif) => (
                            <div key={notif.id} className="flex items-center gap-2 group">
                              <div className="w-5 h-5 rounded-full bg-[#E3CCCD]/10 border border-[#E3CCCD]/20 flex items-center justify-center shrink-0">
                                <Bell className="w-2.5 h-2.5 text-[#E3CCCD]/60" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <span className="text-[11px] text-white/80 font-medium">
                                  {notif.pseudo}
                                </span>
                                <span className="text-[11px] text-white/40"> a rejoint</span>
                              </div>
                              <span className="text-[10px] text-white/25 tabular-nums shrink-0">
                                {notif.at}
                              </span>
                              <button
                                onClick={() => onClearActivity?.(notif.id)}
                                className="p-0.5 rounded text-white/20 hover:text-white/60 opacity-0 group-hover:opacity-100 transition-all shrink-0"
                              >
                                <X className="w-2.5 h-2.5" />
                              </button>
                            </div>
                          ))}
                        </div>
                        <button
                          type="button"
                          onClick={() => onClearActivity?.()}
                          className="text-[10px] text-white/35 hover:text-white/70 transition-colors self-end"
                        >
                          Tout effacer
                        </button>
                      </>
                    ) : (
                      <p className="text-[11px] text-white/40">Aucune activité récente.</p>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Panneau infos campagne (glassmorphism) */}
          <div className="relative flex-1 min-h-0 rounded-xl border border-white/20 bg-white/[0.07] backdrop-blur-xl shadow-[0_14px_28px_rgba(9,8,26,0.35)] overflow-hidden">
            <div className="relative h-full flex flex-col p-3 gap-2 min-h-0">
              {/* Date */}
              <div className="flex items-start gap-2 text-white/65 shrink-0">
                <CalendarDays className="w-3.5 h-3.5" />
                {createdAt && (
                  <p className="text-[10px] text-white/70">
                    Créée le {createdAt}
                  </p>
                )}
              </div>

              {/* Divider */}
              <div className="h-px bg-white/12 shrink-0" />

              {/* Invitation compacte (MJ seulement) */}
              {isMJ && (
                <>
                  <div className="shrink-0 flex items-center gap-2">
                    <button
                      onClick={() => {
                        setInviteError(null);
                        createInvitation.mutate(
                          { campaignId: campaign.id },
                          {
                            onSuccess: (inv) => setInviteCode(inv.code),
                            onError: (err: Error) =>
                              setInviteError(
                                err?.message ?? "Impossible de créer le code",
                              ),
                          },
                        );
                      }}
                      className="flex-1 flex items-center justify-center gap-1 rounded-md border border-amber-200/35 bg-amber-300/12 hover:bg-amber-300/22 text-amber-100 text-[10px] py-1 transition-colors"
                    >
                      {createInvitation.isPending ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <>
                          <Ticket className="w-3 h-3" />
                          Générer invitation
                        </>
                      )}
                    </button>
                    {inviteCode && (
                      <button
                        onClick={async () => {
                          await navigator.clipboard.writeText(inviteCode);
                          setCopied(true);
                          setTimeout(() => setCopied(false), 2000);
                        }}
                        className={`px-2.5 py-1 rounded-md border text-[10px] font-mono tracking-wide transition-colors ${
                          copied
                            ? "border-emerald-400/40 bg-emerald-400/15 text-emerald-200"
                            : "border-amber-200/35 bg-white/8 hover:bg-white/13 text-amber-50"
                        }`}
                      >
                        {copied ? "Copié" : inviteCode}
                      </button>
                    )}
                  </div>
                  {inviteError && (
                    <p className="text-[10px] text-red-300 shrink-0">
                      {inviteError}
                    </p>
                  )}
                </>
              )}
              {/* Divider */}
              <div className="h-px bg-white/12 shrink-0" />
              
              {/* Joueurs */}
              <div className="shrink-0 flex items-center gap-2 text-white/60">
                <Users className="w-3.5 h-3.5" />
                <h3 className="text-[10px] uppercase tracking-widest font-semibold">
                  Joueurs{membres.length > 0 ? ` (${membres.length})` : ""}
                </h3>
              </div>
              {membres.length > 0 ? (
                <div className="shrink-0 max-h-28 overflow-y-auto scrollbar-thin scrollbar-thumb-white/10 space-y-1">
                  {membres.map((m) => (
                    <div key={m.id} className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-400/60 shrink-0" />
                      <span className="text-[12px] text-white/80">
                        {m.pseudo}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-[11px] text-white/40 shrink-0">
                  Aucun joueur pour le moment.
                </p>
              )}

            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

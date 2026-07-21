import { useEffect, useState } from "react";
import { CalendarDays, Ticket, Copy, Check, Loader2, UserSearch } from "lucide-react";
import { theme } from "@/lib/theme";
import type { Campaign } from "@/hooks/useCampaigns";
import { useCampaignProgress, useCreateCampaignInvitation, useRevealedPnjs } from "@/hooks/useCampaigns";
import { PJList } from "@/components/campaign/PJList";
import { useAuthStore } from "@/stores/useAuthStore";
import { supabase } from "@/lib/supabase";

interface CampaignHomeMobileProps {
  campaign: Campaign;
}

export function CampaignHomeMobile({ campaign }: CampaignHomeMobileProps) {
  const role = useAuthStore((s) => s.role);
  const isMJ = role === "mj";
  const bgImage = campaign.image_url || "/default-bg.jpg";
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
      const { data } = await supabase.from("voies").select("id, nom").in("id", voieIds);

      const voieName = new Map((data ?? []).map((v) => [v.id, v.nom]));
      setSelectedPnjVoies(
        selectedPnj.pathways
          .map((p) => ({
            id: p.voie_id,
            nom: voieName.get(p.voie_id) ?? "Voie inconnue",
            rang: p.rangs_acquis && p.rangs_acquis.length > 0 ? Math.max(...p.rangs_acquis) : 0,
          }))
          .sort((a, b) => a.nom.localeCompare(b.nom))
      );
    };
    void loadVoies();
  }, [selectedPnjId, selectedPnj]);

  const createdAt = campaign.created_at
    ? new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", year: "numeric" }).format(new Date(campaign.created_at))
    : null;

  return (
    <div className="lg:hidden flex-1 min-h-0 overflow-y-auto px-4 pt-4 pb-28 space-y-4">
      <section className="rounded-2xl overflow-hidden border border-white/10 bg-[#1E1941]/65 backdrop-blur-xl shadow-[0_12px_30px_rgba(0,0,0,0.3)]">
        <div className="relative h-35">
          <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url('${bgImage}')` }} />
          <div className="absolute inset-0" style={theme.gradientCard} />
          <div className="absolute bottom-3 left-3 right-3">
            <h2 className="text-xl font-serif text-white leading-tight tracking-wide">{campaign.nom}</h2>
            {campaign.description && <p className="text-[12px] text-white/65 mt-1 line-clamp-2">{campaign.description}</p>}
          </div>
        </div>

        <div className="p-2 space-y-2">
          {createdAt && (
            <div className="flex items-center gap-2 text-white/45">
              <CalendarDays className="w-3.5 h-3.5 shrink-0" />
              <span className="text-[11px]">Créée le {createdAt}</span>
            </div>
          )}

          {(progress?.totalChapitres ?? 0) > 0 && (
            <div className="space-y-1.5 rounded-xl border border-white/10 bg-white/5 p-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase tracking-widest text-white/45">Progression</span>
                <span className="text-[11px] font-semibold text-white/70 tabular-nums">
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
              <span className="text-[10px] text-white/35">
                {progress!.totalScenarios} scenario{progress!.totalScenarios > 1 ? "s" : ""}
              </span>
            </div>
          )}

          {isMJ && (
            <div className="rounded-xl border border-amber-300/25 bg-amber-500/7 p-3 space-y-2.5">
              <div className="flex items-center gap-2 text-amber-200/90">
                <Ticket className="w-3.5 h-3.5" />
                <span className="text-[10px] uppercase tracking-widest">Invitation joueurs</span>
              </div>

              <button
                onClick={() => {
                  setInviteError(null);
                  createInvitation.mutate(
                    { campaignId: campaign.id },
                    {
                      onSuccess: (inv) => setInviteCode(inv.code),
                      onError: (err: Error) => setInviteError(err?.message ?? "Impossible de creer le code"),
                    }
                  );
                }}
                className="w-full h-9 rounded-lg border border-amber-200/20 bg-amber-400/10 hover:bg-amber-400/20 text-amber-100 text-[11px] transition-colors"
              >
                {createInvitation.isPending ? <Loader2 className="w-3.5 h-3.5 mx-auto animate-spin" /> : "Generer un code"}
              </button>

              {inviteCode && (
                <button
                  onClick={async () => {
                    await navigator.clipboard.writeText(inviteCode);
                    setCopied(true);
                    setTimeout(() => setCopied(false), 2000);
                  }}
                  className={`w-full h-9 flex items-center justify-center gap-1.5 rounded-lg border text-[11px] transition-colors ${
                    copied
                      ? "border-emerald-400/40 bg-emerald-400/15 text-emerald-200"
                      : "border-white/15 bg-white/5 hover:bg-white/10 text-white"
                  }`}
                >
                  {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  {copied ? "Copie !" : inviteCode}
                </button>
              )}

              {inviteError && <p className="text-[10px] text-red-300">{inviteError}</p>}
            </div>
          )}
        </div>
      </section>

      {(revealedPnjs?.length ?? 0) > 0 && (
        <section className="rounded-2xl border border-violet-300/20 bg-[#1E1941]/55 backdrop-blur-lg p-4">
          <div className="flex items-center gap-2 mb-3">
            <UserSearch className="w-4 h-4 text-violet-400/75" />
            <h3 className="text-[10px] uppercase tracking-widest text-violet-300/65 font-semibold">PNJs rencontres</h3>
          </div>

          <div className="flex gap-3 overflow-x-auto pb-1">
            {revealedPnjs!.map((pnj) => (
              <button key={pnj.id} type="button" onClick={() => setSelectedPnjId(pnj.id)} className="flex flex-col items-center gap-1.5 w-20 shrink-0">
                <div className="w-14 h-14 rounded-full overflow-hidden border-2 border-violet-500/30 bg-white/5">
                  <img src={pnj.image_url || "/default-avatar.png"} alt={pnj.name} className="w-full h-full object-cover" />
                </div>
                <span className="text-[11px] text-white/75 text-center leading-tight font-medium line-clamp-2">{pnj.name}</span>
              </button>
            ))}
          </div>
        </section>
      )}

      <section >
        <div className="space-y-2">
          <PJList campaignId={campaign.id} isMJ={isMJ} />
        </div>
      </section>

      {selectedPnj && (
        <div className="fixed inset-0 z-60 bg-black/65 backdrop-blur-sm p-3 flex items-center justify-center" onClick={() => setSelectedPnjId(null)}>
          <div className="w-full max-w-md rounded-2xl border border-violet-300/25 bg-[#1E1941]/95 shadow-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="px-4 py-3 border-b border-white/10 flex items-start gap-3">
              <div className="w-11 h-11 rounded-full border-2 border-violet-400/60 overflow-hidden shrink-0">
                <img src={selectedPnj.image_url || "/default-avatar.png"} alt={selectedPnj.name} className="w-full h-full object-cover" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] uppercase tracking-widest text-violet-300/55">Fiche technique PNJ</p>
                <h3 className="font-serif text-lg text-white truncate">{selectedPnj.name}</h3>
              </div>
              <button onClick={() => setSelectedPnjId(null)} className="p-1.5 rounded-full text-white/45 hover:text-white hover:bg-white/10 transition-colors" aria-label="Fermer la fiche PNJ">
                x
              </button>
            </div>

            <div className="p-4 space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-lg border border-white/10 bg-white/5 p-2.5">
                  <p className="text-[10px] uppercase tracking-wide text-white/45">Initiative</p>
                  <p className="text-sm text-white font-semibold mt-1 tabular-nums">{Number(selectedPnj.stats?.initiative ?? 0)}</p>
                </div>
                <div className="rounded-lg border border-white/10 bg-white/5 p-2.5">
                  <p className="text-[10px] uppercase tracking-wide text-white/45">Defense</p>
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
    </div>
  );
}

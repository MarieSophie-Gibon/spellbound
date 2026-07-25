import type { NormalizedVoieRang } from "@/lib/voieRanks";

export type VoieSection = 'bonus' | 'capacite' | 'action' | 'familier';

interface RangCardProps {
  rang: NormalizedVoieRang;
  rangNum: number;
  /** Lorsque fourni, opacifie la carte si false (voie non acquise) */
  isAcquired?: boolean;
  /** Masque la section Legacy */
  hideLegacy?: boolean;
  /** Si fourni, n'affiche que les sections listées */
  sections?: Set<VoieSection>;
}

// ─── Palette de couleurs ────────────────────────────────────────────────────

const COLORS = {
  bonus: {
    border: "border-[#e9c46a]/50",
    bg: "bg-[#e9c46a]/5",
    badge: "text-[#e9c46a] border-[#e9c46a]/50 bg-[#e9c46a]/10",
    glow: "0 0 6px rgba(233,196,106,0.45), 0 0 14px rgba(233,196,106,0.2)",
  },
  capacite: {
    border: "border-[#90e0ef]/50",
    bg: "bg-[#90e0ef]/5",
    badge: "text-[#90e0ef] border-[#90e0ef]/50 bg-[#90e0ef]/10",
    glow: "0 0 6px rgba(144,224,239,0.45), 0 0 14px rgba(144,224,239,0.2)",
  },
  action: {
    border: "border-[#f4a261]/50",
    bg: "bg-[#f4a261]/5",
    badge: "text-[#f4a261] border-[#f4a261]/50 bg-[#f4a261]/10",
    glow: "0 0 6px rgba(244,162,97,0.45), 0 0 14px rgba(244,162,97,0.2)",
  },
  familier: {
    border: "border-[#6ee7b7]/50",
    bg: "bg-[#6ee7b7]/5",
    badge: "text-[#6ee7b7] border-[#6ee7b7]/50 bg-[#6ee7b7]/10",
    glow: "0 0 6px rgba(110,231,183,0.45), 0 0 14px rgba(110,231,183,0.2)",
  },
  legacy: {
    border: "border-[#c084fc]/50",
    bg: "bg-[#c084fc]/5",
    badge: "text-[#c084fc] border-[#c084fc]/50 bg-[#c084fc]/10",
    glow: "0 0 6px rgba(192,132,252,0.45), 0 0 14px rgba(192,132,252,0.2)",
  },
} as const;

// ─── Badge néon ─────────────────────────────────────────────────────────────

const ACTION_VARIANTS: Record<string, { label: string; badge: string; glow: string; border: string; textColor: string }> = {
  A: { label: "Action Attaque",  badge: "text-[#f87171] border-[#f87171]/50 bg-[#f87171]/10", glow: "0 0 6px rgba(248,113,113,0.45), 0 0 14px rgba(248,113,113,0.2)", border: "border-[#f87171]/50", textColor: "text-[#f87171]" },
  M: { label: "Action Mouvement", badge: "text-[#a3e635] border-[#a3e635]/50 bg-[#a3e635]/10", glow: "0 0 6px rgba(163,230,53,0.45), 0 0 14px rgba(163,230,53,0.2)",  border: "border-[#a3e635]/50", textColor: "text-[#a3e635]" },
  L: { label: "Action Limitée",  badge: "text-[#f472b6] border-[#f472b6]/50 bg-[#f472b6]/10", glow: "0 0 6px rgba(244,114,182,0.45), 0 0 14px rgba(244,114,182,0.2)", border: "border-[#f472b6]/50", textColor: "text-[#f472b6]" },
  G: { label: "Action Gratuite", badge: "text-[#38bdf8] border-[#38bdf8]/50 bg-[#38bdf8]/10", glow: "0 0 6px rgba(56,189,248,0.45), 0 0 14px rgba(56,189,248,0.2)",  border: "border-[#38bdf8]/50", textColor: "text-[#38bdf8]" },
};

type BadgeColor = { badge: string; glow: string };

function NeonBadge({ label, color }: { label: string; color: BadgeColor }) {
  return (
    <span
      className={`inline-flex items-center leading-none text-[7px] uppercase tracking-widest font-semibold rounded-full px-1.5 py-0.5 border ${color.badge}`}
      style={{ boxShadow: color.glow }}
    >
      {label}
    </span>
  );
}

// ─── Composant principal ─────────────────────────────────────────────────────

export function RangCard({ rang, rangNum, isAcquired, hideLegacy, sections }: RangCardProps) {
  const dimmed = isAcquired === false;

  // Filtrer les entrées vides (normalizeVoieRang ajoute toujours un élément vide par section)
  const isNonEmpty = (v: string) => !!v && v.trim().length > 0;
  const bonuses = rang.bonus.filter(b => [b.titre, b.type, b.valeur, b.condition].some(isNonEmpty));
  const capacites = rang.capacites.filter(c => [c.titre, c.description].some(isNonEmpty));
  const actions = rang.actions.filter(a =>
    [a.titre, a.type, a.cout_mana, a.dm, a.test_type, a.resultat_si_reussi, a.description].some(isNonEmpty)
  );

  const inFilter = (key: VoieSection) => !sections || sections.has(key);

  const showBonus = bonuses.length > 0 && inFilter('bonus');
  const showCapacite = capacites.length > 0 && inFilter('capacite');
  const showAction = actions.length > 0 && inFilter('action');
  const familiers = rang.familiers.filter(f => [f.titre, f.description].some(isNonEmpty));
  const legacies = rang.legacies.filter(l => [l.titre, l.description].some(isNonEmpty));
  const showFamilier = familiers.length > 0 && inFilter('familier');
  const showLegacy = legacies.length > 0;

  // Mode "sections" : rang avec bonus / capacités / actions
  return (
    <div className={`rounded-lg border border-white/8 bg-black/10 px-3 py-2 space-y-2 ${dimmed ? "opacity-30" : ""}`}>
      <div className="flex items-center gap-2">
        <span className="w-5 h-5 rounded-full border border-[#E3CCCD]/25 flex items-center justify-center text-[10px] text-[#E3CCCD]/55 font-medium shrink-0">
          {rangNum}
        </span>
        <p className="text-[12px] font-semibold text-white">
          {rang.titre || rang.nom || `Rang ${rangNum}`}
        </p>
      </div>

      {showBonus && (
        <div className="border-l-2 border-[#e9c46a]/50 pl-2 space-y-1">
          {bonuses.map((bonus, idx) => (
            <div key={idx}>
              {bonus.titre ? (
                <>
                  <p className="text-[12px] text-white/75 flex flex-wrap items-center gap-1.5">
                    <NeonBadge label="Bonus" color={COLORS.bonus} />
                    <span className="text-white/90 font-medium">{bonus.titre}</span>
                    {(bonus.type || bonus.valeur) && (
                      <span className="text-[#e9c46a]/80">{[bonus.type, bonus.valeur].filter(Boolean).join(" ")}</span>
                    )}
                    {bonus.condition && <span className="text-white/45 italic">{bonus.condition}</span>}
                  </p>
                </>
              ) : (
                <p className="text-[12px] text-white/75 flex flex-wrap items-center gap-1.5">
                  <NeonBadge label="Bonus" color={COLORS.bonus} />
                  {(bonus.type || bonus.valeur) && (
                    <span className="text-[#e9c46a]/90 font-medium">{[bonus.type, bonus.valeur].filter(Boolean).join(" ")}</span>
                  )}
                  {bonus.condition && <span className="text-white/45 italic">{bonus.condition}</span>}
                </p>
              )}
            </div>
          ))}
        </div>
      )}

      {showCapacite && (
        <div className="border-l-2 border-[#90e0ef]/50 pl-2 space-y-1">
          {capacites.map((capacite, idx) => (
            <div key={idx}>
              {capacite.titre ? (
                <>
                  <p className="text-[12px] text-white/90 flex flex-wrap items-center gap-1.5 mb-0.5">
                    <NeonBadge label="Capacité" color={COLORS.capacite} />
                    <span className="font-medium">{capacite.titre}</span>
                  </p>
                  {capacite.description && (
                    <p className="text-[12px] text-white/55 leading-relaxed">{capacite.description}</p>
                  )}
                </>
              ) : (
                <p className="text-[12px] text-white/75 flex flex-wrap items-start gap-1.5">
                  <NeonBadge label="Capacité" color={COLORS.capacite} />
                  {capacite.description && <span className="text-white/70 leading-relaxed">{capacite.description}</span>}
                </p>
              )}
            </div>
          ))}
        </div>
      )}

      {showAction && (
        <div className="space-y-1">
          {actions.map((action, idx) => {
            const actionVariant = action.type ? ACTION_VARIANTS[action.type] : null;
            const borderColor = actionVariant?.border ?? "border-[#f4a261]/50";
            return (
            <div key={idx} className={`border-l-2 ${borderColor} pl-2`}>
              <p className="text-[12px] text-white/90 flex flex-wrap items-center gap-1.5 mb-0.5">
                {/* Badge action + Sort fusionné si sort */}
                <span className="inline-flex items-center leading-none">
                  <span
                    className={`inline-flex items-center leading-none text-[7px] uppercase tracking-widest font-semibold px-1.5 py-0.5 border ${action.sort ? "rounded-l-full border-r-0" : "rounded-full"} ${actionVariant?.badge ?? COLORS.action.badge}`}
                    style={{ boxShadow: actionVariant?.glow }}
                  >
                    {actionVariant?.label ?? "Action"}
                  </span>
                  {action.sort && (
                    <span
                      className={`inline-flex items-center leading-none text-[7px] uppercase tracking-widest font-semibold rounded-r-full px-1.5 py-0.5 border border-l-0 ${actionVariant?.badge ?? COLORS.action.badge} opacity-75`}
                    >
                      Sort{action.cout_mana ? ` · PM ${action.cout_mana}` : ""}
                    </span>
                  )}
                </span>
                {action.titre && <span className={`font-medium ${actionVariant?.textColor ?? "text-[#f4a261]"}`}>{action.titre}</span>}
                {action.dm && <span className={`text-[11px] ${actionVariant?.textColor ?? "text-[#f4a261]"}`}>DM {action.dm}</span>}
              </p>
              {action.test_oppose && (
                <p className="text-[12px] text-white/50">
                  Test opposé{action.test_type ? ` (${action.test_type})` : ""}
                  {action.resultat_si_reussi ? ` — Si réussi : ${action.resultat_si_reussi}` : ""}
                </p>
              )}
              {action.description && (
                <p className="text-[12px] text-white/55 leading-relaxed">{action.description}</p>
              )}
            </div>
            );
          })}
        </div>
      )}

      {!showBonus && !showCapacite && !showAction && !showFamilier && !showLegacy && rang.description && (
        <p className="text-[12px] font-light text-white/70 leading-relaxed">{rang.description}</p>
      )}

      {showFamilier && (
        <div className="border-l-2 border-[#6ee7b7]/50 pl-2 space-y-1">
          {familiers.map((f, idx) => (
            <div key={idx}>
              {f.titre ? (
                <>
                  <p className="text-[12px] text-white/90 flex flex-wrap items-center gap-1.5">
                    <NeonBadge label="Familier" color={COLORS.familier} />
                    <span className="font-medium">{f.titre}</span>
                  </p>
                  {f.description && <p className="text-[12px] text-white/55 leading-relaxed">{f.description}</p>}
                </>
              ) : (
                <p className="text-[12px] text-white/75 flex flex-wrap items-start gap-1.5">
                  <NeonBadge label="Familier" color={COLORS.familier} />
                  {f.description && <span className="text-white/70 leading-relaxed">{f.description}</span>}
                </p>
              )}
            </div>
          ))}
        </div>
      )}

      {showLegacy && !hideLegacy && (
        <div className="border-l-2 border-[#c084fc]/50 pl-2 space-y-1">
          {legacies.map((l, idx) => (
            <div key={idx}>
              {l.titre ? (
                <>
                  <p className="text-[12px] text-white/90 flex flex-wrap items-center gap-1.5">
                    <NeonBadge label="Legacy" color={COLORS.legacy} />
                    <span className="font-medium">{l.titre}</span>
                  </p>
                  {l.description && <p className="text-[12px] text-white/55 leading-relaxed">{l.description}</p>}
                </>
              ) : (
                <p className="text-[12px] text-white/75 flex flex-wrap items-start gap-1.5">
                  <NeonBadge label="Legacy" color={COLORS.legacy} />
                  {l.description && <span className="text-white/70 leading-relaxed">{l.description}</span>}
                </p>
              )}
            </div>
          ))}
        </div>
      )}

    </div>
  );
}

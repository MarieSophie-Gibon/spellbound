import { useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, Swords } from "lucide-react";
import { CombatDashboard } from "@/components/scenarios/CombatDashboard";

interface CombatPageProps {
  campaignId: string;
}

export function Combat({ campaignId }: CombatPageProps) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const chapitreId = useMemo(() => searchParams.get("chapitreId") ?? "", [searchParams]);
  const enemyBlockId = useMemo(() => searchParams.get("enemyBlockId") ?? undefined, [searchParams]);

  if (!chapitreId) {
    return (
      <div className="h-full flex items-center justify-center p-8">
        <div className="max-w-md w-full rounded-2xl border border-[#E3CCCD]/20 bg-[#1E1941]/70 p-6 text-center">
          <Swords className="w-8 h-8 text-[#E3CCCD] mx-auto mb-3" />
          <h2 className="text-lg text-white font-serif mb-2">Aucun chapitre sélectionné</h2>
          <p className="text-sm text-white/60 mb-5">
            Ouvre le dashboard depuis un bloc ennemi du scénario pour lancer le combat.
          </p>
          <button
            onClick={() => navigate("/campaign/scenarios")}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-[#E3CCCD]/25 bg-[#E3CCCD]/10 text-[#E3CCCD] hover:bg-[#E3CCCD]/20 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Retour aux scénarios
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col min-h-0">
      <div className="relative flex-1 p-4 md:p-6 overflow-hidden">
        <CombatDashboard
          chapitreId={chapitreId}
          enemyBlockId={enemyBlockId}
          campaignId={campaignId}
          onBackToScenario={() => navigate(`/campaign/scenarios?chapitreId=${chapitreId}`)}
        />
      </div>
    </div>
  );
}

import { useCampaignProgress } from "@/hooks/campaign/useCampaigns";

interface CampaignProgressBarProps {
  campaignId: string;
}

export function CampaignProgressBar({ campaignId }: CampaignProgressBarProps) {
  const { data: progress } = useCampaignProgress(campaignId);

  if (!progress || progress.totalChapitres === 0) return null;

  const pct = Math.round(
    (progress.completedChapitres / progress.totalChapitres) * 100,
  );

  return (
    <div className="relative z-10 shrink-0 border-t border-white/20 bg-[#1E1941]/55 backdrop-blur-md px-8 py-5 flex items-center gap-5 w-full">
      {/* Ornement gauche */}
      <div className="flex items-center gap-2 shrink-0">
        <span className="text-[#E3CCCD]/40 text-base leading-none select-none">✦</span>
        <div className="flex flex-col items-start leading-none">
          <span className="text-[9px] uppercase tracking-[0.2em] text-[#E3CCCD]/50 font-semibold">
            Progression
          </span>
          <span className="text-[12px] font-semibold text-[#E3CCCD]/80 tabular-nums mt-0.5">
            {progress.completedChapitres}/{progress.totalChapitres}{" "}
            chapitres
          </span>
        </div>
      </div>

      {/* Barre */}
      <div className="flex-1 relative h-2">
        {/* Rail */}
        <div className="absolute inset-0 rounded-full bg-white/10 border border-white/15" />
        {/* Fill */}
        <div
          className="absolute inset-y-0 left-0 rounded-full transition-all duration-700"
          style={{
            width: `${pct}%`,
            background:
              "linear-gradient(90deg, #4c1d95 0%, #7c3aed 40%, #E3CCCD 80%, #c9a8aa 100%)",
            boxShadow:
              "0 0 8px rgba(196, 168, 170, 0.3), 0 0 3px rgba(124, 58, 237, 0.45)",
          }}
        />
        {/* Reflet */}
        <div
          className="absolute top-0 left-0 h-1/2 rounded-t-full bg-white/20 transition-all duration-700 pointer-events-none"
          style={{ width: `${pct}%` }}
        />
      </div>

      {/* Pourcentage + scénarios */}
      <div className="flex items-center gap-2 shrink-0">
        <span className="text-[12px] font-bold tabular-nums text-[#E3CCCD]/65">
          {pct}&nbsp;%
        </span>
        <span className="text-[#E3CCCD]/35 text-base leading-none select-none">
          ✦
        </span>
      </div>
    </div>
  );
}

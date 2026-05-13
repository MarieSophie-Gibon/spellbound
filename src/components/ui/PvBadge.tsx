import { Heart } from "lucide-react";

interface PvBadgeProps {
  pvMax?: number | null;
}

export function PvBadge({ pvMax }: PvBadgeProps) {
  const ribbonShape = "polygon(0 0, 100% 0, 100% 65%, 50% 100%, 0 65%)";

  return (
    <div className="inline-flex flex-col drop-shadow-md">
      <div 
        className="bg-white/80 px-px pb-px pt-0"
        style={{ clipPath: ribbonShape }}
      >
        <div
          className="flex flex-col items-center bg-linear-to-b from-[#151B45] to-[#4456AA] w-10 pt-3 pb-1"
          style={{ clipPath: ribbonShape }}
        >
          {pvMax && (
            <span className="text-[#E8D4D4]/60 text-l leading-none mt-1">
              {pvMax}
            </span>
          )}

          <Heart className="w-5 h-5 text-[#E8D4D4] fill-[#E8D4D4] mt-2" strokeWidth={1.5} />
        </div>
      </div>
    </div>
  );
}
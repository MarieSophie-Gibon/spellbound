import type { ReactNode } from "react";
import type { RpgSystem } from "@/lib/types/rpgSystem";
import { BookOpen } from "lucide-react";

interface SystemComingSoonProps {
  system: RpgSystem;
  feature: string;
  extra?: ReactNode;
}

function systemLabel(system: RpgSystem): string {
  if (system === "DAGGERHEART") return "Daggerheart";
  if (system === "DND5E") return "D&D 5E";
  return "COF";
}

export function SystemComingSoon({ system, feature, extra }: SystemComingSoonProps) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center text-center p-10 h-full opacity-70">
      <BookOpen className="w-16 h-16 text-[#E3CCCD]/20 mb-6" />
      <h2 className="font-serif text-2xl text-white tracking-widest uppercase mb-3 leading-none">
        {feature} - {systemLabel(system)}
      </h2>
      <p className="text-[13px] text-white/50 font-light max-w-sm">Contenu en cours d'implementation pour ce systeme.</p>
      {extra}
    </div>
  );
}

import type { ReactNode } from "react";
import type { RpgSystem } from "@/lib/types/rpgSystem";
import { SystemComingSoon } from "@/components/systems/SystemComingSoon";

interface PersonnagesSystemSwitcherProps {
  system?: RpgSystem | null;
  cofContent: ReactNode;
  dhContent?: ReactNode;
  dnd5eContent?: ReactNode;
}

export function PersonnagesSystemSwitcher({
  system,
  cofContent,
  dhContent,
  dnd5eContent,
}: PersonnagesSystemSwitcherProps) {
  const resolvedSystem: RpgSystem = system ?? "COF";

  if (resolvedSystem === "DAGGERHEART") {
    return dhContent ?? <SystemComingSoon system="DAGGERHEART" feature="Personnages" />;
  }

  if (resolvedSystem === "DND5E") {
    return dnd5eContent ?? <SystemComingSoon system="DND5E" feature="Personnages" />;
  }

  return <>{cofContent}</>;
}

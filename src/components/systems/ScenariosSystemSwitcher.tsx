import type { ReactNode } from "react";
import type { RpgSystem } from "@/lib/types/rpgSystem";
import { SystemComingSoon } from "@/components/systems/SystemComingSoon";

interface ScenariosSystemSwitcherProps {
  system?: RpgSystem | null;
  cofContent: ReactNode;
  dhContent?: ReactNode;
  dnd5eContent?: ReactNode;
}

export function ScenariosSystemSwitcher({
  system,
  cofContent,
  dhContent,
  dnd5eContent,
}: ScenariosSystemSwitcherProps) {
  const resolvedSystem: RpgSystem = system ?? "COF";

  if (resolvedSystem === "DAGGERHEART") {
    return dhContent ?? <SystemComingSoon system="DAGGERHEART" feature="Scenarios" />;
  }

  if (resolvedSystem === "DND5E") {
    return dnd5eContent ?? <SystemComingSoon system="DND5E" feature="Scenarios" />;
  }

  return <>{cofContent}</>;
}

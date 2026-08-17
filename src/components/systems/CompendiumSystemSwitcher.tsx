import type { ReactNode } from "react";
import type { RpgSystem } from "@/lib/types/rpgSystem";
import { SystemComingSoon } from "@/components/systems/SystemComingSoon";

interface CompendiumSystemSwitcherProps {
  system?: RpgSystem | null;
  cofContent: ReactNode;
  dhContent?: ReactNode;
  dnd5eContent?: ReactNode;
}

export function CompendiumSystemSwitcher({
  system,
  cofContent,
  dhContent,
  dnd5eContent,
}: CompendiumSystemSwitcherProps) {
  const resolvedSystem: RpgSystem = system ?? "COF";

  if (resolvedSystem === "DAGGERHEART") {
    return dhContent ?? <SystemComingSoon system="DAGGERHEART" feature="Compendium" />;
  }

  if (resolvedSystem === "DND5E") {
    return dnd5eContent ?? <SystemComingSoon system="DND5E" feature="Compendium" />;
  }

  return <>{cofContent}</>;
}

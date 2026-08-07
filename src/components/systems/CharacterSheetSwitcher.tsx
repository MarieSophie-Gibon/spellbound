import type { ReactNode } from "react";
import { CofCharacterSheet } from "@/components/systems/cof/CofCharacterSheet";
import { DhCharacterSheet } from "@/components/systems/dh/DhCharacterSheet";

export type RpgSystem = "COF" | "DAGGERHEART";

interface CharacterSheetSwitcherProps {
  system?: RpgSystem | null;
  cofContent?: ReactNode;
  dhContent?: ReactNode;
}

export function CharacterSheetSwitcher({
  system,
  cofContent,
  dhContent,
}: CharacterSheetSwitcherProps) {
  const resolvedSystem: RpgSystem = system === "DAGGERHEART" ? "DAGGERHEART" : "COF";

  if (resolvedSystem === "DAGGERHEART") {
    return <DhCharacterSheet>{dhContent}</DhCharacterSheet>;
  }

  return <CofCharacterSheet>{cofContent}</CofCharacterSheet>;
}

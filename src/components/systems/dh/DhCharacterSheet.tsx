import type { ReactNode } from "react";

interface DhCharacterSheetProps {
  children?: ReactNode;
}

export function DhCharacterSheet({ children }: DhCharacterSheetProps) {
  if (children) return <>{children}</>;

  return (
    <div className="rounded-lg border border-white/10 bg-white/5 p-4 text-sm text-white/70">
      Daggerheart character sheet placeholder
    </div>
  );
}

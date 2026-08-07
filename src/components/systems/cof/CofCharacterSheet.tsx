import type { ReactNode } from "react";

interface CofCharacterSheetProps {
  children?: ReactNode;
}

export function CofCharacterSheet({ children }: CofCharacterSheetProps) {
  // Transitional wrapper: mount existing COF sheet as children when integrating.
  if (children) return <>{children}</>;

  return (
    <div className="rounded-lg border border-white/10 bg-white/5 p-4 text-sm text-white/70">
      COF character sheet placeholder
    </div>
  );
}

import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import type { RpgSystem } from "@/lib/types/rpgSystem";

interface GrimoirePopupState {
  open: boolean;
  pageId: string | null;
  searchQuery: string;
  system: RpgSystem | null;
  campaignId: string | null;
}

interface GrimoirePopupContextValue {
  openPopup: (options?: { pageId?: string; searchQuery?: string; system?: RpgSystem; campaignId?: string }) => void;
  closePopup: () => void;
  state: GrimoirePopupState;
}

const GrimoirePopupContext = createContext<GrimoirePopupContextValue | null>(null);

export function GrimoirePopupProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<GrimoirePopupState>({
    open: false,
    pageId: null,
    searchQuery: "",
    system: null,
    campaignId: null,
  });

  const openPopup = useCallback((options?: { pageId?: string; searchQuery?: string; system?: RpgSystem; campaignId?: string }) => {
    setState({
      open: true,
      pageId: options?.pageId ?? null,
      searchQuery: options?.searchQuery ?? "",
      system: options?.system ?? null,
      campaignId: options?.campaignId ?? null,
    });
  }, []);

  const closePopup = useCallback(() => {
    setState({ open: false, pageId: null, searchQuery: "", system: null, campaignId: null });
  }, []);

  return (
    <GrimoirePopupContext.Provider value={{ openPopup, closePopup, state }}>
      {children}
    </GrimoirePopupContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useGrimoirePopup(): GrimoirePopupContextValue {
  const ctx = useContext(GrimoirePopupContext);
  if (!ctx) throw new Error("useGrimoirePopup must be used inside GrimoirePopupProvider");
  return ctx;
}

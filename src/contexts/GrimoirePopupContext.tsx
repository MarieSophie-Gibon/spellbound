import { createContext, useCallback, useContext, useState, type ReactNode } from "react";

interface GrimoirePopupState {
  open: boolean;
  pageId: string | null;
  searchQuery: string;
}

interface GrimoirePopupContextValue {
  openPopup: (options?: { pageId?: string; searchQuery?: string }) => void;
  closePopup: () => void;
  state: GrimoirePopupState;
}

const GrimoirePopupContext = createContext<GrimoirePopupContextValue | null>(null);

export function GrimoirePopupProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<GrimoirePopupState>({ open: false, pageId: null, searchQuery: "" });

  const openPopup = useCallback((options?: { pageId?: string; searchQuery?: string }) => {
    setState({ open: true, pageId: options?.pageId ?? null, searchQuery: options?.searchQuery ?? "" });
  }, []);

  const closePopup = useCallback(() => {
    setState({ open: false, pageId: null, searchQuery: "" });
  }, []);

  return (
    <GrimoirePopupContext.Provider value={{ openPopup, closePopup, state }}>
      {children}
    </GrimoirePopupContext.Provider>
  );
}

export function useGrimoirePopup(): GrimoirePopupContextValue {
  const ctx = useContext(GrimoirePopupContext);
  if (!ctx) throw new Error("useGrimoirePopup must be used inside GrimoirePopupProvider");
  return ctx;
}

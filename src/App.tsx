import { useEffect, useState } from "react";
import { useAuthStore } from "@/stores/useAuthStore";
import { Login } from "@/components/auth/Login";
import { SideNav } from "@/components/layout/SideNav";
import { Footer } from "@/components/layout/Footer";
import { Lobby } from "./pages/Lobby";
import type { Campaign } from "@/hooks/useCampaigns";
import { Grimoire } from "@/pages/Grimoire";
import { Compendium } from "@/pages/Compendium"; // <-- Ajout de l'import

type TabType = "grimoire" | "compendium" | "none";

function App() {
  const { session, isLoading, initializeAuth } = useAuthStore();
  const [activeCampaign, setActiveCampaign] = useState<Campaign | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>("none");

  useEffect(() => {
    const unsubscribe = initializeAuth();
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [initializeAuth]);

  if (isLoading) return <div className="min-h-screen bg-slate-950" />;

  return (
    <div className="relative h-screen flex flex-col font-sans text-slate-200" style={{ overflow: "clip" }}>
      {/* BACKGROUNDS & OVERLAYS */}
      <div className="absolute inset-0 z-0">
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: "url('/default-bg.jpg')" }}
        />
        <div className="absolute inset-0 backdrop-blur-md" />
        <div className="absolute inset-0 bg-[#d9d9d9]/20 mix-blend-overlay" />
        <div
          className="absolute inset-0 bg-contain bg-right pointer-events-none opacity-80 bg-no-repeat"
          style={{ backgroundImage: "url('/overlay.svg')" }}
        />
      </div>

      {/* ZONE CENTRALE */}
      <div className="relative z-10 flex flex-1 overflow-hidden">
        <SideNav activeTab={activeTab} onTabChange={setActiveTab} />

        <main className="flex-1 overflow-hidden flex flex-col">
          {!session ? (
            <Login />
          ) : (
            <>
              {/* 1. Si on a cliqué sur un onglet, il prend la priorité */}
              {activeTab === "grimoire" && (
                <Grimoire isGlobal={!activeCampaign} onBack={() => setActiveTab("none")} />
              )}

              {activeTab === "compendium" && (
                <Compendium 
                  campaignId={activeCampaign?.id} 
                  onBack={() => setActiveTab("none")} 
                />
              )}

              {/* 2. Si aucun onglet n'est sélectionné ('none'), on gère l'affichage de base */}
              {activeTab === "none" &&
                (!activeCampaign ? (
                  <Lobby
                    onSelectCampaign={(campaign) => {
                      setActiveCampaign(campaign);
                      // Optionnel : on peut décider de rester sur 'none'
                      // ou d'ouvrir le grimoire de la campagne direct
                    }}
                    onCreateCampaign={() =>
                      console.log("Afficher la création de campagne")
                    }
                  />
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center text-center p-10">
                    <h2 className="text-2xl font-serif text-white uppercase tracking-widest">
                      {activeCampaign.nom}
                    </h2>
                    <p className="text-white/40 italic mt-2">
                      Sélectionnez un onglet dans la navigation pour commencer.
                    </p>
                  </div>
                ))}
            </>
          )}
        </main>
      </div>

      {/* FOOTER (Prend 100% de la largeur de l'écran en bas) */}
      <div className="relative z-20 w-full shrink-0">
        <Footer />
      </div>
    </div>
  );
}

export default App;
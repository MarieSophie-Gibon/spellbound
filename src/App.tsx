import { useEffect, useState } from "react";
import { theme } from "@/lib/theme";
import { useAuthStore } from "@/stores/useAuthStore";
import { Login } from "@/components/auth/Login";
import { Wiki } from "@/pages/Wiki";
import { SideNav } from "@/components/layout/SideNav";
import { Footer } from "@/components/layout/Footer";
import { Lobby } from "./pages/Lobby";
import type { Campaign } from "@/hooks/useCampaigns";

function App() {
  const { session, isLoading, initializeAuth } = useAuthStore();
  const [activeCampaign, setActiveCampaign] = useState<Campaign | null>(null);

  useEffect(() => {
    const unsubscribe = initializeAuth();
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [initializeAuth]);

  if (isLoading) return <div className="min-h-screen bg-slate-950" />;

  return (
    // Structure globale en colonne (Haut = Nav+Contenu / Bas = Footer)
    <div className="relative min-h-screen flex flex-col overflow-hidden font-sans text-slate-200">
      {/* BACKGROUNDS & OVERLAYS */}
      <div className="absolute inset-0 z-0">
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: "url('/default-bg.jpg')" }}
        />
        <div className={`absolute inset-0 ${theme.glassOverlay}`} />
        <div
          className="absolute inset-0 bg-contain bg-right pointer-events-none opacity-80 bg-no-repeat"
          style={{ backgroundImage: "url('/overlay.svg')" }}
        />
      </div>

      {/* ZONE CENTRALE (Prend l'espace restant) */}
      <div className="relative z-10 flex flex-1 overflow-hidden">
        {/* NAVIGATION GAUCHE (Collée en haut grâce à self-start, hauteur 60vh) */}
        <SideNav />

        {/* ZONE DE CONTENU PRINCIPALE */}
       <main className="flex-1 overflow-auto flex flex-col">
          {!session ? (
            // 1. Si non connecté
            <Login />
          ) : !activeCampaign ? (
            // 2. Si connecté mais aucune campagne choisie
            <Lobby 
              onSelectCampaign={setActiveCampaign} 
              onCreateCampaign={() => console.log("Afficher la création de campagne")} 
            />
          ) : (
            // 3. Si connecté ET campagne choisie
            <Wiki />
          )}
        </main>
      </div>

      {/* FOOTER (Prend 100% de la largeur de l'écran en bas) */}
      <div className="relative z-10 w-full shrink-0">
        <Footer />
      </div>
    </div>
  );
}

export default App;

import { useEffect, useState } from "react";
import { useAuthStore } from "@/stores/useAuthStore";
import { Login } from "@/components/auth/Login";
import { SideNav } from "@/components/layout/SideNav";
import { Footer } from "@/components/layout/Footer";
import { Lobby } from "./pages/Lobby";
import type { Campaign } from "@/hooks/useCampaigns";
import { Grimoire } from "@/pages/Grimoire";
import { Compendium } from "@/pages/Compendium";
import { CampaignHome } from "@/pages/Campaign";
import { Personnages } from "@/pages/Personnages";
import { Routes, Route, useNavigate, useLocation, Navigate } from "react-router-dom";
import { CreateCampaign } from "@/components/compendium/CreateCampaign";

function App() {
  const { session, isLoading, initializeAuth } = useAuthStore();
  const [activeCampaign, setActiveCampaign] = useState<Campaign | null>(null);
  const [showCreateCampaign, setShowCreateCampaign] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const unsubscribe = initializeAuth();
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [initializeAuth]);

  // Redirect to login if not authenticated
  if (isLoading) return <div className="min-h-screen bg-slate-950" />;

  // Determine active tab from route
  // Détermine les onglets visibles selon la route
  const isCampaignRoute = location.pathname.startsWith("/campaign");
  const getActiveTab = () => {
    if (isCampaignRoute && location.pathname.includes("grimoire")) return "grimoire";
    if (isCampaignRoute && location.pathname.includes("compendium")) return "compendium";
    if (isCampaignRoute && location.pathname.includes("scenarios")) return "scenarios";
    if (isCampaignRoute && location.pathname.includes("personnages")) return "personnages";
    if (!isCampaignRoute && location.pathname === "/grimoire") return "grimoire";
    if (!isCampaignRoute && location.pathname === "/compendium") return "compendium";
    return "none";
  };

  // Onglets visibles selon le contexte
  const getTabs = () => {
    if (isCampaignRoute) return ["grimoire", "compendium", "scenarios", "personnages"];
    return ["grimoire", "compendium"];
  };

  // Navigation handler pour SideNav (global ou campagne)
  const handleTabChange = (tab: string) => {
    if (isCampaignRoute) {
      if (tab === "grimoire") navigate("/campaign/grimoire");
      else if (tab === "compendium") navigate("/campaign/compendium");
      else if (tab === "scenarios") navigate("/campaign/scenarios");
      else if (tab === "personnages") navigate("/campaign/personnages");
      else navigate("/campaign");
    } else {
      if (tab === "grimoire") navigate("/grimoire");
      else if (tab === "compendium") navigate("/compendium");
      else navigate("/");
    }
  };

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
        {/* Affiche la SideNav sur / (lobby), /grimoire, /compendium, /campaign et ses sous-routes */}
        {(location.pathname === "/" || location.pathname === "/grimoire" || location.pathname === "/compendium" || isCampaignRoute) && (
          <SideNav
            activeTab={getActiveTab()}
            onTabChange={handleTabChange}
            tabs={getTabs()}
          />
        )}

        <main className="flex-1 overflow-hidden flex flex-col">
          {!session ? (
            <Login />
          ) : (
            <Routes>
              <Route
                path="/"
                element={
                  !activeCampaign ? (
                    <>
                      <CreateCampaign
                        open={showCreateCampaign}
                        onOpenChange={setShowCreateCampaign}
                        onCreated={(campaign: Campaign) => {
                          setShowCreateCampaign(false);
                          setActiveCampaign(campaign);
                        }}
                      />
                      <Lobby
                        onSelectCampaign={(campaign: Campaign) => {
                          setActiveCampaign(campaign);
                          navigate("/campaign");
                        }}
                        onCreateCampaign={() => setShowCreateCampaign(true)}
                      />
                    </>
                  ) : (
                    <Navigate to="/campaign" />
                  )
                }
              />
              <Route
                path="/campaign"
                element={
                  activeCampaign ? (
                    <CampaignHome campaign={activeCampaign} />
                  ) : (
                    <Navigate to="/" />
                  )
                }
              />
              <Route
                path="/grimoire"
                element={
                  <Grimoire
                    isGlobal={true}
                    onBack={() => navigate("/")}
                  />
                }
              />
              <Route
                path="/compendium"
                element={
                  <Compendium
                    onBack={() => navigate("/")}
                  />
                }
              />
              <Route
                path="/campaign/grimoire"
                element={
                  <Grimoire
                    isGlobal={false}
                    campaignId={activeCampaign?.id}
                    onBack={() => navigate("/campaign")}
                  />
                }
              />
              <Route
                path="/campaign/compendium"
                element={
                  <Compendium
                    campaignId={activeCampaign?.id}
                    onBack={() => navigate("/campaign")}
                  />
                }
              />
              {/* Placeholders pour scenarios/personnages */}
              <Route
                path="/campaign/scenarios"
                element={<div className="flex-1 flex flex-col items-center justify-center text-center p-10 text-white/60">Scénarios (à implémenter)</div>}
              />
              <Route
                path="/campaign/personnages"
                element={
                  activeCampaign ? (
                    <Personnages
                      campaignId={activeCampaign.id}
                      onBack={() => navigate("/campaign")}
                    />
                  ) : (
                    <Navigate to="/" />
                  )
                }
              />
              {/* Redirect unknown routes to / */}
              <Route path="*" element={<Navigate to="/" />} />
            </Routes>
          )}
        </main>
      </div>

      {/* FOOTER (Prend 100% de la largeur de l'écran en bas) */}
      <div className="relative z-20 w-full shrink-0">
        <Footer
          activeCampaign={activeCampaign}
          onCampaignClick={() => {
            setActiveCampaign(null);
            navigate("/");
          }}
        />
      </div>
    </div>
  );
}

export default App;
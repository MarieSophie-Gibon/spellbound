/* eslint-disable @typescript-eslint/no-unused-vars */
import { useEffect, useRef, useState } from "react";
import { useAuthStore } from "@/stores/useAuthStore";
import { Login } from "@/components/auth/Login";
import { SideNav } from "@/components/layout/SideNav";
import { SideNavMobile } from "@/components/layout/SideNavMobile";
import { Footer } from "@/components/layout/Footer";
import { CampaignProgressBar } from "@/components/campaign/CampaignProgressBar";
import { Lobby } from "./pages/Lobby";
import type { Campaign } from "@/hooks/campaign/useCampaigns";
import { useDeleteCampaign } from "@/hooks/campaign/useCampaigns";
import { Grimoire } from "@/pages/Grimoire";
import { Compendium } from "@/pages/Compendium";
import { CampaignHome } from "@/pages/Campaign";
import { Personnages } from "@/pages/Personnages";
import { Combat } from "@/pages/Combat";
import { PlayerCombat } from "@/pages/PlayerCombat";
import { Scenarios } from "@/pages/Scenarios";
import { PlayerView } from "@/pages/PlayerView";
import { Routes, Route, useNavigate, useLocation, Navigate } from "react-router-dom";
import { CreateCampaign } from "@/components/lobby/CreateCampaign";
import { DeleteConfirmModal } from "@/components/compendium/cof/DeleteConfirmModal";
import { Bell, X } from "lucide-react";
import { LoadingScreen } from "@/components/ui/LoadingScreen";
import { useProfile } from "@/hooks/core/personnage/useProfile";
import { useIsMobile } from "@/hooks/shared/useIsMobile";
import { supabase } from "@/lib/supabase";

interface CampaignNotif { id: string; pseudo: string; }
interface CampaignActivity { id: string; pseudo: string; at: string; }

function normalizeRole(value: unknown): "mj" | "player" {
  const raw = String(value ?? "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

  const compact = raw.replace(/[\s_-]+/g, "");
  if (
    raw === "mj" ||
    raw === "gm" ||
    raw === "dm" ||
    raw === "admin" ||
    compact === "maitredujeu" ||
    compact === "master"
  ) {
    return "mj";
  }
  return "player";
}

function App() {
  const isMobile = useIsMobile();
  const location = useLocation();
  const isBattlemapRoute = location.pathname === "/battlemap";
  const isLobbyRoute = location.pathname === "/";

  const { session, isLoading, isPasswordRecovery, initializeAuth } = useAuthStore();
  const role = useAuthStore((s) => s.role);
  const profile = useProfile();
  const isGlobalEditor = role === "mj" || normalizeRole(profile?.role) === "mj";
const [activeCampaign, setActiveCampaign] = useState<Campaign | null>(() => {
    const saved = localStorage.getItem("spellbound_active_campaign");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        return null;
      }
    }
    return null;
  });
  useEffect(() => {
    if (activeCampaign) {
      localStorage.setItem("spellbound_active_campaign", JSON.stringify(activeCampaign));
    } else {
      localStorage.removeItem("spellbound_active_campaign");
    }
  }, [activeCampaign]);
  
  const [showCreateCampaign, setShowCreateCampaign] = useState(false);

  // ── Notifications de connexion à la campagne ─────────────────────────────
  const [campaignNotifs, setCampaignNotifs] = useState<CampaignNotif[]>([]);
  const [activityLog, setActivityLog] = useState<CampaignActivity[]>([]);
  const presenceChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  useEffect(() => {
    const campaignId = activeCampaign?.id;
    const userId = session?.user?.id;
    if (!campaignId || !userId) {
      presenceChannelRef.current?.unsubscribe();
      presenceChannelRef.current = null;
      setActivityLog([]);
      return;
    }

    const isOwner =
      activeCampaign.owner_id === userId ||
      activeCampaign.access_type === "owner";
    const myPseudo =
      profile?.pseudo ??
      session.user.user_metadata?.pseudo ??
      session.user.email?.split("@")[0] ??
      "Voyageur";

    // Unsubscribe from previous campaign channel
    presenceChannelRef.current?.unsubscribe();

    const channel = supabase.channel(`campaign-presence:${campaignId}`, {
      config: { presence: { key: userId } },
    });

    if (isOwner) {
      channel.on("presence", { event: "join" }, ({ key, newPresences }) => {
        if (key === userId) return; // ignore own join
        const p = (newPresences as Array<{ pseudo?: string }>)[0];
        const pseudo = p?.pseudo ?? "Un joueur";
        const notifId = `${key}-${Date.now()}`;
        const at = new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
        setCampaignNotifs((prev) => [...prev, { id: notifId, pseudo }]);
        setActivityLog((prev) => [...prev, { id: notifId, pseudo, at }]);
        setTimeout(() => {
          setCampaignNotifs((prev) => prev.filter((n) => n.id !== notifId));
        }, 6000);
      });
    }

    channel.subscribe(async (status) => {
      if (status === "SUBSCRIBED") {
        await channel.track({ userId, pseudo: myPseudo });
      }
    });

    presenceChannelRef.current = channel;
    return () => {
      channel.unsubscribe();
      presenceChannelRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeCampaign?.id, session?.user?.id]);
  const [editingCampaign, setEditingCampaign] = useState<Campaign | null>(null);
  const [showDeleteCampaignConfirm, setShowDeleteCampaignConfirm] = useState(false);
  const deleteCampaign = useDeleteCampaign();
  const navigate = useNavigate();

  useEffect(() => {
    const unsubscribe = initializeAuth();
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [initializeAuth]);

  // Route joueur — page autonome sans layout
  if (isBattlemapRoute) return <PlayerView />;

  // Redirect to login if not authenticated
  if (isLoading) return <LoadingScreen />;

  // Determine active tab from route
  // Détermine les onglets visibles selon la route
  const isCampaignRoute = location.pathname.startsWith("/campaign");
  const isCampaignDashboardRoute = /^\/campaign\/?$/.test(location.pathname);
  const isCombatRoute = location.pathname.startsWith("/campaign/combat") || location.pathname.startsWith("/campaign/player-combat");
  const canManageActiveCampaign =
    !!activeCampaign &&
    (
      activeCampaign.owner_id === session?.user?.id ||
      activeCampaign.access_type === "owner"
    );
  const getActiveTab = () => {
    if (isCampaignRoute && location.pathname.includes("grimoire")) return "grimoire";
    if (isCampaignRoute && location.pathname.includes("bestiaire")) return "bestiaire";
    if (isCampaignRoute && location.pathname.includes("compendium")) return "compendium";
    if (isCampaignRoute && location.pathname.includes("scenarios")) return "scenarios";
    if (isCampaignRoute && location.pathname.includes("personnages")) return "personnages";
    if (!isCampaignRoute && location.pathname === "/grimoire") return "grimoire";
    if (!isCampaignRoute && location.pathname === "/bestiaire") return "bestiaire";
    if (!isCampaignRoute && location.pathname === "/compendium") return "compendium";
    return "none";
  };

  // Onglets visibles selon le contexte et le rôle
  const getTabs = () => {
    if (isCampaignRoute) {
      const campaignTabs = ["grimoire", "compendium", "bestiaire", "personnages"];
      if (!isMobile && canManageActiveCampaign) campaignTabs.splice(3, 0, "scenarios"); // Owner seulement (desktop)
      return campaignTabs;
    }
    if (isLobbyRoute) return ["grimoire", "compendium"];
    return ["grimoire", "compendium"];
  };

  // Navigation handler pour SideNav (global ou campagne)
  const handleTabChange = (tab: string) => {
    if (isCampaignRoute) {
      if (tab === "none") navigate("/campaign");
      else if (tab === "grimoire") navigate("/campaign/grimoire");
      else if (tab === "compendium") navigate("/campaign/compendium");
      else if (tab === "bestiaire") navigate("/campaign/bestiaire");
      else if (tab === "scenarios") navigate("/campaign/scenarios");
      else if (tab === "personnages") navigate("/campaign/personnages");
      else if (tab !== "none") navigate("/campaign");
    } else {
      if (tab === "grimoire") navigate("/grimoire");
      else if (tab === "compendium") navigate("/compendium");
      else if (tab === "bestiaire") navigate("/bestiaire");
      else navigate("/");
    }
  };

  const shouldShowNav = location.pathname === "/" || location.pathname === "/grimoire" || location.pathname === "/compendium" || location.pathname === "/bestiaire" || isCampaignRoute;

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
          className="absolute inset-0 overlay-bg pointer-events-none opacity-80 bg-no-repeat"
          style={{ backgroundImage: "url('/overlay.svg')" }}
        />
      </div>

      {/* ZONE CENTRALE */}
      <div className="relative z-10 flex flex-1 overflow-hidden">
        {/* Affiche la SideNav sur / (lobby), /grimoire, /compendium, /campaign et ses sous-routes */}
        {!isMobile && shouldShowNav && (
          <SideNav
            activeTab={getActiveTab()}
            onTabChange={handleTabChange}
            tabs={getTabs()}
            forceCollapsed={isCombatRoute}
          />
        )}

        <main className={`flex-1 overflow-hidden flex flex-col ${isMobile && shouldShowNav && !isLobbyRoute ? "pb-19" : ""}`}>
          {(!session || isPasswordRecovery) ? (
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
                    <CampaignHome
                      campaign={activeCampaign}
                      activityLog={activityLog}
                      onClearActivity={(id) => {
                        if (id) setActivityLog(prev => prev.filter(n => n.id !== id));
                        else setActivityLog([]);
                      }}
                    />
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
                    readOnly={isMobile || !isGlobalEditor}
                    onBack={() => navigate("/")}
                  />
                }
              />
              <Route
                path="/compendium"
                element={
                  <Compendium
                    key="global-compendium"
                    readOnly={isMobile || !isGlobalEditor}
                    onBack={() => navigate("/")}
                  />
                }
              />
              <Route
                path="/bestiaire"
                element={
                  <Compendium
                    key="global-bestiaire"
                    readOnly={isMobile || !isGlobalEditor}
                    mode="bestiaire"
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
                    campaignSystem={activeCampaign?.system ?? 'COF'}
                    readOnly={isMobile || !canManageActiveCampaign}
                    onBack={() => navigate("/campaign")}
                  />
                }
              />
              <Route
                path="/campaign/compendium"
                element={
                  <Compendium
                    key={`campaign-compendium-${activeCampaign?.id ?? "none"}`}
                    campaignId={activeCampaign?.id}
                    campaignSystem={activeCampaign?.system ?? 'COF'}
                    readOnly={isMobile || !canManageActiveCampaign}
                    isOwner={canManageActiveCampaign}
                    onBack={() => navigate("/campaign")}
                  />
                }
              />
              <Route
                path="/campaign/bestiaire"
                element={
                  <Compendium
                    key={`campaign-bestiaire-${activeCampaign?.id ?? "none"}`}
                    campaignId={activeCampaign?.id}
                    campaignSystem={activeCampaign?.system ?? 'COF'}
                    readOnly={isMobile || !canManageActiveCampaign}
                    isOwner={canManageActiveCampaign}
                    mode="bestiaire"
                    onBack={() => navigate("/campaign")}
                  />
                }
              />
              
              {/* SCÉNARIOS — MJ uniquement */}
              <Route
                path="/campaign/scenarios"
                element={
                  !activeCampaign ? <Navigate to="/" /> :
                  isMobile ? <Navigate to="/campaign" /> :
                  !canManageActiveCampaign ? <Navigate to="/campaign" /> : (
                    <Scenarios
                      campaignId={activeCampaign.id}
                      campaignSystem={activeCampaign.system ?? 'COF'}
                      onBack={() => navigate("/campaign")}
                    />
                  )
                }
              />

              <Route
                path="/campaign/personnages"
                element={
                  activeCampaign ? (
                    <Personnages
                      campaignId={activeCampaign.id}
                      isMJ={canManageActiveCampaign}
                      campaignSystem={activeCampaign.system ?? 'COF'}
                      onBack={() => navigate("/campaign")}
                    />
                  ) : (
                    <Navigate to="/" />
                  )
                }
              />
              {/* COMBAT — Owner uniquement (second écran) */}
              <Route
                path="/campaign/combat"
                element={
                  !activeCampaign ? <Navigate to="/" /> :
                  isMobile ? <Navigate to="/campaign" /> :
                  !canManageActiveCampaign ? <Navigate to="/campaign" /> : (
                    <Combat campaignId={activeCampaign.id} />
                  )
                }
              />

              <Route
                path="/campaign/player-combat"
                element={
                  !activeCampaign ? <Navigate to="/" /> : (
                    <PlayerCombat campaignId={activeCampaign.id} />
                  )
                }
              />
              {/* Redirect unknown routes to / */}
              <Route path="*" element={<Navigate to="/" />} />
            </Routes>
          )}
        </main>
      </div>

      {isMobile && shouldShowNav && !isLobbyRoute && (
        <SideNavMobile
          activeTab={getActiveTab()}
          onTabChange={handleTabChange}
          onBackToLobby={() => {
            setActiveCampaign(null);
            navigate("/");
          }}
          showBackToLobbyButton={isCampaignRoute}
          onGoToCampaignDashboard={() => {
            if (isCampaignRoute) navigate("/campaign");
          }}
          showCampaignDashboardButton={isCampaignRoute}
          showProfileMenuButton={!isCampaignRoute}
          showMenuTitles={!isCampaignRoute}
          tabs={getTabs()}
        />
      )}

      {/* BARRE DE PROGRESSION CAMPAGNE (pleine largeur, au-dessus du footer) */}
      {!isMobile && isCampaignDashboardRoute && activeCampaign && (
        <CampaignProgressBar campaignId={activeCampaign.id} />
      )}

      {/* FOOTER (Prend 100% de la largeur de l'écran en bas) */}
      {!isMobile && (
        <div className="relative z-20 w-full shrink-0">
          <Footer
            activeCampaign={activeCampaign}
            onCampaignClick={() => {
              setActiveCampaign(null);
              navigate("/");
            }}
            onEditCampaign={activeCampaign && canManageActiveCampaign ? () => setEditingCampaign(activeCampaign) : undefined}
            onDeleteCampaign={activeCampaign && canManageActiveCampaign ? () => setShowDeleteCampaignConfirm(true) : undefined}
            onSwitchCampaign={(campaign) => { setActiveCampaign(campaign); navigate("/campaign"); }}
          />
        </div>
      )}

      {editingCampaign && (
        <CreateCampaign
          open={true}
          onOpenChange={(open) => { if (!open) setEditingCampaign(null); }}
          onCreated={(updated) => { setActiveCampaign(updated); setEditingCampaign(null); }}
          initialData={editingCampaign}
        />
      )}

      {showDeleteCampaignConfirm && activeCampaign && (
        <DeleteConfirmModal
          name={activeCampaign.nom}
          isDeleting={deleteCampaign.isPending}
          title="Supprimer cette campagne ?"
          description={`Toutes les données liées à "${activeCampaign.nom}" seront définitivement supprimées : personnages, articles du grimoire, éléments du compendium personnalisés, et tout le contenu associé.`}
          onConfirm={() => {
            deleteCampaign.mutate(activeCampaign.id, {
              onSuccess: () => {
                setShowDeleteCampaignConfirm(false);
                setActiveCampaign(null);
                navigate("/");
              },
            });
          }}
          onCancel={() => setShowDeleteCampaignConfirm(false)}
        />
      )}

      {/* ── Notifications de connexion campagne ───────────────────────── */}
      {campaignNotifs.length > 0 && (
        <div className="fixed bottom-6 right-4 z-9999 flex flex-col gap-2 pointer-events-none">
          {campaignNotifs.map((notif) => (
            <div
              key={notif.id}
              className="pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-xl border border-[#E3CCCD]/20 bg-[#1E1941]/95 backdrop-blur-xl shadow-2xl animate-in slide-in-from-right-4 fade-in duration-300 max-w-xs"
            >
              <div className="shrink-0 w-8 h-8 rounded-full bg-[#E3CCCD]/10 border border-[#E3CCCD]/20 flex items-center justify-center">
                <Bell className="w-3.5 h-3.5 text-[#E3CCCD]/70" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[12px] font-semibold text-[#E3CCCD] truncate">{notif.pseudo}</p>
                <p className="text-[11px] text-white/45 leading-tight">vient d&apos;accéder à votre campagne</p>
              </div>
              <button
                onClick={() => setCampaignNotifs((prev) => prev.filter((n) => n.id !== notif.id))}
                className="shrink-0 p-1 rounded-full text-white/30 hover:text-white/70 hover:bg-white/10 transition-colors"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default App;
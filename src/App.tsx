import { useEffect, useState } from "react";
import { useAuthStore } from "@/stores/useAuthStore";
import { Login } from "@/components/auth/Login";
import { SideNav } from "@/components/layout/SideNav";
import { Footer } from "@/components/layout/Footer";
import { Lobby } from "./pages/Lobby";
import type { Campaign } from "@/hooks/useCampaigns";
import { useDeleteCampaign, useDuplicateCampaign } from "@/hooks/useCampaigns";
import { Grimoire } from "@/pages/Grimoire";
import { Compendium } from "@/pages/Compendium";
import { CampaignHome } from "@/pages/Campaign";
import { Personnages } from "@/pages/Personnages";
import { Combat } from "@/pages/Combat";
import { Scenarios } from "@/pages/Scenarios";
import { PlayerView } from "@/pages/PlayerView";
import { Routes, Route, useNavigate, useLocation, Navigate } from "react-router-dom";
import { CreateCampaign } from "@/components/lobby/CreateCampaign";
import { DeleteConfirmModal } from "@/components/compendium/DeleteConfirmModal";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Copy, Loader2 } from "lucide-react";
import { useProfile } from "@/hooks/useProfile";

function App() {
  const location = useLocation();
  const isBattlemapRoute = location.pathname === "/battlemap";

  const { session, isLoading, initializeAuth } = useAuthStore();
  const role = useAuthStore((s) => s.role);
  const profile = useProfile();
  const isGlobalEditor = role === 'mj' || profile?.role === 'mj';
  const [activeCampaign, setActiveCampaign] = useState<Campaign | null>(null);
  const [showCreateCampaign, setShowCreateCampaign] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState<Campaign | null>(null);
  const [showDeleteCampaignConfirm, setShowDeleteCampaignConfirm] = useState(false);
  const deleteCampaign = useDeleteCampaign();
  const duplicateCampaign = useDuplicateCampaign();
  const [showDuplicateCampaignModal, setShowDuplicateCampaignModal] = useState(false);
  const [duplicateName, setDuplicateName] = useState("");
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
  if (isLoading) return <div className="min-h-screen bg-slate-950" />;

  // Determine active tab from route
  // Détermine les onglets visibles selon la route
  const isCampaignRoute = location.pathname.startsWith("/campaign");
  const isCombatRoute = location.pathname.startsWith("/campaign/combat");
  const canManageActiveCampaign = !!activeCampaign && activeCampaign.owner_id === session?.user?.id;
  const getActiveTab = () => {
    if (isCampaignRoute && location.pathname.includes("grimoire")) return "grimoire";
    if (isCampaignRoute && location.pathname.includes("compendium")) return "compendium";
    if (isCampaignRoute && location.pathname.includes("scenarios")) return "scenarios";
    if (isCampaignRoute && location.pathname.includes("personnages")) return "personnages";
    if (!isCampaignRoute && location.pathname === "/grimoire") return "grimoire";
    if (!isCampaignRoute && location.pathname === "/compendium") return "compendium";
    return "none";
  };

  // Onglets visibles selon le contexte et le rôle
  const getTabs = () => {
    if (isCampaignRoute) {
      const campaignTabs = ["grimoire", "compendium", "personnages"];
      if (canManageActiveCampaign) campaignTabs.splice(2, 0, "scenarios"); // Owner seulement
      return campaignTabs;
    }
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
            forceCollapsed={isCombatRoute}
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
                    readOnly={!isGlobalEditor}
                    onBack={() => navigate("/")}
                  />
                }
              />
              <Route
                path="/compendium"
                element={
                  <Compendium
                    readOnly={!isGlobalEditor}
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
                    readOnly={!canManageActiveCampaign}
                    onBack={() => navigate("/campaign")}
                  />
                }
              />
              <Route
                path="/campaign/compendium"
                element={
                  <Compendium
                    campaignId={activeCampaign?.id}
                    readOnly={!canManageActiveCampaign}
                    onBack={() => navigate("/campaign")}
                  />
                }
              />
              
              {/* SCÉNARIOS — MJ uniquement */}
              <Route
                path="/campaign/scenarios"
                element={
                  !activeCampaign ? <Navigate to="/" /> :
                  !canManageActiveCampaign ? <Navigate to="/campaign" /> : (
                    <Scenarios
                      campaignId={activeCampaign.id}
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
                      readOnly={!canManageActiveCampaign}
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
                  !canManageActiveCampaign ? <Navigate to="/campaign" /> : (
                    <Combat campaignId={activeCampaign.id} />
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
          onEditCampaign={activeCampaign && canManageActiveCampaign ? () => setEditingCampaign(activeCampaign) : undefined}
          onDeleteCampaign={activeCampaign && canManageActiveCampaign ? () => setShowDeleteCampaignConfirm(true) : undefined}
          onDuplicateCampaign={activeCampaign && canManageActiveCampaign ? () => { setDuplicateName(`Copie de ${activeCampaign.nom}`); setShowDuplicateCampaignModal(true); } : undefined}
          onSwitchCampaign={(campaign) => { setActiveCampaign(campaign); navigate("/campaign"); }}
        />
      </div>

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

      <Dialog open={showDuplicateCampaignModal} onOpenChange={(open) => { if (!open) setShowDuplicateCampaignModal(false); }}>
        <DialogContent className="bg-[#1E1941] border-white/10 text-white max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-serif text-lg flex items-center gap-2">
              <Copy className="w-4 h-4 text-sky-300" />
              Dupliquer la campagne
            </DialogTitle>
          </DialogHeader>
          <div className="py-2">
            <label className="text-xs text-white/60 mb-1.5 block">Nom de la nouvelle campagne</label>
            <Input
              value={duplicateName}
              onChange={(e) => setDuplicateName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && duplicateName.trim() && activeCampaign) {
                  duplicateCampaign.mutate(
                    { sourceId: activeCampaign.id, newNom: duplicateName.trim() },
                    { onSuccess: () => setShowDuplicateCampaignModal(false) }
                  );
                }
              }}
              className="bg-white/5 border-white/10 text-white placeholder:text-white/30"
              placeholder="Nom de la copie..."
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowDuplicateCampaignModal(false)} className="text-white/60 hover:text-white">
              Annuler
            </Button>
            <Button
              disabled={!duplicateName.trim() || duplicateCampaign.isPending}
              onClick={() => {
                if (!activeCampaign) return;
                duplicateCampaign.mutate(
                  { sourceId: activeCampaign.id, newNom: duplicateName.trim() },
                  { onSuccess: () => setShowDuplicateCampaignModal(false) }
                );
              }}
              className="bg-sky-600 hover:bg-sky-500 text-white"
            >
              {duplicateCampaign.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Dupliquer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default App;
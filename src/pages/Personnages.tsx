/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect, useCallback } from "react";
import { BookLayout } from "@/components/layout/BookLayout";
import { supabase } from "@/lib/supabase";
import { PJWizard } from "@/components/personnage/PJWizard";
import { DeleteConfirmModal } from "@/components/compendium/DeleteConfirmModal";
import { PersonnageSidebar } from "@/components/personnage/PersonnageSidebar";
import { PersonnageDetail } from "@/components/personnage/PersonnageDetail";

interface PersonnagesProps {
  campaignId: string;
  onBack: () => void;
}

interface PJ {
  id: string;
  name: string;
  image_url: string | null;
  stats: any;
  pathways: any;
  inventory: any;
}

export function Personnages({ campaignId, onBack }: PersonnagesProps) {
  const [pjs, setPjs] = useState<PJ[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showWizard, setShowWizard] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchPjs = useCallback(async () => {
    setIsLoading(true);
    const { data } = await supabase
      .from("pj")
      .select("id, name, image_url, stats, pathways, inventory")
      .eq("campaign_id", campaignId)
      .order("name");
    if (data) setPjs(data);
    setIsLoading(false);
  }, [campaignId]);

  useEffect(() => { fetchPjs(); }, [fetchPjs]);

  const selectedPJ = pjs.find(p => p.id === selectedId) ?? null;

  const handleDelete = async () => {
    if (!selectedId) return;
    setIsDeleting(true);
    await supabase.from("pj").delete().eq("id", selectedId);
    setSelectedId(null);
    setShowDeleteConfirm(false);
    setIsDeleting(false);
    fetchPjs();
  };

  return (
    <>
      <BookLayout
        spineTitle="Personnages"
        sidebar={
          <PersonnageSidebar
            pjs={pjs}
            isLoading={isLoading}
            selectedId={selectedId}
            onSelect={setSelectedId}
            onCreateClick={() => setShowWizard(true)}
            onBack={onBack}
          />
        }
      >
        <PersonnageDetail
          pj={selectedPJ}
          onDeleteClick={() => setShowDeleteConfirm(true)}
          onCreateClick={() => setShowWizard(true)}
        />
      </BookLayout>

      {showWizard && (
        <PJWizard
          campaignId={campaignId}
          onClose={() => setShowWizard(false)}
          onSuccess={() => { fetchPjs(); setShowWizard(false); }}
        />
      )}

      {showDeleteConfirm && selectedPJ && (
        <DeleteConfirmModal
          name={selectedPJ.name}
          isDeleting={isDeleting}
          onConfirm={handleDelete}
          onCancel={() => setShowDeleteConfirm(false)}
        />
      )}
    </>
  );
}

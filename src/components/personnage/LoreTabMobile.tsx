/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from "react";
import { X, Save } from "lucide-react";
import { supabase } from "@/lib/supabase";

interface LoreTabMobileProps {
  pjId: string;
  type: "pj" | "pnj";
  stats: any;
  readOnly?: boolean;
  onSaved: () => void;
}

type FieldType = "sexe" | "text" | "textarea";

interface Field {
  key: string;
  label: string;
  type: FieldType;
  rows?: number;
  placeholder?: string;
  accent?: string;
}

const FIELDS: Field[] = [
  { key: "sexe",       label: "Sexe",           type: "sexe" as FieldType,     accent: "text-white/60" },
  { key: "age",        label: "Âge",            type: "text",    placeholder: "ex: 24 ans" },
  { key: "ideal",      label: "Idéal Héroïque", type: "textarea", rows: 3, accent: "text-[#E3CCCD]/70" },
  { key: "travers",    label: "Travers",         type: "textarea", rows: 3, accent: "text-red-300/60" },
  { key: "historique", label: "Historique",      type: "textarea", rows: 6 },
];

export default function LoreTabMobile({ pjId, type, stats, readOnly = false, onSaved }: LoreTabMobileProps) {
  const [editingField, setEditingField] = useState<Field | null>(null);
  const [editValue, setEditValue] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const openEdit = (field: Field) => {
    setEditingField(field);
    setEditValue(stats?.[field.key] ?? "");
  };

  const handleSave = async () => {
    if (!editingField) return;
    setIsSaving(true);
    try {
      const table = type === "pnj" ? "pnj" : "pj";
      await supabase
        .from(table)
        .update({ stats: { ...(stats ?? {}), [editingField.key]: editValue } })
        .eq("id", pjId);
      setEditingField(null);
      onSaved();
    } catch (e: any) {
      alert(e.message);
    } finally {
      setIsSaving(false);
    }
  };

  const isEmpty = FIELDS.every((f) => !stats?.[f.key]);

  return (
    <div className="space-y-2 animate-in fade-in duration-200">
      {isEmpty && !readOnly && (
        <p className="text-white/25 italic text-xs text-center py-6">
          Aucun lore renseigné — appuyez sur un champ pour commencer.
        </p>
      )}

      {FIELDS.map((field) => {
        const value = stats?.[field.key];
        const accent = field.accent ?? "text-white/40";

        return (
          <button
            key={field.key}
            type="button"
            onClick={!readOnly ? () => openEdit(field) : undefined}
            disabled={readOnly}
            className={`w-full text-left rounded-xl border border-white/10 bg-white/5 px-3.5 py-3 transition-all ${!readOnly ? "cursor-pointer active:bg-white/14 hover:bg-white/8 hover:border-white/18" : "cursor-default"}`}
          >
            <p className={`text-[9px] uppercase tracking-widest mb-1 ${accent}`}>
              {field.label}
            </p>
            {value ? (
              <p className="text-xs text-white/80 leading-relaxed line-clamp-3">
                {value}
              </p>
            ) : (
              <p className="text-[11px] text-white/22 italic">Non renseigné</p>
            )}
          </button>
        );
      })}

      {/* ── BOTTOM SHEET D'ÉDITION ── */}
      {editingField && !readOnly && (
        <div
          className="fixed inset-0 z-9999 bg-black/60 backdrop-blur-sm flex items-end justify-center p-4 pb-8"
          onClick={() => !isSaving && setEditingField(null)}
        >
          <div
            className="w-full max-w-sm rounded-2xl border border-[#E3CCCD]/20 shadow-[0_20px_60px_rgba(0,0,0,0.5)] overflow-hidden"
            style={{ background: "linear-gradient(160deg,rgba(30,25,65,0.97) 0%,rgba(36,27,89,0.97) 100%)" }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 pt-4 pb-3 border-b border-white/8">
              <span className="font-serif text-sm font-semibold text-white">
                {editingField.label}
              </span>
              <button
                onClick={() => setEditingField(null)}
                className="p-1 text-white/40 hover:text-white rounded-full"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Body */}
            <div className="p-4">
              {editingField.key === "sexe" ? (
                <div className="flex gap-2 flex-wrap">
                  {["Masculin", "Féminin", "Autre"].map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setEditValue(s)}
                      className={`px-4 py-2 rounded-full text-xs font-semibold border transition-all ${
                        editValue === s
                          ? "border-[#E3CCCD]/60 bg-[#E3CCCD]/15 text-[#E3CCCD]"
                          : "border-white/15 text-white/50 hover:border-white/30"
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              ) : editingField.type === "text" ? (
                <input
                  type="text"
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  placeholder={editingField.placeholder}
                  autoFocus
                  className="w-full bg-white/8 border border-white/20 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-[#E3CCCD]/50 placeholder:text-white/25"
                />
              ) : (
                <textarea
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  rows={editingField.rows ?? 4}
                  autoFocus
                  className="w-full bg-white/8 border border-white/20 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-[#E3CCCD]/50 resize-none leading-relaxed"
                />
              )}
            </div>

            {/* Footer */}
            <div className="flex gap-2 px-4 pb-4">
              <button
                type="button"
                onClick={() => setEditingField(null)}
                className="px-4 py-2.5 rounded-xl border border-white/20 text-white/60 text-[12px] font-semibold hover:bg-white/8 transition-colors"
              >
                Annuler
              </button>
              <button
                type="button"
                disabled={isSaving}
                onClick={handleSave}
                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl border border-[#E3CCCD]/30 bg-[#E3CCCD]/12 text-[#E3CCCD] text-[12px] font-semibold hover:bg-[#E3CCCD]/20 transition-colors disabled:opacity-60"
              >
                <Save className="w-3.5 h-3.5" />
                {isSaving ? "Sauvegarde..." : "Sauvegarder"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

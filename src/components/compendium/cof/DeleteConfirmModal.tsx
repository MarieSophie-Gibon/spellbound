import { createPortal } from "react-dom";
import { AlertTriangle } from "lucide-react";

interface DeleteConfirmModalProps {
  name: string;
  isDeleting: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  title?: string;
  description?: string;
}

export function DeleteConfirmModal({ name, isDeleting, onConfirm, onCancel, title, description }: DeleteConfirmModalProps) {
  return createPortal(
    <div className="fixed inset-0 z-9999 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#1E1941]/95 border border-[#ff6b6b]/30 rounded-2xl shadow-2xl p-8 max-w-sm w-full flex flex-col items-center gap-5 animate-in zoom-in-95 duration-200">
        <div className="w-12 h-12 rounded-full bg-[#ff6b6b]/10 border border-[#ff6b6b]/30 flex items-center justify-center">
          <AlertTriangle className="w-5 h-5 text-[#ff6b6b]" />
        </div>
        <div className="text-center">
          <h3 className="font-serif text-lg text-white mb-2">{title ?? "Supprimer ce peuple ?"}</h3>
          <p className="text-[13px] text-white/50 leading-relaxed">
            {description ?? (
              <><span className="text-white/80 font-medium">{name}</span> et sa voie raciale associée seront définitivement supprimés.</>
            )}
          </p>
        </div>
        <div className="flex gap-3 w-full">
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-2.5 rounded-xl border border-white/15 text-white/60 hover:text-white hover:border-white/30 text-[13px] transition-colors"
          >
            Annuler
          </button>
          <button
            onClick={onConfirm}
            disabled={isDeleting}
            className="flex-1 px-4 py-2.5 rounded-xl bg-[#ff6b6b]/15 border border-[#ff6b6b]/40 hover:bg-[#ff6b6b]/25 text-[#ff6b6b] text-[13px] transition-colors disabled:opacity-50"
          >
            {isDeleting ? "Suppression..." : "Supprimer"}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

interface CombatTriggerNotificationProps {
  message: string | null;
  onClose: () => void;
}

export function CombatTriggerNotification({ message, onClose }: CombatTriggerNotificationProps) {
  if (!message) return null;

  return (
    <div className="absolute inset-0 z-70 flex items-start justify-center pt-20 pointer-events-none">
      <div className="pointer-events-auto w-105 max-w-[92vw] rounded-xl border border-amber-300/35 bg-[#261C12]/90 p-4 shadow-2xl">
        <p className="mb-2 text-[10px] uppercase tracking-[0.2em] text-amber-200/75">Déclenchement d'évènement</p>
        <pre className="whitespace-pre-wrap font-sans text-sm text-amber-100">{message}</pre>
        <div className="mt-3 flex justify-end">
          <button
            onClick={onClose}
            className="rounded-lg border border-amber-100/30 bg-amber-200/15 px-3 py-1.5 text-xs text-amber-100 transition-colors hover:bg-amber-200/25"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
}

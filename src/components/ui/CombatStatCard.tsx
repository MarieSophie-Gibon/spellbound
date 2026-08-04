interface CombatStatCardProps {
  icon: React.ElementType;
  label: string;
  value: string;
  color: string;
  border: string;
  onClick?: () => void;
  title?: string;
}

export function CombatStatCard({ icon: Icon, label, value, color, border, onClick, title }: CombatStatCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={`flex flex-col items-center gap-1.5 p-3 rounded-xl bg-white/4 border ${border} w-full text-left ${onClick ? "cursor-text hover:border-[#E3CCCD]/40 transition-colors" : ""}`}
    >
      <Icon className={`w-4 h-4 ${color} shrink-0`} />
      <span className="font-mono text-base font-bold text-white">{value}</span>
      <span className="text-[10px] uppercase tracking-widest text-white/35 text-center leading-tight">{label}</span>
    </button>
  );
}

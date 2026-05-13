interface CombatStatCardProps {
  icon: React.ElementType;
  label: string;
  value: string;
  color: string;
  border: string;
}

export function CombatStatCard({ icon: Icon, label, value, color, border }: CombatStatCardProps) {
  return (
    <div className={`flex flex-col items-center gap-1.5 p-3 rounded-xl bg-white/4 border ${border}`}>
      <Icon className={`w-4 h-4 ${color} shrink-0`} />
      <span className="font-mono text-base font-bold text-white">{value}</span>
      <span className="text-[10px] uppercase tracking-widest text-white/35 text-center leading-tight">{label}</span>
    </div>
  );
}

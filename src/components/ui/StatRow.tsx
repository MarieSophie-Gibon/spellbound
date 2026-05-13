interface StatRowProps {
  icon?: React.ElementType;
  label: string;
  value: string;
}

export function StatRow({ icon: Icon, label, value }: StatRowProps) {
  return (
    <div className="flex items-center gap-2">
      {Icon && <Icon className="w-3.5 h-3.5 text-white/30 shrink-0" />}
      <span className="font-bold text-[13px]">• {label} :</span>
      <span className="font-light text-white/70">{value}</span>
    </div>
  );
}

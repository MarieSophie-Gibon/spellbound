interface EditNumFieldProps {
  label: string;
  value: number;
  onChange: (v: number) => void;
}

export function EditNumField({ label, value, onChange }: EditNumFieldProps) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[10px] uppercase tracking-widest text-white/35">{label}</span>
      <input
        type="number"
        value={value}
        onChange={e => onChange(parseInt(e.target.value) || 0)}
        className="w-full text-center font-mono text-sm text-white bg-white/8 border border-white/15 rounded-lg py-1.5 outline-none focus:border-[#E3CCCD]/50"
      />
    </div>
  );
}

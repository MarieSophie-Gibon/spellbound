import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/ui/select";

interface ThemedSelectProps {
  value: string | null;
  onValueChange: (v: string | null) => void;
  options: string[];
  placeholder?: string;
  allowNull?: boolean;
}

export function ThemedSelect({
  value,
  onValueChange,
  options,
  placeholder = "-- Sélectionner --",
  allowNull = false,
}: ThemedSelectProps) {
  const NULL_VALUE = "__NULL__";
  return (
    <Select
      value={value === null ? NULL_VALUE : value}
      onValueChange={(v) => onValueChange(v === NULL_VALUE ? null : v)}
    >
      <SelectTrigger className="w-full bg-transparent border-b border-white/20 focus:border-[#E3CCCD]/60 py-1.5 text-white text-sm outline-none transition-colors placeholder:text-white/25">
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent className="z-9999 bg-[#2b2b58] text-white border border-white/15 shadow-xl rounded-xl p-1">
        {allowNull && (
          <SelectItem
            value={NULL_VALUE}
            className="text-white/40 hover:bg-white/10! focus:bg-white/20! hover:text-white! focus:text-white! data-[state=checked]:bg-white/10!"
          >
            -
          </SelectItem>
        )}
        {options.map((opt) => (
          <SelectItem
            key={opt}
            value={opt}
            className="hover:bg-white/20! focus:bg-white/20! hover:text-white! focus:text-white! data-[state=checked]:bg-white/10!"
          >
            {opt}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

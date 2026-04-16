import { theme } from "@/lib/theme";

export function SideNav() {
  return (
    <aside
      className="relative z-20 w-24 h-[70vh] self-start flex flex-col items-center rounded-br-[5rem] shadow-[4px_0_24px_rgba(0,0,0,0.5)] shrink-0 overflow-hidden"
      style={theme.gradientNav}
    >
      <div className={theme.strokeRight} />

      {/* Logo */}
      <img
        src="/logo.svg"
        alt="Spellbound Logo"
        className="relative z-5 w-24 h-24 object-contain"
      />

      <div className="flex-1" />
    </aside>
  );
}

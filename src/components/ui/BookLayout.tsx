// src/components/layout/BookLayout.tsx
import type { ReactNode } from "react";
import { theme } from "@/lib/theme";

interface BookLayoutProps {
  spineTitle: string;
  sidebar: ReactNode;
  children: ReactNode;
}

export function BookLayout({ spineTitle, sidebar, children }: BookLayoutProps) {
  return (
    <div className="flex-1 flex items-center justify-center w-full h-full p-8 md:pr-24">
      {/* LE LIVRE */}
      <div className="w-full h-full max-w-350 flex rounded-xl relative overflow-hidden bg-[#1E1941]/80 backdrop-blur-xl shadow-2xl">
        {/* Stroke intérieur global */}
        <div
          className={theme.stroke}
          style={{ borderRadius: "calc(0.75rem - 5px)" }}
        />

        {/* 1. LA TRANCHE (Spine) */}
        <div className="w-16 shrink-0 bg-[#29206A] flex flex-col items-center justify-between py-8 border-r border-[#E3CCCD]/20 relative z-10 shadow-[4px_0_15px_rgba(0,0,0,0.2)]">
          <div className="flex flex-col items-center gap-2 text-white/70">
            <span className="text-[10px] leading-3">
              •<br />•<br />•
            </span>
            <span className="text-sm">✦</span>
          </div>
          <div className="flex-1 flex items-center justify-center">
            <span className="font-serif text-3xl tracking-[0.2em] text-white/90 -rotate-90 whitespace-nowrap uppercase">
              {spineTitle}
            </span>
          </div>
          <div className="flex flex-col items-center gap-2 text-white/70">
            <span className="text-sm">✦</span>
            <span className="text-[10px] leading-3">
              •<br />•<br />•
            </span>
          </div>
        </div>

        {/* 2. LE SOMMAIRE (Navigation interne) */}
        <div className="w-72 shrink-0 flex flex-col border-r border-[#E3CCCD]/20 relative z-10 bg-black/5">
          {sidebar}
        </div>

        {/* 3. LE CONTENU (Zone d'affichage) */}
        <div className="flex-1 flex flex-col relative z-10 bg-linear-to-br from-[#1E1941]/40 to-[#120D2F]/40 overflow-hidden">
          {children}
        </div>
      </div>
    </div>
  );
}

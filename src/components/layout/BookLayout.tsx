import type { ReactNode } from "react";

interface BookLayoutProps {
  spineTitle: string;
  sidebar?: ReactNode;
  children: ReactNode;
}

export function BookLayout({ spineTitle, sidebar, children }: BookLayoutProps) {
  return (
    <div className="flex-1 flex items-center justify-center w-full h-full p-8 md:pr-24">
      <div className="w-full h-full max-w-362.5 flex rounded-[1rem] relative bg-[#1E1941]/40 backdrop-blur-3xl shadow-[0_20px_50px_rgba(0,0,0,0.3)] border border-white/10 overflow-hidden">
        <div
          className="absolute inset-1.5 border border-[#E3CCCD]/15 pointer-events-none z-0"
          style={{ borderRadius: "calc(1rem - 5px)" }}
        />
        <div className="relative z-10 flex w-full h-full">
          <div
            className="w-14 h-full shrink-0 ml-6 flex flex-col items-center justify-between py-12 border-x border-[#E3CCCD]/20 shadow-[10px_0_30px_rgba(0,0,0,0.4)] relative z-20"
            style={{
              background: "linear-gradient(180deg, #4B2757 0%, #372A84 100%)",
            }}
          >
            <div className="flex flex-col items-center gap-3 opacity-40">
              <div className="flex flex-col gap-1 items-center">
                <div className="w-1 h-1 rounded-full bg-white" />
                <div className="w-1 h-1 rounded-full bg-white" />
                <div className="w-1 h-1 rounded-full bg-white" />
              </div>
              <span className="text-xs">✦</span>
            </div>
            <div className="flex-1 flex items-center justify-center">
              <span className="font-serif text-3xl tracking-[0.3em] text-white/90 -rotate-90 whitespace-nowrap uppercase select-none">
                {spineTitle}
              </span>
            </div>
            <div className="flex flex-col items-center gap-3 opacity-40">
              <span className="text-xs">✦</span>
              <div className="flex flex-col gap-1 items-center">
                <div className="w-1 h-1 rounded-full bg-white" />
                <div className="w-1 h-1 rounded-full bg-white" />
                <div className="w-1 h-1 rounded-full bg-white" />
              </div>
            </div>
          </div>

          {/* 2. LE SOMMAIRE */}
          {sidebar && (
            <div className="w-65 shrink-0 flex flex-col border-r border-[#E3CCCD]/20 bg-black/10">
              {sidebar}
            </div>
          )}

          {/* 3. LE CONTENU */}
          <div className="flex-1 flex flex-col bg-linear-to-br from-white/3 to-transparent overflow-hidden">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}

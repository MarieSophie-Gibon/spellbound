import { useState, type ReactNode } from "react";
import { Menu, X } from "lucide-react";

interface BookLayoutProps {
  spineTitle: string;
  sidebar?: ReactNode;
  hideSidebar?: boolean;
  children: ReactNode;
}

export function BookLayout({
  spineTitle,
  sidebar,
  hideSidebar = false,
  children,
}: BookLayoutProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <div className="flex-1 w-full h-full p-0 sm:p-2 lg:p-8 lg:pr-24">
      {/* Responsive layout: mobile/tablet */}
      <div className="lg:hidden w-full h-full flex flex-col">
        <div className="sticky top-0 z-20 shrink-0 px-3 pt-3 pb-2 bg-linear-to-b from-[#100c2f]/95 via-[#100c2f]/80 to-transparent backdrop-blur-sm">
          <div className="rounded-2xl border border-white/10 bg-[#1E1941]/70 backdrop-blur-2xl px-3 py-2.5 flex items-center justify-between shadow-[0_12px_28px_rgba(0,0,0,0.28)]">
            <h2 className="font-serif text-base sm:text-lg tracking-[0.12em] uppercase text-white/90">{spineTitle}</h2>
            {sidebar && !hideSidebar && (
              <button
                type="button"
                onClick={() => setIsSidebarOpen(true)}
                className="h-9 px-3 rounded-xl border border-white/15 text-white/80 hover:text-white hover:bg-white/10 transition-colors flex items-center gap-2"
                aria-label={`Ouvrir le sommaire ${spineTitle}`}
              >
                <Menu className="w-4 h-4" />
                <span className="text-[11px] uppercase tracking-widest">Sommaire</span>
              </button>
            )}
          </div>
        </div>

        <div className="relative flex-1 min-h-0 overflow-hidden px-2 pb-2">
          <div className="absolute inset-2 rounded-2xl border border-[#E3CCCD]/10 pointer-events-none" />
          <div className="relative z-10 h-full rounded-2xl border border-white/10 flex flex-col bg-[#1E1941]/35 backdrop-blur-xl overflow-hidden">
            {children}
          </div>
        </div>

        {sidebar && !hideSidebar && isSidebarOpen && (
          <div className="fixed inset-0 z-50 bg-black/65 backdrop-blur-sm" onClick={() => setIsSidebarOpen(false)}>
            <div
              className="absolute inset-x-0 bottom-0 h-[min(84vh,46rem)] rounded-t-3xl bg-[#1E1941]/97 border-t border-[#E3CCCD]/20 shadow-[0_-20px_50px_rgba(0,0,0,0.55)]"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="h-full flex flex-col">
                <div className="shrink-0 px-4 pt-3 pb-2 border-b border-white/10 bg-black/10">
                  <div className="w-12 h-1.5 rounded-full bg-white/20 mx-auto mb-3" />
                  <div className="flex items-center justify-between">
                    <p className="text-[11px] uppercase tracking-widest text-[#E3CCCD]/70">Sommaire</p>
                    <button
                      type="button"
                      onClick={() => setIsSidebarOpen(false)}
                      className="p-2 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-colors"
                      aria-label="Fermer le sommaire"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <div className="flex-1 min-h-0">{sidebar}</div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Existing large-screen design (unchanged) */}
      <div className="hidden lg:flex w-full h-full max-w-362.5 rounded-[1rem] relative bg-[#1E1941]/40 backdrop-blur-3xl shadow-[0_20px_50px_rgba(0,0,0,0.3)] border border-white/10 overflow-hidden">
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
              <span className="font-serif text-xl tracking-[0.3em] text-white/90 -rotate-90 whitespace-nowrap uppercase select-none">
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

          {sidebar && (
            <div
              className={`shrink-0 flex flex-col bg-black/10 overflow-hidden transition-all duration-500 ease-in-out ${
                hideSidebar
                  ? "w-0 opacity-0 border-r-0"
                  : "w-60 opacity-100 border-r border-[#E3CCCD]/20"
              }`}
            >
              <div className="w-full h-full flex flex-col">
                {sidebar}
              </div>
            </div>
          )}

          <div className="flex-1 flex flex-col bg-linear-to-br from-white/3 to-transparent overflow-hidden">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
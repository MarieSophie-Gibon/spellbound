import type { ReactNode } from "react";
import { createPortal } from "react-dom";

interface ModalLayoutProps {
  children: ReactNode;
}

export function ModalLayout({
  children,
}: Omit<ModalLayoutProps, "backgroundClass">) {
  const backgroundClass =
    "linear-gradient(160deg, rgba(80,95,200,0.38) 0%, rgba(55,48,130,0.42) 50%, rgba(70,80,175,0.38) 100%)";
  return createPortal(
    <div
      className={`fixed inset-0 z-9999 bg-black/35 backdrop-blur-sm flex items-center justify-center p-4`}
    >
      <div
        className={`relative w-full max-w-6xl rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.4)] flex flex-col h-[90vh] animate-in zoom-in-95 duration-200 border border-white/10 overflow-hidden`}
        style={{ background: backgroundClass }}
      >
        <div className="absolute inset-0 backdrop-blur-3xl -z-10" />
        <div className="absolute inset-0 bg-white/3 -z-10" />
        <div className="absolute inset-px rounded-2xl border border-white/10 pointer-events-none z-0" />
        {children}
      </div>
    </div>,
    document.body,
  );
}

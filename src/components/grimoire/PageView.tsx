import { useState } from "react";
import { createPortal } from "react-dom";
import { Maximize2, Minimize2, Pencil, Trash2, X } from "lucide-react";
import type { WikiPage } from "@/types/grimoire";

interface PageViewProps {
    page: WikiPage;
    isFullscreen: boolean;
    hideFullscreenToggle?: boolean;
    readOnly?: boolean;
    onEdit: () => void;
    onDelete: () => void;
    onToggleFullscreen: () => void;
}

export function PageView({ page, isFullscreen, hideFullscreenToggle, readOnly, onEdit, onDelete, onToggleFullscreen }: PageViewProps) {
    const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);
    const hasActions = !hideFullscreenToggle || !readOnly;

    return (
        <div className="flex-1 relative min-h-0 h-full">
            {hasActions && (
                <div className="absolute top-6 right-8 z-50 flex items-center gap-1 bg-[#1E1941]/80 border border-[#E3CCCD]/20 rounded-full px-2 py-1.5 backdrop-blur-md shadow-xl">
                    {!hideFullscreenToggle && (
                      <button
                          onClick={onToggleFullscreen}
                          className="p-1.5 text-white/60 hover:text-white hover:bg-white/10 rounded-full transition-colors"
                      >
                          {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                      </button>
                    )}
                    {!readOnly && (
                      <button onClick={onEdit} className="p-1.5 text-white/60 hover:text-white hover:bg-white/10 rounded-full transition-colors">
                          <Pencil className="w-4 h-4" />
                      </button>
                    )}
                    {!readOnly && (
                      <button onClick={onDelete} className="p-1.5 text-white/60 hover:text-[#ff6b6b] hover:bg-[#ff6b6b]/10 rounded-full transition-colors">
                          <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                </div>
            )}

            <div className="absolute inset-0 p-4 md:p-5 overflow-y-auto scrollbar-thin scrollbar-thumb-white/10">
                <h1 className="font-serif text-2xl md:text-3xl text-white mb-4 md:mb-5 border-b border-[#E3CCCD]/20 pb-4 md:pb-5 uppercase tracking-wider pr-20 md:pr-32 leading-tight">
                    {page.title}
                </h1>
                <div
                    className="tiptap-editor text-white/90 font-light text-xs md:text-sm leading-relaxed"
                    dangerouslySetInnerHTML={{ __html: page.content }}
                    onClick={(e) => {
                        const target = e.target as HTMLElement;
                        if (target.tagName === "IMG") {
                            setLightboxSrc((target as HTMLImageElement).src);
                        }
                    }}
                />
            </div>

            {/* Lightbox — rendu dans document.body pour échapper aux overflow/transform parents */}
            {lightboxSrc && createPortal(
                <div
                    className="fixed inset-0 z-9999 bg-black/90 backdrop-blur-sm flex items-center justify-center p-6 animate-in fade-in duration-200"
                    onClick={() => setLightboxSrc(null)}
                >
                    <button
                        className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
                        onClick={() => setLightboxSrc(null)}
                    >
                        <X className="w-5 h-5" />
                    </button>
                    <img
                        src={lightboxSrc}
                        alt=""
                        className="max-w-full max-h-[90vh] object-contain rounded-xl shadow-2xl border border-white/10 animate-in zoom-in-95 duration-200"
                        onClick={(e) => e.stopPropagation()}
                    />
                </div>,
                document.body
            )}
        </div>
    );
}


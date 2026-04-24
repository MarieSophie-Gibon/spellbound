import { Maximize2, Minimize2, Pencil, Trash2 } from "lucide-react";
import type { WikiPage } from "@/types/grimoire";

interface PageViewProps {
    page: WikiPage;
    isFullscreen: boolean;
    onEdit: () => void;
    onDelete: () => void;
    onToggleFullscreen: () => void;
}

export function PageView({ page, isFullscreen, onEdit, onDelete, onToggleFullscreen }: PageViewProps) {
    return (
        <div className="flex-1 relative min-h-0">
            <div className="absolute top-6 right-8 z-50 flex items-center gap-1 bg-[#1E1941]/80 border border-[#E3CCCD]/20 rounded-full px-2 py-1.5 backdrop-blur-md shadow-xl">
                <button
                    onClick={onToggleFullscreen}
                    className="p-1.5 text-white/60 hover:text-white hover:bg-white/10 rounded-full transition-colors"
                >
                    {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                </button>
                <button onClick={onEdit} className="p-1.5 text-white/60 hover:text-white hover:bg-white/10 rounded-full transition-colors">
                    <Pencil className="w-4 h-4" />
                </button>
                <button onClick={onDelete} className="p-1.5 text-white/60 hover:text-[#ff6b6b] hover:bg-[#ff6b6b]/10 rounded-full transition-colors">
                    <Trash2 className="w-4 h-4" />
                </button>
            </div>
            <div className="absolute inset-0 p-5 overflow-y-auto scrollbar-thin scrollbar-thumb-white/10">
                <h1 className="font-serif text-3xl text-white mb-5 border-b border-[#E3CCCD]/20 pb-5 uppercase tracking-wider pr-32 leading-tight">
                    {page.title}
                </h1>
                <div
                    className="tiptap-editor text-white/90 font-light text-sm leading-relaxed"
                    dangerouslySetInnerHTML={{ __html: page.content }}
                />
            </div>
        </div>
    );
}

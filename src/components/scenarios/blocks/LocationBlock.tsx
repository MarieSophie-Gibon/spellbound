import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { MapPin, UploadCloud, Trash2, Loader2 } from "lucide-react";

interface LocationBlockProps {
    data: {
        title?: string;
        description?: string;
        imageUrl?: string;
    };
    onChange: (newData: Partial<LocationBlockProps["data"]>) => void;
}

export function LocationBlock({ data, onChange }: LocationBlockProps) {
    const [isUploading, setIsUploading] = useState(false);

    const handleImageUpload = async (file: File) => {
        setIsUploading(true);
        try {
            const ext = file.name.split('.').pop();
            const path = `scenarios/locations/${Date.now()}-${Math.random().toString(36).substring(2)}.${ext}`;
            const { error } = await supabase.storage.from("compendium").upload(path, file);
            if (error) throw error;

            const { data: urlData } = supabase.storage.from("compendium").getPublicUrl(path);
            onChange({ imageUrl: urlData.publicUrl });
        } catch (err: any) {
            alert("Erreur d'upload : " + err.message);
        } finally {
            setIsUploading(false);
        }
    };

    return (
        <div className="flex flex-col md:flex-row border border-emerald-500/20 bg-emerald-500/5 rounded-2xl overflow-hidden shadow-lg group/location relative">

            {/* SECTION IMAGE (Gauche) */}
            <div className="w-full md:w-1/3 min-h-40 relative bg-black/30 flex flex-col items-center justify-center border-b md:border-b-0 md:border-r border-emerald-500/20 shrink-0">
                {isUploading ? (
                    <Loader2 className="w-6 h-6 animate-spin text-emerald-400/50" />
                ) : data.imageUrl ? (
                    <>
                        <img
                            src={data.imageUrl}
                            alt={data.title || "Lieu"}
                            className="absolute inset-0 w-full h-full object-cover opacity-70"
                        />
                        <button
                            onClick={() => onChange({ imageUrl: "" })}
                            className="absolute top-2 right-2 p-1.5 bg-black/60 hover:bg-red-500/80 text-white rounded-lg transition-colors z-10 backdrop-blur-sm opacity-0 group-hover/location:opacity-100"
                            title="Supprimer l'image"
                        >
                            <Trash2 className="w-4 h-4" />
                        </button>
                    </>
                ) : (
                    <label className="flex flex-col items-center justify-center w-full h-full p-6 cursor-pointer hover:bg-white/5 transition-colors text-emerald-400/30 hover:text-emerald-400/50">
                        <UploadCloud className="w-6 h-6 mb-2" />
                        <span className="text-[10px] uppercase tracking-widest text-center">Ajouter une image</span>
                        <input
                            type="file"
                            className="hidden"
                            accept="image/*"
                            onChange={(e) => {
                                if (e.target.files?.[0]) handleImageUpload(e.target.files[0]);
                            }}
                        />
                    </label>
                )}
            </div>

            {/* SECTION TEXTE (Droite) */}
            <div className="flex-1 p-5 flex flex-col gap-3">
                <div className="flex items-center gap-2 text-emerald-400 mb-1 border-b border-emerald-500/20 pb-2">
                    <MapPin className="w-5 h-5 shrink-0" />
                    <input
                        type="text"
                        value={data.title || ""}
                        onChange={(e) => onChange({ title: e.target.value })}
                        placeholder="Nom du lieu..."
                        className="flex-1 bg-transparent font-serif text-2xl outline-none placeholder:text-emerald-400/30 text-emerald-100"
                    />
                </div>
                <textarea
                    value={data.description || ""}
                    onChange={(e) => onChange({ description: e.target.value })}
                    placeholder="Décrivez l'ambiance, les odeurs, les sons, et ce que les joueurs voient en arrivant..."
                    className="w-full bg-transparent text-emerald-50/70 text-[14px] leading-relaxed outline-none resize-none overflow-hidden min-h-20 placeholder:text-emerald-100/20"
                    onInput={(e) => {
                        const target = e.target as HTMLTextAreaElement;
                        target.style.height = "auto";
                        target.style.height = `${target.scrollHeight}px`;
                    }}
                />
            </div>
        </div>
    );
}
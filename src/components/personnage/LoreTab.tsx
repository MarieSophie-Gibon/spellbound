/* eslint-disable @typescript-eslint/no-explicit-any */
export default function LoreTab({
  stats,
  isEditing,
  editSexe,
  setEditSexe,
  editAge,
  setEditAge,
  editIdeal,
  setEditIdeal,
  editTravers,
  setEditTravers,
  editHistorique,
  setEditHistorique,
}: any) {
  if (isEditing) {
    return (
      <div className="space-y-4 bg-[#1E1941]/40 border border-[#E3CCCD]/20 rounded-lg p-5 shadow-inner animate-in fade-in">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <p className="text-[10px] uppercase tracking-widest text-white/35">
              Sexe
            </p>
            <div className="flex gap-2 flex-wrap">
              {(["Masculin", "Féminin", "Autre"] as const).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setEditSexe(s)}
                  className={`px-3 py-1 rounded-full text-[12px] border transition-all ${editSexe === s ? "border-[#E3CCCD]/60 bg-[#E3CCCD]/15 text-[#E3CCCD]" : "border-white/15 text-white/50 hover:border-white/30"}`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-1">
            <p className="text-[10px] uppercase tracking-widest text-white/35">
              Âge
            </p>
            <input
              value={editAge}
              onChange={(e) => setEditAge(e.target.value)}
              placeholder="ex : 24 ans"
              className="w-full bg-transparent border-b border-white/20 focus:border-[#E3CCCD]/60 py-1 text-white text-sm outline-none transition-colors placeholder:text-white/25"
            />
          </div>
        </div>
        <div className="space-y-1">
          <p className="text-[10px] uppercase tracking-widest text-white/35">
            Idéal Héroïque
          </p>
          <textarea
            value={editIdeal}
            onChange={(e) => setEditIdeal(e.target.value)}
            rows={2}
            className="w-full bg-white/5 border border-white/15 focus:border-[#E3CCCD]/50 rounded-lg p-3 text-white text-[13px] outline-none resize-none"
          />
        </div>
        <div className="space-y-1">
          <p className="text-[10px] uppercase tracking-widest text-white/35">
            Travers
          </p>
          <textarea
            value={editTravers}
            onChange={(e) => setEditTravers(e.target.value)}
            rows={2}
            className="w-full bg-white/5 border border-white/15 focus:border-[#E3CCCD]/50 rounded-lg p-3 text-white text-[13px] outline-none resize-none"
          />
        </div>
        <div className="space-y-1">
          <p className="text-[10px] uppercase tracking-widest text-white/35">
            Historique
          </p>
          <textarea
            value={editHistorique}
            onChange={(e) => setEditHistorique(e.target.value)}
            rows={6}
            className="w-full bg-white/5 border border-white/15 focus:border-[#E3CCCD]/50 rounded-lg p-3 text-white text-[13px] outline-none resize-none"
          />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#1E1941]/40 border border-[#E3CCCD]/20 rounded-lg p-5 shadow-inner flex gap-4 text-[14px] font-light text-white/90 leading-relaxed animate-in fade-in">
      <div className="shrink-0 mt-1">
        <span className="text-[#E3CCCD] text-lg">✧</span>
      </div>
      <div className="space-y-6 w-full">
        <div className="flex gap-8">
          {stats?.sexe && (
            <div>
              <p className="text-[10px] uppercase tracking-widest text-white/33 mb-1">
                Sexe
              </p>
              <p>{stats.sexe}</p>
            </div>
          )}
          {stats?.age && (
            <div>
              <p className="text-[10px] uppercase tracking-widest text-white/33 mb-1">
                Âge
              </p>
              <p>{stats.age}</p>
            </div>
          )}
        </div>
        {stats?.ideal && (
          <div>
            <p className="text-[10px] uppercase tracking-widest text-[#E3CCCD]/60 mb-1">
              Idéal Héroïque
            </p>
            <p className="bg-white/5 p-3 rounded-lg border border-white/5">
              {stats.ideal}
            </p>
          </div>
        )}
        {stats?.travers && (
          <div>
            <p className="text-[10px] uppercase tracking-widest text-red-300/60 mb-1">
              Travers
            </p>
            <p className="bg-white/5 p-3 rounded-lg border border-white/5">
              {stats.travers}
            </p>
          </div>
        )}
        {stats?.historique && (
          <div>
            <p className="text-[10px] uppercase tracking-widest text-white/33 mb-2">
              Historique
            </p>
            <p className="text-white/80 italic whitespace-pre-wrap leading-loose">
              {stats.historique}
            </p>
          </div>
        )}
        {!stats?.ideal &&
          !stats?.travers &&
          !stats?.historique &&
          !stats?.age &&
          !stats?.sexe && (
            <p className="text-white/25 italic text-sm text-center py-10">
              Ce personnage est un mystère... Aucun lore renseigné.
            </p>
          )}
      </div>
    </div>
  );
}

import { theme } from '@/lib/theme'
import { Maximize2, Edit3, Trash2, Plus, ArrowLeft, ChevronDown } from 'lucide-react'

export function Grimoire() {
  return (
    // Le p-8 md:pr-24 prend en compte l'espace de la SideNav globale
    <div className="flex-1 flex items-center justify-center w-full h-full p-8 md:pr-24">
      
      {/* CONTENEUR PRINCIPAL (Le "Livre") */}
      <div className="w-full h-full max-w-[1400px] flex rounded-xl relative overflow-hidden bg-[#1E1941]/80 backdrop-blur-xl shadow-2xl">
        
        {/* Stroke intérieur global (#E3CCCD) */}
        <div className={theme.stroke} style={{ borderRadius: 'calc(0.75rem - 5px)' }} />

        {/* 1. LA TRANCHE (Spine) - À gauche */}
        <div className="w-16 shrink-0 bg-[#29206A] flex flex-col items-center justify-between py-8 border-r border-[#E3CCCD]/20 relative z-10 shadow-[4px_0_15px_rgba(0,0,0,0.2)]">
          {/* Ornements du haut */}
          <div className="flex flex-col items-center gap-2 text-white/70">
            <span className="text-[10px] leading-3">•<br/>•<br/>•</span>
            <span className="text-sm">✦</span>
          </div>
          
          {/* Titre pivoté */}
          <div className="flex-1 flex items-center justify-center">
            <span className="font-serif text-3xl tracking-[0.2em] text-white/90 -rotate-90 whitespace-nowrap">
              Grimoire
            </span>
          </div>
          
          {/* Ornements du bas */}
          <div className="flex flex-col items-center gap-2 text-white/70">
            <span className="text-sm">✦</span>
            <span className="text-[10px] leading-3">•<br/>•<br/>•</span>
          </div>
        </div>

        {/* 2. LE SOMMAIRE (Navigation latérale) */}
        <div className="w-72 shrink-0 flex flex-col border-r border-[#E3CCCD]/20 relative z-10 bg-black/5">
          
          {/* Liste des catégories (Scrollable) */}
          <div className="flex-1 overflow-y-auto p-4 space-y-2">
            
            {/* ACCORDÉON ACTIF : Le Personnage */}
            <div className="rounded-lg bg-[#3A458B]/80 border border-[#E3CCCD]/20 overflow-hidden shadow-md">
              <div className="flex items-center justify-between px-4 py-3 cursor-pointer">
                <span className="text-sm font-medium text-white tracking-wide">Le Personnage</span>
                <ChevronDown className="w-4 h-4 text-white/70" />
              </div>
              
              {/* Sous-items */}
              <div className="flex flex-col py-1">
                <div className="px-5 py-2 text-[13px] text-white/70 hover:text-white cursor-pointer transition-colors">Création de Personnage</div>
                {/* Item Actif */}
                <div className="px-5 py-2 text-[13px] text-white font-medium bg-[#29206A] border-y border-[#E3CCCD]/10 cursor-pointer shadow-inner">
                  Progression & Niveaux
                </div>
                <div className="px-5 py-2 text-[13px] text-white/70 hover:text-white cursor-pointer transition-colors">Peuples</div>
                <div className="px-5 py-2 text-[13px] text-white/70 hover:text-white cursor-pointer transition-colors">Famille des Aventuriers</div>
                <div className="px-5 py-2 text-[13px] text-white/70 hover:text-white cursor-pointer transition-colors">Famille des Combattants</div>
                <div className="px-5 py-2 text-[13px] text-white/70 hover:text-white cursor-pointer transition-colors">Famille des Mages</div>
                <div className="px-5 py-2 text-[13px] text-white/70 hover:text-white cursor-pointer transition-colors">Famille des Mystiques</div>
                <div className="px-5 py-2 text-[13px] text-white/70 hover:text-white cursor-pointer transition-colors">Voies de Prestige</div>
                <div className="px-5 py-2 text-[13px] text-white/70 hover:text-white cursor-pointer transition-colors">Profils Hybrides</div>
                <div className="px-5 py-2 text-[13px] text-white/70 hover:text-white cursor-pointer transition-colors">Équipements</div>
              </div>
            </div>

            {/* ACCORDÉON FERMÉ : Les Règles */}
            <div className="flex items-center justify-between px-4 py-3 cursor-pointer rounded-lg border border-[#E3CCCD]/10 hover:bg-white/5 transition-colors">
              <span className="text-sm text-white/80 tracking-wide">Les Règles</span>
              <ChevronDown className="w-4 h-4 text-white/50" />
            </div>

            {/* ACCORDÉON FERMÉ : Mener une partie */}
            <div className="flex items-center justify-between px-4 py-3 cursor-pointer rounded-lg border border-[#E3CCCD]/10 hover:bg-white/5 transition-colors">
              <span className="text-sm text-white/80 tracking-wide">Mener une partie</span>
              <ChevronDown className="w-4 h-4 text-white/50" />
            </div>

          </div>

          {/* BOUTONS D'ACTION DU SOMMAIRE */}
          <div className="p-4 space-y-3 shrink-0 bg-black/10">
            <button className="w-full flex items-center justify-start px-4 gap-3 py-3 rounded-xl border border-[#E3CCCD]/30 text-white/80 hover:text-white hover:bg-white/5 transition-colors text-[13px]">
              <Plus className="w-4 h-4" />
              Ajouter un article
            </button>
            <button className="w-full flex items-center justify-start px-4 gap-3 py-3 rounded-xl border border-[#E3CCCD]/30 text-white/80 hover:text-white hover:bg-white/5 transition-colors text-[13px]">
              <ArrowLeft className="w-4 h-4" />
              <span className="flex gap-1 items-center px-1">
                <div className="w-1 h-1 rotate-45 bg-white/50" />
                <div className="w-1 h-1 rotate-45 bg-white/50" />
                <div className="w-1 h-1 rotate-45 bg-white/50" />
              </span>
              Retour
            </button>
          </div>
        </div>

        {/* 3. L'ARTICLE (Zone de lecture) */}
        <div className="flex-1 flex flex-col relative z-10 bg-gradient-to-br from-[#1E1941]/40 to-[#120D2F]/40 overflow-hidden">
          
          {/* En-tête : Titre et Outils */}
          <div className="flex items-start justify-between px-10 pt-10 pb-6 shrink-0">
            <h1 className="font-serif text-[28px] text-white tracking-[0.05em] uppercase leading-tight pr-6">
              PROGRESSION & NIVEAUX
            </h1>
            
            {/* Toolbar (Agrandir, Éditer, Supprimer) */}
            <div className="flex items-center gap-2 shrink-0 bg-[#29206A]/50 p-1.5 rounded-lg border border-[#E3CCCD]/20">
              <button className="p-1.5 rounded-md text-white/70 hover:text-white hover:bg-white/10 transition-colors">
                <Maximize2 className="w-4 h-4" />
              </button>
              <button className="p-1.5 rounded-md text-white/70 hover:text-white hover:bg-white/10 transition-colors">
                <Edit3 className="w-4 h-4" />
              </button>
              <button className="p-1.5 rounded-md text-white/70 hover:text-red-400 hover:bg-red-500/20 transition-colors">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Contenu de l'article (Scrollable) */}
          <div className="flex-1 overflow-y-auto px-10 pb-10 text-slate-200/90 text-sm leading-relaxed space-y-4 font-light">
            <p>On considère généralement qu'un personnage <strong className="font-medium text-white">peut passer au niveau supérieur</strong> dans deux situations.</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Lorsqu'il a terminé une aventure.</li>
              <li>Lorsqu'il a franchi une étape importante dans une campagne.</li>
            </ul>
            
            <p><strong className="font-medium text-white">A chaque passage de niveau</strong>, le personnage :</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>augmente ses PV selon son profil;</li>
              <li>augmente toutes ses valeurs d'attaque de +1 (jusqu'au niveau 10);</li>
              <li>gagne 2 points de capacité;</li>
              <li>augmente ses points de mana (s'il dispose de sorts).</li>
            </ul>

            <p>De plus, à partir du niveau 6 et tous les 3 niveaux, son dé évolutif (D4) augmente de la façon suivante : D4 devient D6 au niveau 6, puis D8 au niveau 9, etc.</p>
            
            <p><strong className="font-medium text-white">Temps d'apprentissage "réaliste"</strong> : par souci de réalisme, certains MJ souhaitent que les personnages disposent d'un temps d'apprentissage pour acquérir de nouvelles capacités entre deux aventures :</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>un mois environ par rang en solitaire</li>
              <li>une semaine par rang avec un maître</li>
            </ul>
            <p>Il revient au MJ de ménager des pauses dans la chronologie de sa campagne afin d'obtenir un rythme cohérent, de sorte que plusieurs années devraient être nécessaires pour qu'un héros passe du niveau 1 au niveau 12 !</p>
            
            <div className="pt-4">
              <h2 className="text-lg font-serif tracking-widest text-white mb-3 uppercase">POINTS DE VIGUEUR</h2>
              <p className="mb-2">A chaque passage de niveau, un personnage gagne un nombre de points de vigueur qui dépend de sa famille de profils. On y ajoute la valeur de Constitution.</p>
              <p>Changement de valeur de Constitution : si durant le jeu la valeur de Constitution d'un personnage change, ses points de vigueur changent rétroactivement pour chaque niveau déjà acquis, que ce soit en plus ou en moins.</p>
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}
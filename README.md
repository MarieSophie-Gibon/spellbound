# Spellbound

Spellbound est une PWA de table virtuelle (VTT) orientee campagne, scenario, compendium, personnages, grimoire et combat.

Le projet est en migration progressive vers une architecture multi-systemes:

- Systeme actuel: Chroniques Oubliees Fantasy (COF)
- Systeme cible a ajouter: Daggerheart (DH)
- Regle de migration: ne jamais casser COF pendant la transition

## Stack technique

- React 19
- TypeScript
- Vite
- Tailwind CSS
- React Query
- Supabase (Auth, Postgres, Storage, Realtime)

## Etat de l'architecture

La migration est incrementale.

- Couche Core (agnostique systeme): hooks et logique reutilisables
- Couche Systems: logique specifique COF isolee sous `src/hooks/systems/cof`
- Couche DH: squelette cree, implementation metier a venir

Important:

- Les wrappers Core/COF existent pour conserver la compatibilite.
- Les hooks "Mixed" (Core + COF dans le meme fichier) ne doivent pas etre refactores brutalement.
- Tout changement doit rester non destructif.

## Prerequis

- Node.js 20+
- npm 10+
- Docker Desktop (pour Supabase local)
- Supabase CLI

## Installation

```bash
npm install
```

## Variables d'environnement

Creer un fichier `.env.local` a la racine:

```bash
VITE_SUPABASE_URL=http://127.0.0.1:54321
VITE_SUPABASE_ANON_KEY=<your-anon-key>
```

Ces variables sont obligatoires. Sans elles, l'app leve une erreur au demarrage.

## Lancer l'application

```bash
npm run dev
```

Application Vite disponible par defaut sur http://localhost:5173.

## Supabase local

Le dossier `supabase/` contient la config locale, les migrations et templates d'emails.

Demarrer la stack locale:

```bash
npx supabase start
```

Arreter la stack locale:

```bash
npx supabase stop
```

Lier au projet distant (si necessaire):

```bash
npx supabase link --project-ref <project-ref>
```

## Scripts npm

- `npm run dev`: serveur de developpement
- `npm run build`: build production (TypeScript + Vite)
- `npm run typecheck`: verification TypeScript
- `npm run lint`: lint ESLint
- `npm run test`: tests Vitest
- `npm run test:watch`: tests en mode watch
- `npm run test:coverage`: couverture de tests
- `npm run verify`: typecheck + tests + build
- `npm run verify:full`: lint + verify
- `npm run preview`: preview du build

## Structure projet (vue simplifiee)

```text
src/
  components/
    systems/
      cof/
      dh/
  hooks/
    core/
    systems/
      cof/
      dh/
    campaign/
    compendium/
    personnage/
    scenarios/
    grimoire/
```

## Conventions de migration multi-systemes

1. Preservation COF
- Ne pas supprimer les tables/colonnes COF existantes pendant la transition.
- Eviter les changements schema destructifs.

2. Segregation logique
- Core: uniquement tables agnostiques (`campagnes`, `scenarios`, `chapitres`, `wiki_pages`, `utilisateurs`, `campaign_members`, etc.).
- COF: toute logique liee a `pj`, `pnj`, `voies`, `profils`, `familles`, `bestiaire`, `equipements`, `armes_*`, `armures`, etc.

3. Hooks Mixed
- Marquer explicitement les hooks melanges Core + COF.
- Les separer progressivement en deux hooks (Core + COF) sans rupture API brutale.

4. Wrappers d'import
- Preferer les chemins `src/hooks/core/*` ou `src/hooks/systems/cof/*` quand un wrapper existe.
- Garder des re-exports pour assurer une migration sans regression.

## D&D 5E: est-ce que l'architecture est prete ?

Oui, pour demarrer le developpement D&D 5E proprement, l'architecture actuelle est suffisamment bonne.

Pourquoi c'est un bon point de depart:

- Le type systeme existe deja (`DND5E` dans `src/lib/types/rpgSystem.ts`).
- Le projet est deja organise en Core (agnostique) + Systems (specifique metier).
- Les pages principales (Grimoire/Compendium/Personnages/Scenarios) sont deja proches d'un routage par systeme.

Limites actuelles a connaitre:

- La segregation Core/COF est encore partielle (hooks "Mixed" listés dans `src/hooks/HOOK_SEGREGATION_PLAN.md`).
- La couche `src/hooks/systems/dnd5e` n'est pas encore en place.
- Une partie du metier reste encore implémentee directement en COF.

Conclusion:

- Architecture "optimum absolu": pas encore.
- Architecture "optimum pour commencer D&D 5E sans casser l'existant": oui.

## Commencer a coder D&D 5E (guide rapide)

Objectif: ajouter D&D 5E de facon incrementale, sans regression COF.

1. Creer les points d'entree D&D 5E

- Creer les dossiers:
  - `src/hooks/systems/dnd5e/compendium`
  - `src/hooks/systems/dnd5e/personnage`
  - `src/hooks/systems/dnd5e/scenarios`
  - `src/components/systems/dnd5e`
- Ajouter des wrappers minimaux (meme API que COF quand possible) pour faciliter le switch.

2. Prioriser la couche Core avant la logique D&D 5E

- Extraire d'abord les parties agnostiques des hooks "Mixed" vers `src/hooks/core/*`.
- Garder COF inchange tant qu'une version D&D 5E equivalente n'existe pas.

3. Integrer le switch systeme dans chaque domaine

- Lire `campaign.system` (ou systeme selectionne en mode global).
- Router vers l'impl D&D 5E dans les hooks/views:
  - Grimoire
  - Compendium
  - Personnages
  - Scenarios/Combat

4. Commencer par un "vertical slice" D&D 5E

- Exemple recommande:
  - Personnages: lecture liste + fiche detail
  - Compendium: lecture (classes, races, sorts) sans edition avancee
  - Grimoire: categories/pages liees au systeme
- Eviter de lancer tous les modules D&D 5E en parallele.

5. Strategie de schema et donnees

- Eviter les migrations destructives.
- Ajouter des colonnes/tables D&D 5E de maniere additive.
- Conserver la compatibilite lecture avec les donnees legacy (valeurs nulles/systeme absent quand necessaire).

6. Regles de qualite avant merge

- Executer `npm run typecheck` minimum.
- Pour une PR systeme: executer `npm run verify`.
- Ajouter des tests ciblant:
  - non regression COF
  - comportement D&D 5E attendu

7. Convention de livraison

- PRs petites et verticales (1 domaine + 1 objectif fonctionnel).
- Toujours documenter:
  - ce qui reste COF
  - ce qui est deja D&D 5E
  - les migrations SQL associees

## Build et deploiement

- Build front: `npm run build`
- Hebergement: Vercel
- Le fichier `vercel.json` configure une rewrite SPA vers `index.html`.

## Bonnes pratiques contribution

- Faire des petites PRs, atomiques et verifiables.
- Verifier au minimum `npm run typecheck` avant merge.
- Pour les changements sensibles, lancer `npm run verify`.
- Sur les refactors migration, privilegier la compatibilite descendante.

## Roadmap technique (migration)

- Ajouter et propager `campagnes.system` partout ou necessaire.
- Introduire des switchers de rendu par systeme (COF/DH) aux points d'entree UI.
- Extraire les hooks Mixed vers Core + COF.
- Ajouter progressivement la couche metier DH.

## Licence

A definir.

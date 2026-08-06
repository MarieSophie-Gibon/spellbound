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

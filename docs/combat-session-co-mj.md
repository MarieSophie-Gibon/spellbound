# Session de combat partagée MJ / co-MJ

Permet au MJ et à ses co-MJ d'ouvrir le même dashboard de combat, chacun sur sa session et son ordinateur, et de voir en direct les actions de l'autre.

## Ce qui est synchronisé

Dès que deux personnes ouvrent `/campaign/combat?chapitreId=<id>` sur le même chapitre, ces éléments sont partagés en temps réel :

- les combattants (PV, états, ajout et retrait, familiers invoqués) ;
- le combattant actif et le round ;
- les jetons sur la battle map, y compris pendant le glissement (le mouvement se voit en direct, environ 16 positions par seconde au maximum) ;
- l'image de la battle map ;
- le ping (point signalé sur la map), affiché aussi sur l'écran de streaming de l'autre MJ ;
- le brouillard : activation et zones révélées ;
- le texte de la note de combat (sa position reste propre à chaque écran) ;
- les déclencheurs de round ;
- les rencontres.

Un badge à droite du bouton « Menu MJ » affiche « Seul sur ce combat » ou les autres personnes connectées avec leur rôle (MJ ou co-MJ). Un point bleu clignote à côté d'une personne pendant deux secondes après chacune de ses actions. La pastille est verte quand la session est synchronisée, orange pendant la connexion, rouge en cas d'erreur.

Chaque MJ garde son propre affichage `/battlemap` pour son écran de streaming. Cet affichage suit le dashboard du même navigateur, via `BroadcastChannel`.

## Fonctionnement

Transport : un canal **Supabase Realtime Broadcast** (WebSocket, sans passer par la base) par combat, nommé `combat-session:<chapitreId>`. Supabase **Presence** sert à savoir qui est connecté.

Code :

- `src/hooks/scenarios/useCombatSession.ts` : gestion du canal, de la présence, de la synchro initiale et de la reconnexion, avec `usePublishSlice` pour l'envoi par tranche ;
- `src/hooks/scenarios/combatSessionSchema.ts` : validation des messages reçus ;
- `src/components/scenarios/combat/sessionPatches.ts` : différences et fusions des jetons et du brouillard ;
- `src/components/scenarios/CombatDashboard.tsx`, section « Session partagée MJ / co-MJ » : branchement sur l'état du dashboard ;
- `supabase/migrations/20261007000000_combat_session_private_channel.sql` : règles d'accès au canal ;
- `useCombatSession.test.ts`, `combatSessionSchema.test.ts` et `sessionPatches.test.ts` : tests.

Principes :

1. **Envoi par tranches.** Les valeurs simples sont des tranches indépendantes (`activeCombatantId`, `round`, `encounters`, `fogEnabled`, `combatNote`, `roundTriggers`, `battlemapUrl`). Un changement local n'envoie que sa tranche.
2. **Combattants par modifications.** Les combattants ne sont jamais envoyés en liste complète, qui dépasse vite la taille maximale d'un message Supabase. Seuls les combattants ajoutés, modifiés ou retirés partent, dans un événement `combatants-patch`. Deux MJ peuvent donc modifier deux combattants différents en même temps. Les **voies** des PJ et PNJ ne voyagent jamais (ni dans les modifications, ni dans l'état complet) : la session qui reçoit garde celles qu'elle connaît déjà, ou les recharge depuis la base.
3. **Jetons par modifications.** Seuls les jetons ajoutés, déplacés ou retirés partent (`tokens-patch`). Deux MJ qui déplacent deux jetons différents au même instant ne s'écrasent plus.
4. **Brouillard par coups de pinceau.** Seuls les coups ajoutés, prolongés ou retirés partent (`fog-patch`), au plus ~16 fois par seconde pendant que l'on peint, coordonnées arrondies au centième. Chaque coup a un identifiant unique, donc deux MJ peuvent peindre en même temps. Un coup reçu pendant que l'on peint est intégré (le coup en cours garde sa version locale). L'annulation (Ctrl+Z) ne retire que ses propres coups. Effacer tout le brouillard envoie un seul `reset`.
5. **Ping.** Un ping émis sur la map part dans un événement `ping` (identifiant et position). L'autre dashboard l'affiche et le relaie à son `/battlemap`. La sélection au lasso reste locale ; le déplacement groupé qui suit passe par l'aperçu de glissement.
6. **Glissement en direct.** Les positions des jetons en cours de glissement partent dans un événement `drag-preview`, limité à environ 16 envois par seconde, puis `null` au lâcher. L'autre dashboard les affiche comme un aperçu, et son `/battlemap` aussi.
7. **Arrivée dans une session.** La session qui rejoint le combat charge d'abord son état depuis la base, puis demande l'état complet aux autres (`sync-request`). L'état complet ne contient ni les voies ni le brouillard ; le brouillard suit en plusieurs morceaux (`fog-patch`, le premier avec `reset`) adressés à la seule session qui arrive. Seules les sessions déjà synchronisées répondent (`sync-snapshot`), ce qui évite que deux arrivées simultanées s'échangent leurs états, sans comparer les horloges des machines. Sans réponse au bout de 1,5 s, la session se considère seule. Rien n'est envoyé avant la fin de cette synchro, pour ne pas diffuser un état local périmé. Une session qui rejoint un combat en cours garde le tour reçu (le tour n'est remis au premier combattant qu'en l'absence d'autre session).
   **Reconnexion :** quand le canal se rétablit après une coupure, la session redemande l'état courant et l'adopte. Pendant cette resynchronisation, elle ne répond pas aux demandes des autres. Les modifications faites pendant la coupure (tranches, combattants, jetons, brouillard) sont mises de côté, puis réappliquées par-dessus l'état reçu et envoyées. Les aperçus (glissement, ping) ne sont pas conservés.
8. **Création différée du canal.** Le canal est créé un tour après le montage : un montage aussitôt démonté (React StrictMode en développement) n'en crée aucun. Deux canaux du même nom ouverts coup sur coup sur la même connexion se gênent (la fermeture de l'ancien efface la présence du nouveau).
9. **Pas d'écho.** Ce qui vient du réseau n'est pas renvoyé : par référence pour les tranches et les combattants, par contenu pour les jetons (position attendue) et le brouillard (signature attendue de chaque coup).
10. **Sauvegarde.** Chaque dashboard enregistre son état dans le localStorage. En base (`combat_state`, toutes les 400 ms au plus), **une seule session écrit** : la plus ancienne présente, départagée par son identifiant. Toutes voient les mêmes heures d'arrivée via la présence et désignent donc la même. Une session seule, en connexion ou en erreur écrit elle-même, par sécurité.
11. **Brouillard.** `BattleMap` adopte maintenant le brouillard reçu en props (`fogReveals`), sauf pendant un coup de pinceau en cours. Il ne remonte au parent que ses propres modifications.

## Sécurité

- **Canal privé.** Le canal est rejoint avec `private: true`, après transmission du jeton de l'utilisateur à Realtime (`supabase.realtime.setAuth()`). Realtime applique alors les règles RLS de `realtime.messages` (migration `20261007000000_combat_session_private_channel.sql`) : seul un MJ ou co-MJ (`is_campaign_manager`) de la campagne qui possède le chapitre du nom du canal peut écouter, émettre ou rejoindre la présence. Les autres canaux de l'application ne sont pas concernés.
- **Validation des messages reçus.** Chaque tranche, modification de combattants, aperçu de glissement et état complet est vérifié avant d'être appliqué : forme, types, bornes (nombre d'éléments, coordonnées, longueur des textes) et URL d'images (http(s), `data:image` ou chemin du site uniquement). Un message invalide est ignoré et signalé dans la console.

Droits d'accès à la page : le co-MJ (`campaign_members.role = 'OWNER'`) a déjà accès à `/campaign/combat` et peut écrire dans `chapitres`.

L'ancienne logique a été supprimée : la page joueur `PlayerCombat` et l'abonnement realtime à `combat_state` qui la synchronisait.

## Diagnostic

La console du navigateur affiche des lignes `[combat-session]` : état du canal, sessions vues par la présence, demandes d'état envoyées et reçues, état complet reçu, session prête, et messages refusés par le serveur avec leur taille. La pastille est rouge si le canal est en erreur.

## Comment tester

Les deux sessions doivent tourner sur **la même version** de l'application. Par exemple, `localhost` dans une fenêtre normale et dans une fenêtre privée. La production (`spellbound-cof.vercel.app`) ne contient pas cette feature tant qu'elle n'est pas fusionnée. Pour deux ordinateurs, utiliser `npm run dev -- --host` ou l'URL de prévisualisation Vercel de la branche.

1. Ouvrir **le même** combat (même `chapitreId`) avec le compte MJ et le compte co-MJ.
2. Vérifier que le badge affiche le nom de l'autre personne.
3. Faire une action d'un côté et vérifier qu'elle apparaît de l'autre : glisser un jeton (le mouvement doit se voir), ajouter un combattant et son jeton, modifier des PV, passer au tour suivant, peindre le brouillard, changer la map, modifier la note.
4. Fermer puis rouvrir l'un des deux : il doit récupérer l'état courant de l'autre.

## Reste à faire

### Limites connues

- **Modifications simultanées d'un même élément.** La dernière modification reçue gagne : deux MJ qui modifient au même instant les PV du même combattant, ou déplacent le même jeton.
- **Coupure des deux côtés.** Si les deux sessions modifient le même élément pendant une coupure, la dernière renvoyée gagne.

### Robustesse

- **Taille des messages.** Supabase refuse les messages au-delà d'environ 256 Ko. Les voies et le brouillard ne font plus partie de l'état complet ; un seul coup de pinceau démesuré (plusieurs milliers de points) pourrait encore dépasser la limite.

### Suite de la feature

- Indicateur de présence : ajouter un avatar.
- Ouvrir la session aux joueurs, en lecture seule, ou avec le droit de déplacer leurs propres jetons, une fois le canal sécurisé.

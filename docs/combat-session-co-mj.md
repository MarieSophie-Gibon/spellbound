# Session de combat partagée MJ / co-MJ

Permet au MJ et à ses co-MJ d'ouvrir le même dashboard de combat, chacun sur sa session et son ordinateur, et de voir en direct les actions de l'autre.

## Ce qui est synchronisé

Dès que deux personnes ouvrent `/campaign/combat?chapitreId=<id>` sur le même chapitre, ces éléments sont partagés en temps réel :

- les combattants (PV, états, ajout et retrait, familiers invoqués) ;
- le combattant actif et le round ;
- les jetons sur la battle map, y compris pendant le glissement (le mouvement se voit en direct, environ 16 positions par seconde au maximum) ;
- l'image de la battle map ;
- le brouillard : activation et zones révélées ;
- le texte de la note de combat (sa position reste propre à chaque écran) ;
- les déclencheurs de round ;
- les rencontres.

Un badge à droite du bouton « Menu MJ » affiche « Seul sur ce combat » ou le nom des autres personnes connectées. La pastille est verte quand la session est synchronisée, orange pendant la connexion.

Chaque MJ garde son propre affichage `/battlemap` pour son écran de streaming. Cet affichage suit le dashboard du même navigateur, via `BroadcastChannel`.

## Fonctionnement

Transport : un canal **Supabase Realtime Broadcast** (WebSocket, sans passer par la base) par combat, nommé `combat-session:<chapitreId>`. Supabase **Presence** sert à savoir qui est connecté.

Code :

- `src/hooks/scenarios/useCombatSession.ts` : gestion du canal, de la présence et de la synchro initiale, avec `usePublishSlice` pour l'envoi par tranche ;
- `src/components/scenarios/CombatDashboard.tsx`, section « Session partagée MJ / co-MJ » : branchement sur l'état du dashboard ;
- `src/hooks/scenarios/useCombatSession.test.ts` : tests.

Principes :

1. **Envoi par tranches.** L'état est découpé en tranches indépendantes (`activeCombatantId`, `round`, `mapTokens`, `encounters`, `fogEnabled`, `fogReveals`, `combatNote`, `roundTriggers`, `battlemapUrl`). Un changement local n'envoie que sa tranche. Le MJ peut donc déplacer un jeton pendant que le co-MJ modifie des PV, sans que l'un écrase l'autre.
2. **Combattants par modifications.** Les combattants ne sont jamais envoyés en liste complète, qui dépasse vite la taille maximale d'un message Supabase (voies des PJ). Seuls les combattants ajoutés, modifiés ou retirés partent, dans un événement `combatants-patch`. Deux MJ peuvent donc modifier deux combattants différents en même temps.
3. **Glissement en direct.** Les positions des jetons en cours de glissement partent dans un événement `drag-preview`, limité à environ 16 envois par seconde, puis `null` au lâcher. L'autre dashboard les affiche comme un aperçu, et son `/battlemap` aussi.
4. **Arrivée dans une session.** La session qui rejoint le combat charge d'abord son état depuis la base, puis demande l'état complet aux autres (`sync-request`). Seules les sessions déjà synchronisées répondent (`sync-snapshot`), ce qui évite que deux arrivées simultanées s'échangent leurs états, sans comparer les horloges des machines. Sans réponse au bout de 1,5 s, la session se considère seule. Rien n'est envoyé avant la fin de cette synchro, pour ne pas diffuser un état local périmé.
5. **Création différée du canal.** Le canal est créé un tour après le montage : un montage aussitôt démonté (React StrictMode en développement) n'en crée aucun. Deux canaux du même nom ouverts coup sur coup sur la même connexion se gênent (la fermeture de l'ancien efface la présence du nouveau).
6. **Pas d'écho.** Une valeur reçue est mémorisée par tranche et n'est pas renvoyée. La comparaison se fait par référence.
7. **Sauvegarde inchangée.** Chaque dashboard continue d'enregistrer `combat_state` en base, toutes les 400 ms au plus, ainsi que dans le localStorage. Comme les états convergent, les deux sessions écrivent le même contenu.
8. **Brouillard.** `BattleMap` adopte maintenant le brouillard reçu en props (`fogReveals`), sauf pendant un coup de pinceau en cours. Il ne remonte au parent que ses propres modifications.

Droits : le co-MJ (`campaign_members.role = 'OWNER'`) a déjà accès à `/campaign/combat` et peut écrire dans `chapitres`. Aucune migration n'a été nécessaire.

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

- **Modifications simultanées d'une même tranche ou d'un même combattant.** La dernière modification reçue gagne. Exemple : deux MJ qui modifient au même instant les PV du même combattant, ou qui déplacent deux jetons différents au même instant (`mapTokens` est une seule tranche). Piste : envoyer aussi les jetons par modifications.
- **Ping et lasso non partagés.** Ils ne passent que par le `BroadcastChannel` local. Piste : relayer l'événement `ping` de `BattleMap` sur le canal de session. Le code de réception côté joueur existe dans l'historique (`git show f58280b:src/pages/PlayerCombat.tsx`, autour des lignes 337 et 794).
- **Brouillard pendant un coup de pinceau.** Une mise à jour reçue pendant que l'on peint est ignorée, puis écrasée par le coup de pinceau local.

### Sécurité

- Le canal est **public**. Toute personne qui connaît l'identifiant du chapitre et la clé publique Supabase peut l'écouter ou y émettre. À faire : passer en canal privé (`config: { private: true }`) et ajouter des règles d'accès (RLS) sur `realtime.messages`, en réutilisant `is_campaign_manager(campaign_id)`.
- Les messages reçus sont appliqués sans validation. À faire : valider la forme de chaque tranche avant de l'appliquer.

### Robustesse

- **Taille des messages.** Supabase refuse les messages trop gros (vérifié : 300 Ko refusé, 200 Ko accepté). L'état complet envoyé à l'arrivée (`sync-snapshot`, avec tous les combattants) et un brouillard très détaillé (`fogReveals`) peuvent la dépasser. Si l'état complet est refusé, la session qui arrive garde l'état chargé depuis la base, qui est en général à jour à 400 ms près. Pistes : alléger l'état complet (voies rechargées depuis la base), compresser le brouillard.
- **Reconnexion.** Après une coupure réseau, il n'y a pas de nouvelle synchro complète. À faire : renvoyer un `sync-request` quand le canal repasse en `SUBSCRIBED`.
- **Écritures en base en double.** Chaque session enregistre le même état. À terme, il faudra soit désigner une seule session chargée d'écrire, soit ignorer l'enregistrement quand le changement vient du réseau.

### Suite de la feature

- Rendre l'indicateur de présence plus riche : avatar, rôle (MJ ou co-MJ), et qui est en train d'agir.
- Ouvrir la session aux joueurs, en lecture seule, ou avec le droit de déplacer leurs propres jetons, une fois le canal sécurisé.

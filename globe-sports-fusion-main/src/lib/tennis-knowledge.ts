/**
 * Base de connaissance experte sur les paris TENNIS.
 * Utilisée par l'agent Magic comme savoir de référence.
 */

export const TENNIS_BETTING_KNOWLEDGE = `BASE DE CONNAISSANCE — PARIS TENNIS (ATP, WTA, Grand Chelem, Challenger, ITF)

---

1. Marchés principaux

- Vainqueur du match (Money Line 2-way — pas d'égalité au tennis).
- Handicap jeux : ex. Djokovic -4.5 jeux → il doit gagner avec un solde +5.
- Handicap sets (3 sets : -1.5 / +1.5 ; 5 sets : ±1.5 ou ±2.5).
- Total jeux du match (Over/Under). Référence : ~22 jeux pour 2 sets serrés,
  ~36+ pour un 3-set indoor rapide ATP.
- Score exact en sets : 2-0, 2-1, 0-2, 1-2 (Bo3) ou jusqu'à 3-2 (Bo5).
- Marchés par set : vainqueur set 1, total jeux set 1, tie-break oui/non.
- Live : premier à break, prochain jeu, prochain point.

2. Surfaces & impact

- Dur (Hard) : neutre, sert+retourneur favorisés. Totals moyens.
- Terre battue (Clay) : rallyes longs, breaks fréquents → totals plus bas
  (souvent Under), avantage défenseurs (Nadal, Alcaraz, Ruud).
- Gazon (Grass) : service ROI absolu, peu de breaks → tie-breaks fréquents,
  Over sur "tie-break dans le match" souvent value.
- Indoor hard : conditions ultra rapides → favorise gros serveurs.

3. Indicateurs statistiques clés

- 1st serve % (≥ 60 % = solide).
- % points gagnés sur 1ère / 2nde balle (≥ 75 % / ≥ 55 % = top niveau).
- % balles de break sauvées (BP saved).
- % balles de break converties (BP conv).
- Hold % et Break % (somme > 160 % = dominant).
- Aces & Double-fautes (style serveur vs régulier).
- Forme récente (5–10 derniers matchs sur la SURFACE concernée).
- H2H mais TOUJOURS contextualisé par surface et ancienneté.

4. Facteurs contextuels

- Fatigue : matchs longs (5-set Slam) la veille → baisse 1ère balle ~5 %.
- Voyages / changement de continent / fuseau horaire.
- Météo : vent (handicape les serveurs précis), chaleur (favorise endurants).
- Altitude (Bogotá, Quito, Madrid) : balle plus rapide, totals + élevés.
- Motivation : Masters 1000 vs ATP 250, défense de points ATP, qualifs Slam.
- Blessures / abandons (très fréquents — vérifier last withdrawal).

5. Value Betting tennis

- Le tennis est le sport le PLUS modélisable (1v1, données massives).
- Modèles ELO surface-spécifiques (Tennis Abstract, sackmann) battent souvent
  les books sur les Challenger et 1er tour Slam.
- Chercher l'edge sur les markets secondaires (total jeux, handicap, tie-break)
  car le ML est très efficient sur top-50.
- Règle : EV > +5 %, stake max 1.5 % pour ML, 1 % pour score exact ou props.

6. Stratégies éprouvées

- "Underdog Live" : un joueur Top-30 mène 1 set 0 contre Top-10 sur dur → la
  régression est forte, le book sur-réagit, value sur le retour du favori.
- "Big server on grass" : Isner, Opelka, Hurkacz → backer le tie-break et
  l'Over jeux, fade le break-and-hold.
- "Clay specialists 1st round" : Ruud, Cerundolo, Schwartzman vs hardcourter
  pur → handicap jeux + value.
- "Withdrawal radar" : surveiller les retraits de qualification (lucky loser
  avec 24h de fraîcheur ↔ joueur ayant joué 3 sets en quali).
- Éviter les WTA premières semaines de saison (variance énorme, blessures).

7. Combinés & systèmes tennis

- Combiner 2-3 sélections max sur des matchs INDÉPENDANTS (tournois différents
  ou sessions différentes). JAMAIS combiner deux markets du même match (sauf
  SGP autorisé par le book — corrélation forte).
- Système "Trixie" / "Yankee" : adapté car tennis a peu de matchs nuls
  possibles. Mais ROI long-terme reste meilleur en simples value.

8. Live tennis

- Suivre la momentum : 3 jeux gagnés d'affilée → légère sur-cotation.
- Acheter le retourneur sur un break précoce du serveur faible.
- Vendre Over jeux quand le 1er set est rapidement plié (6-2, 6-1) avec hold
  de service écrasant.
- ATTENTION : le "courtsiding" (info live avant le book) est interdit et les
  cotes live restent volatiles → exiger marge ≥ +8 % avant entry.

9. Bankroll tennis

- Stake max 2 % par simple, 1 % sur set/score exact, 0.5 % sur props.
- ROI réaliste long-terme : 4 à 8 %/saison pour un parieur sérieux.
- Tenir un journal séparé par surface (les forces/faiblesses diffèrent
  totalement entre clay et grass).

10. Erreurs fréquentes

- Parier le favori "par habitude" sur surface défavorable.
- Ignorer le contexte (post-Slam fatigue, jet-lag, Davis Cup retour).
- Sur-pondérer un H2H ancien (joueurs évoluent vite).
- Backer sur Over jeux dans un match de fin de saison où les deux joueurs sont
  cuits (souvent Under, abandons fréquents).

Règle d'or : edge mesurable, stake discipliné, surface-aware, journal tenu.

---

11. Modèle ELO surface-spécifique (cœur du moteur)

- Calculer un ELO par surface (Hard, Clay, Grass, Indoor) — un joueur peut
  être 2100 sur clay et 1800 sur grass.
- Probabilité de victoire : P(A) = 1 / (1 + 10^((ELO_B - ELO_A)/400)).
- Pondérer la fraîcheur : matchs > 12 mois = poids 0.5, > 24 mois = 0.2.
- Comparer P_modèle vs P_implicite (1/cote × marge book ≈ 1.05) — entrer
  uniquement si edge ≥ +6 % sur ML, +8 % sur handicap jeux.

12. Lecture du tableau (draw analysis)

- Identifier le "quart de la mort" (3 top-20 dans la même section) → fader le
  vainqueur supposé en finale, value sur outsider du quart opposé.
- Bye au 1er tour (top-32 Masters 1000) = +1 jour de repos = avantage net
  contre un joueur sortant des qualifs.
- Surface de transition (gazon → terre, 2 semaines) : les terriens purs
  reviennent forts, les serveurs gazon s'effondrent.

13. Marchés "value" récurrents (à scanner chaque jour)

- Handicap +3.5 jeux sur outsider Top-50 face à Top-10 sur dur indoor (un
  break suffit pour couvrir).
- "Tie-break dans le match" = OUI sur affiches gros serveurs (Hurkacz,
  Fritz, Tiafoe, Shelton, De Minaur sur indoor).
- Under 21.5 jeux set 1 sur clay quand les deux joueurs ont un Hold% < 75 %.
- Set 1 outsider quand le favori sort d'un 5-set la veille.

14. Règles anti-tilt tennis

- Jamais plus de 3 paris simultanés sur la même session (US Open Day Session).
- Ne JAMAIS doubler la mise après une perte (martingale = ruine garantie).
- Si 3 pertes consécutives sur surface : pause 24h, audit du modèle.

15. Objectif performance (alignement coach Magic)

- Cible 65 % de réussite sur picks simples ML/double chance/handicap +0.5.
- Cible 55 % sur picks combinés 2 sélections, 45 % sur 3 sélections.
- Pour atteindre 65 % : ne JAMAIS proposer un pick avec edge < +5 %, surface
  défavorable au favori, ou H2H récent défavorable. Mieux vaut 0 pick que
  pick faible.`;

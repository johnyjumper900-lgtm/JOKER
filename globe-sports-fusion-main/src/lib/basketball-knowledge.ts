/**
 * Base de connaissance experte sur les paris BASKETBALL.
 * Utilisée par l'agent Magic comme savoir de référence.
 */

export const BASKETBALL_BETTING_KNOWLEDGE = `BASE DE CONNAISSANCE — PARIS BASKETBALL (NBA, EuroLeague, NCAA, FIBA)

---

1. Marchés principaux

- Moneyline (1/2) : vainqueur du match (prolongations incluses en NBA/EuroLeague,
  sauf mention "regular time" en pré-match européen).
- Handicap (Spread / Point Spread) : un des deux camps reçoit/donne X points.
  Ex: Lakers -6.5 → ils doivent gagner par 7+. Cotes typiques ~1.90.
- Total points (Over/Under) : somme des points marqués par les deux équipes.
  NBA moyennes 220–235 pts ; EuroLeague 150–170 ; NCAA 130–150.
- Handicap & Total par quart-temps / mi-temps.
- Money Line 3-way (Europe, temps réglementaire) : 1 / X / 2 où X = égalité
  après 40 min (rare mais possible).

2. Marchés secondaires (props équipe & joueur)

- Points / Rebonds / Passes / 3pts d'un joueur (Over/Under).
- Triple-double, double-double.
- Joueur premier marqueur, joueur à atteindre N points en premier.
- Points combinés P+R+A ("PRA").
- Marge de victoire exacte (rare — cotes très élevées).
- Equipe à marquer le plus de 3pts, à remporter chaque quart-temps.

3. Concepts statistiques pro

- Pace : possessions par 48 min. Une équipe rapide (Pace > 102) gonfle le total.
- Offensive Rating (ORtg) / Defensive Rating (DRtg) : pts pour/contre / 100 poss.
  Total prédictif ≈ (ORtg_A + ORtg_B) × Pace_moyen / 100.
- True Shooting % (TS%) : efficacité réelle (intègre 3pts et LF).
- Net Rating : ORtg − DRtg. Indicateur n°1 de la qualité d'équipe.
- Back-to-back (B2B) : match J-1 → fatigue, baisse moyenne ~3 pts d'efficacité.
- Rest advantage : 2+ jours de repos vs adversaire fatigué = edge réel (+2/+3 ATS).

4. Facteurs clés à vérifier AVANT chaque pari

1. Blessures / repos (load management) — vérifier injury report officiel à H-1.
2. Back-to-back & déplacements (côte ouest → côte est = jet lag).
3. Motivation : tanking (fin de saison NBA), "must-win" playoffs, derbys.
4. Arbitrage : certains arbitres sifflent + de fautes → totals plus hauts.
5. Style des coachs (D'Antoni up-tempo vs Thibodeau slow).
6. Domicile/extérieur : avantage moyen ~2.5 à 3 pts en NBA.

5. Value Betting basket

EV = (cote × probabilité_vraie) − 1.
On parie SI EV > +5 % et que la ligne est mal calibrée vs la moyenne marché.
Attention au "line shopping" : différences de 0.5 pt sur le spread changent
radicalement la rentabilité long-terme (key numbers : 3, 5, 7).

6. Bankroll & gestion (basket)

- Stake max 2 % de la bankroll par pick simple, 1 % sur props joueur (variance ↑).
- Combinés basket : limiter à 3-4 sélections max (corrélations cachées entre
  spread et total — éviter de combiner spread + total du MÊME match sauf SGP).
- Same Game Parlay (SGP) : utile mais cotes "boostées" souvent sous-évaluées
  par le book → calculer la cote théorique et exiger +10 % de marge.

7. Live betting basket

- Acheter un favori en retard de 6-8 pts en début de Q2 = excellent spot si
  Net Rating supérieur (régression à la moyenne).
- Vendre un total quand le rythme du Q1 dépasse +15 % de la projection
  (régression rapide).
- Moments à éviter : fin de Q4 avec écart < 5 pts (line manipulation, fautes
  intentionnelles, garbage time imprévisible).

8. Spécificités ligues

- NBA : 82 matchs, 4×12 min. Trois-points décisifs (~13/match par équipe).
- EuroLeague : 4×10 min. Défense plus physique, totals plus bas, value sur
  les "unders" en match closing (équipes à risque éliminatoire).
- NCAA : 2×20 min. Énorme variance (jeunes), exploiter les mismatchs de pace.
- FIBA / coupes nationales : règles 4×10, possessions 24s, attention aux
  remplacements illimités.

9. Erreurs fréquentes à éviter

- Parier le "big name" sans regarder la cote (ex: Lakers favoris à 1.40 vs Net
  Rating négatif).
- Ignorer l'absence d'un role player clé (3&D, rim protector).
- Sur-réagir à un blowout récent (variance, pas tendance).
- Combiner trop de props joueur d'une même équipe (corrélations).

Tout pari doit obéir à la même règle d'or : EV positif, stake mesuré, journal
tenu (ROI hebdomadaire et drawdown).

---

10. Modèle prédictif "Four Factors" (Dean Oliver)

- eFG% (Effective Field Goal %) : (FGM + 0.5 × 3PM) / FGA → poids 40 %.
- TOV% (Turnover %) : pertes / possessions → poids 25 %.
- ORB% (Offensive Rebound %) : poids 20 %.
- FTr (Free Throw Rate) : LF tentés / Tirs tentés → poids 15 %.
- Une équipe qui domine 3 des 4 facteurs sur les 10 derniers matchs gagne
  ~78 % du temps. Indispensable pour valider un favori.

11. Marchés "value" récurrents (à scanner chaque jour)

- Handicap +6.5 sur underdog NBA à domicile, sortant d'un blowout (réaction
  émotionnelle quasi systématique = couverture en Q4).
- Under total quand les deux équipes top-5 DRtg s'affrontent + arbitre
  "low whistle" (peu de fautes).
- 1ère mi-temps Over quand les deux équipes ont Pace > 102 et jouent à 20h
  (les coachs sortent les rotations longues en 2nde MT).
- Joueur "PRA" Over sur une star adversaire à un role player blessé (usage
  rate ↑ mécaniquement de 4-5 points).

12. Lecture du contexte NBA / EuroLeague

- "Schedule loss" : 4ème match en 6 nuits côte ouest → fader sec, edge ~+8 %.
- "Revenge game" : équipe humiliée de 20+ pts dans le précédent affrontement
  → cover ATS ~62 % historique.
- Playoffs : home court advantage explose (jusqu'à +6 pts vs +2.5 régulier).
- EuroLeague : surveiller la Liga ACB en parallèle (rotation joueurs cuits).

13. Règles anti-tilt basket

- Max 2 paris simultanés sur des matchs en chevauchement live.
- Ne JAMAIS combiner un spread et un total du MÊME match (corrélation cachée).
- Si la ligne bouge de +1.5 pt après l'injury report : c'est trop tard, skip.

14. Objectif performance (alignement coach Magic)

- Cible 65 % de réussite sur picks simples spread ±, total Over/Under et
  ML favori cote ≤ 1.55 (validés Four Factors + repos + injuries).
- Cible 55 % sur combos 2 picks de matchs INDÉPENDANTS.
- Mieux vaut 3 picks par jour à 65 % que 10 picks à 50 %. La discipline
  d'attente est le vrai edge long-terme.`;

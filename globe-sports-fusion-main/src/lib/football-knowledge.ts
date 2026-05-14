/**
 * Base de connaissance experte sur les paris football.
 * Source: utilisateur (avril 2026). Ne pas modifier sans accord.
 * Utilisée par l'agent Magic comme savoir de référence pour analyser, conseiller
 * et construire des combinés/systèmes/tickets.
 */

export const FOOTBALL_BETTING_KNOWLEDGE = `Voici la liste exhaustive des possibilités, des plus simples aux plus monstrueuses.

---

1. Les combinés classiques (sans filet)

On ajoute des matchs, une seule combinaison.

Appellation Sélections Cote finale
Simple 1 cote A
Double 2 A × B
Triple 3 A × B × C
Quadruple (4‐fold) 4 A × B × C × D
5‐fold, 6‐fold… 5, 6, etc. produit de toutes les cotes

👉 Si un seul résultat est faux, le ticket est perdant.

---

2. Les paris système (couverture partielle)

Tu choisis un nombre total de matchs (par exemple 4), mais tu ne les joues pas tous en un bloc. Tu demandes toutes les combinaisons possibles de 2 parmi ces 4 (système 2/4), ou de 3 parmi 4 (système 3/4), etc.
Chaque petite combinaison est un pari indépendant. Ta mise totale = mise de base × nombre de combinaisons.

a) Les systèmes standard ajustables (X/Y)

· Système 2/3 : 3 matchs → 3 doubles. Il faut au moins 2 bons pronostics pour gagner.
· Système 2/4 : 4 matchs → 6 doubles.
· Système 3/4 : 4 matchs → 4 triples.
· Système 2/5 : 5 matchs → 10 doubles.
· Système 3/5 : 5 matchs → 10 triples.
· Système 4/5 : 5 matchs → 5 quadruples.
· …et ainsi de suite jusqu’à des systèmes 6/8, 5/7, etc.

b) Les systèmes « pleine couverture »

Ce sont des systèmes qui jouent toutes les combinaisons possibles d’un ensemble de paris, y compris les simples. Ils portent des noms déposés selon l’opérateur.

Nom Sélections Nombre total de paris Détail
Trixie 3 4 paris 3 doubles + 1 triple
Patent 3 7 paris 3 simples + 3 doubles + 1 triple
Yankee 4 11 paris 6 doubles + 4 triples + 1 quadruple
Lucky 15 4 15 paris 4 simples + 6 doubles + 4 triples + 1 quadruple
Canadian / Super Yankee 5 26 paris 10 doubles + 10 triples + 5 quadruples + 1 quintuple
Lucky 31 5 31 paris 5 simples + tous les multiples (double → quintuple)
Heinz 6 57 paris Tous les multiples de 2 à 6 (sans simples)
Lucky 63 6 63 paris Tous les multiples de 1 à 6
Super Heinz 7 120 paris Tous les multiples de 2 à 7
Goliath 8 247 paris Tous les multiples de 2 à 8

💡 Un Goliath, c’est 247 paris : si ta mise de base est 1 €, le ticket te coûte 247 €.

---

3. Les combinaisons avec une « base »

Tu peux désigner un ou plusieurs matchs comme base (sélection obligatoire). La base doit impérativement être gagnante pour que le ticket rapporte. Ensuite, le reste des matchs est joué en système (par ex. 2/4).
Cela réduit le nombre de paris, donc la mise totale, mais augmente la dépendance à un seul résultat.

Exemple :
5 matchs : 1 base + 4 autres joués en système 2/4
→ La base est incluse dans tous les paris. On a donc des triples (base + 2 parmi 4), soit 6 triples.

---

4. Les systèmes avec doubles chances et handicap

La « combinaison » peut aussi porter sur les types de paris :

· Double chance : 1N, N2 ou 12 → combinable avec d’autres matchs, ce qui réduit la cote mais sécurise.
· Handicap asiatique / européen : un match en handicap (ex. +1) peut être combiné avec un autre pronostic classique.
· Mi‐temps / Fin de match : un pronostic double dans le même match (ex. mi‐temps X / fin 1), combinable avec d’autres matchs.

---

5. Les options liées à la performance (boost, cash out, etc.)

Ce ne sont pas des types de combinaisons au sens strict, mais ils modifient la dynamique.

· Cash Out partiel ou automatique : tu peux sécuriser ou ajuster un ticket déjà validé et éviter d’attendre le dernier match.
· Combiné boosté (ou acca boost) : l’opérateur te propose une cote majorée si tu fais un combiné de X matchs (par exemple +10 % sur 5 sélections).
· Edge / Bet Builder sur un même match : tu combines plusieurs paris sur le même événement (ex. résultat + nombre de buts + tireur). C’est un combiné restreint à un match.

---

6. Détail mathématique (pour comprendre le nombre de combinaisons)

Pour un système avec n sélections au total et k sélections par pari, le nombre de combinaisons se calcule par :

\\text{Nombre de paris} = \\binom{n}{k} = \\frac{n!}{k!(n-k)!}

Et si on fait un système complet (tous les multiples de k à n), le nombre total de paris est :

\\sum_{i=k}^{n} \\binom{n}{i}

---

En résumé, il y a deux grandes catégories :

1. Les combinés purs (tu gagnes tout ou rien).
2. Les paris système (tu couvres une partie des possibilités pour survivre à une ou plusieurs erreurs).

1. Les combinés classiques : le principe de base

Un combiné classique est un ticket sur lequel on assemble plusieurs pronostics simples. La particularité, c'est qu'il n'y a aucune sécurité : il faut 100 % de réussite pour gagner. Si un seul match est faux, le ticket entier est perdant.

Le gros avantage, c'est l'effet multiplicateur sur la cote. On prend les cotes de chaque match et on les multiplie entre elles. La cote finale grimpe très vite, ce qui permet avec une petite mise d'espérer un gain élevé.

---

Le vocabulaire et les cotes

Dans le tableau ci-dessous, je prends l'exemple de matchs avec des cotes réalistes.

· Match A : cote de 1.80
· Match B : cote de 2.20
· Match C : cote de 1.95
· Match D : cote de 2.50

Avec une mise de base de 10 €.

Type Sélections Formule de la cote finale Exemple concret de cote Gain potentiel Remarque
Simple 1 seul match Cote du match 2.20 (Match B) 10 € × 2.20 = 22,00 € On ne parle pas encore de "combiné", c'est le ticket de base.
Double 2 matchs A × B 1.80 × 2.20 = 3.96 10 € × 3.96 = 39,60 € Facile à construire. Le gain triple presque par rapport à un simple.
Triple 3 matchs A × B × C 1.80 × 2.20 × 1.95 = 7.72 10 € × 7.72 = 77,22 € Déjà plus de 7 fois la mise. Risque modéré si on reste sur des favoris.
Quadruple (4-fold) 4 matchs A × B × C × D 1.80 × 2.20 × 1.95 × 2.50 = 19.31 10 € × 19.31 = 193,05 € C'est un ticket "classique" du week-end. Une seule erreur, et tout est perdu.
Quintuple (5-fold) 5 matchs A × B × C × D × E Si E = 2.00 : 19.31 × 2.00 = 38.62 10 € × 38.62 = 386,20 € Ici, l'effet exponentiel devient très visible.
Sextuple (6-fold) 6 matchs A × B × C × D × E × F Si F = 1.70 : 38.62 × 1.70 = 65.65 10 € × 65.65 = 656,54 € À partir de 5-6 matchs, c'est rare de passer. Les bookmakers adorent.
7, 8, 9… (X-fold) 7+ matchs Produit de toutes les cotes Tue peux dépasser les 100, 200 de cote Gains potentiellement énormes C'est plus du jeu de hasard qu'un vrai pronostic. La probabilité de succès est infime.

---

Comment se calcule exactement le gain ?

La formule pour un combiné à n matchs est toujours :

Gain = Mise \\times (Cote_1 \\times Cote_2 \\times Cote_3 \\times \\dots \\times Cote_n)

Attention : si tu places un combiné avec des matchs de tennis et de foot, le principe est le même, tant qu'il s'agit de paris 1N2 simples.

---

Le principal danger (c'est fondamental)

Plus tu ajoutes de matchs, plus la probabilité de gagner s'effondre, même si tu prends des favoris.

Prenons un cas idéal : trois matchs où tu es très confiant, chacun avec une probabilité de succès estimée à 70 % (cote ~1.43).

· En simple, ce pronostic a 7 chances sur 10 de te faire gagner.
· Mais pour le triple, la probabilité que les trois événements arrivent en même temps est :
0.70 \\times 0.70 \\times 0.70 = 0.343


Soit 34,3 % de chances seulement. Tu as donc presque 2 risques sur 3 de perdre ton combiné, alors que chaque événement pris seul était "probable".

C'est ce qu'on appelle le « piège des combinés » : on a l'impression de maximiser le gain, mais on minimise énormément ses chances réelles.

---


2.1 Principe général

Un pari système consiste à choisir un ensemble de N matchs puis à jouer toutes les combinaisons possibles de K matchs parmi ces N.

· N = nombre total de matchs sur le ticket
· K = taille de chaque petite combinaison

Chaque « petite combinaison » devient un ticket indépendant. Ta mise totale sera donc :

Mise\\_totale = Mise\\_de\\_base \\times Nombre\\_de\\_combinaisons

Le nombre de combinaisons se calcule par la formule :

\\binom{N}{K} = \\frac{N!}{K!(N-K)!}

---

2.2 Les systèmes « standards » (notation X/Y)

Ce sont les systèmes les plus courants, que tu trouves chez tous les bookmakers.

Règle : Pour qu’un de ces systèmes rapporte quelque chose, il faut que au moins K matchs soient gagnants. Si tu en as plus, le gain augmente. Si tu en as moins que K, le ticket est perdu dans son ensemble.

Prenons l’exemple d’une mise de base de 1 € et de matchs avec ces cotes :

· Match 1 : 2.00
· Match 2 : 1.80
· Match 3 : 2.20
· Match 4 : 1.90
· Match 5 : 2.50

Je te mets tout dans un tableau clair.

Système Nombre de matchs (N) Nombre de paris (combinaisons) Mise totale (1 €/pari) Condition pour gagner Exemple si 3 matchs sur 4 sont bons (M1, M2, M3 gagnants)
2/3 3 3 doubles 3 € Au moins 2 bons 3 doubles gagnants : (2.00 × 1.80) + (2.00 × 2.20) + (1.80 × 2.20) = 3.60 + 4.40 + 3.96 = 11.96 €
3/4 4 4 triples 4 € Au moins 3 bons 1 triple gagnant seulement (celui avec les 3 bons) : 2.00 × 1.80 × 2.20 = 7.92 €
2/4 4 6 doubles 6 € Au moins 2 bons Les 3 bons donnent 3 doubles gagnants : (2.00×1.80)+(2.00×2.20)+(1.80×2.20) = 11.96 €
3/5 5 10 triples 10 € Au moins 3 bons Si 3 bons → 1 triple = 7.92 € Si 4 bons → 4 triples = env. 31 €
4/5 5 5 quadruples 5 € Au moins 4 bons Si 4 bons → 1 quadruple = 2.00×1.80×2.20×1.90 = 15.05 €
2/5 5 10 doubles 10 € Au moins 2 bons Si 3 bons → 3 doubles = 11.96 €
6/8 8 28 combinaisons de 6 28 € Au moins 6 bons Très rare à voir sauf en courses hippiques.

👉 Point important : Plus tu choisis un K petit par rapport à N, plus tu te couvres, mais plus le nombre de combinaisons explose. Par exemple, un 2/5 te couvre même avec seulement 2 bons matchs, mais te coûte 10 € pour une mise de base de 1 €, et le gain sera souvent modeste sauf si les cotes sont énormes.

---

2.3 Les systèmes « pleine couverture » (les noms spéciaux)

Ces systèmes jouent tous les genres de combinaisons possibles, du simple jusqu’au multiple maximal. Certains incluent les paris simples, d’autres non.

Ici, on parle généralement de N matchs et on joue toutes les combinaisons de tous les niveaux, parfois avec des noms déposés (Trixie, Yankee, Goliath…). Ce sont des systèmes très populaires au PMU et chez les turfistes, mais aussi disponibles pour le foot.

Je te rappelle les principaux avec leur composition :

Nom Nombre de matchs Détail des paris Total de paris Dont paris simples ?
Trixie 3 3 doubles + 1 triple 4 Non
Patent 3 3 simples + 3 doubles + 1 triple 7 Oui
Yankee 4 6 doubles + 4 triples + 1 quadruple 11 Non
Lucky 15 4 4 simples + 6 doubles + 4 triples + 1 quadruple 15 Oui
Canadian (Super Yankee) 5 10 doubles + 10 triples + 5 quadruples + 1 quintuple 26 Non
Lucky 31 5 5 simples + tous les multiples (2→5) 31 Oui
Heinz 6 Tous les multiples de 2 à 6 (sans simples) 57 Non
Lucky 63 6 Tous les multiples de 1 à 6 63 Oui
Super Heinz 7 Tous les multiples de 2 à 7 120 Non
Goliath 8 Tous les multiples de 2 à 8 247 Non

Exemple concret d’un Lucky 15

Tu choisis 4 matchs avec une mise de base de 1 €. Le ticket coûte 15 €.
Si un seul match passe, tu touches le gain du simple correspondant. Si 2 matchs passent, tu touches 2 simples + 1 double, etc. Ça permet de ne jamais repartir bredouille même avec une performance médiocre, mais ça coûte cher.

Calcul rapide du nombre de combinaisons pour un Yankee

Un Yankee (4 matchs) =

\\binom{4}{2} + \\binom{4}{3} + \\binom{4}{4} = 6 + 4 + 1 = 11 \\text{ paris}

---

2.4 Comment savoir si ça vaut le coup ?

Le tableau ci-dessous compare, pour 4 matchs avec la même cote de 2.00 chacun, ce que donnent un combiné classique et quelques systèmes, selon le nombre de matchs gagnants.

Nombre de bons pronostics Combiné quadruple (gain) Système 2/4 (gain) Système 3/4 (gain) Yankee (gain)
0 ou 1 0 € 0 € 0 € 0 € (pas de simples)
2 0 € 1 double : 2×2 = 4 € (mais ticket coûtait 6 € → perte) 0 € 1 double : 4 € (coût 11 € → perte)
3 0 € 3 doubles : 3×4 = 12 € (mise 6 €) 1 triple : 8 € (mise 4 €) 3 doubles + 1 triple = 12 + 8 = 20 € (mise 11 €)
4 16 € (mise 1 €) 6 doubles = 24 € (mise 6 €) 4 triples = 32 € (mise 4 €) 6 doubles + 4 triples + 1 quadruple = 24 + 32 + 16 = 72 € (mise 11 €)

👉 Ce qu’on voit :

· Le système rapporte moins que le combiné pur quand tout passe, mais il limite les dégâts ou assure un bénéfice quand un ou deux matchs coincent.
· Le Yankee, avec sa mise plus lourde, est plus intéressant si tu es très confiant sur 3 ou 4 matchs.

---

2.5 La mise de base et le coût réel

Quand tu construis un système, le bookmaker te demande toujours :

1. La mise par pari (par exemple 1 €)
2. Puis il calcule automatiquement la mise totale = 1 € × nombre de paris.

Il est impératif de toujours vérifier le coût total avant de valider. Un Lucky 31 à 1 € te coûte 31 €, même si tu avais l’impression de miser 1 € seulement.

---


3.1 Qu’est-ce qu’une base ?

Une base (parfois appelée "sélection clé" ou "banquier") est un match (ou plusieurs) que tu es absolument certain de voir gagner. Ce match est inclus dans toutes les combinaisons du pari système.

Conséquence immédiate :

· Si ta base est gagnante, le ticket vit encore (selon les autres résultats).
· Si ta base est perdante, tout le ticket est perdu, quel que soit le résultat des autres matchs.

C’est donc un moyen de réduire le nombre total de combinaisons (et donc la mise), mais en contrepartie, tu mets tous tes œufs dans le même panier pour ce match.

---

3.2 Fonctionnement

Imaginons que tu aies N matchs au total :

· B bases (matchs obligatoires)
· A autres matchs (ceux qui seront joués en système)

Le système va générer toutes les combinaisons qui contiennent obligatoirement toutes les bases, puis il va ajouter les autres matchs selon un système de ton choix (par ex. 2/4, 3/5, etc.).

Calcul du nombre de combinaisons :

Si tu choisis un système K/A (K parmi A), le nombre de combinaisons est simplement :

\\binom{A}{K}

Les B bases étant dans tous les tickets, chaque combinaison finale aura une taille : B + K.

---

3.3 Exemples concrets

Prenons les cotes suivantes pour illustrer :

· Base 1 : Cote 1.50 (énorme favori)
· Match A : 2.00
· Match B : 2.20
· Match C : 1.80
· Match D : 2.50

Exemple 1 : 1 base + système 2/4

· Total matchs : 5 (1 base + 4 autres)
· Système sur les 4 autres matchs : 2/4
· Nombre de combinaisons :
\\binom{4}{2} = 6
· Chaque combinaison contient la base + 2 matchs parmi les 4.

Combinaison Composition Cote de la combinaison
1 Base + A + B 1.50 × 2.00 × 2.20 = 6.60
2 Base + A + C 1.50 × 2.00 × 1.80 = 5.40
3 Base + A + D 1.50 × 2.00 × 2.50 = 7.50
4 Base + B + C 1.50 × 2.20 × 1.80 = 5.94
5 Base + B + D 1.50 × 2.20 × 2.50 = 8.25
6 Base + C + D 1.50 × 1.80 × 2.50 = 6.75

Mise totale = 6 × mise de base (ex. 1 € → 6 €).

Scénarios de gain :

· Si la base perd → 0 €.
· Si la base gagne + 2 autres matchs exactement → 1 combinaison gagnante.
· Si la base gagne + 3 autres matchs → 3 combinaisons gagnantes (celles contenant les 3 gagnants parmi A,B,C,D).
· Si les 5 matchs passent → 6 combinaisons gagnantes (jackpot).

---

Exemple 2 : 2 bases + système 2/3

· Total matchs : 5 (2 bases + 3 autres A, B, C)
· Système sur les 3 autres : 2/3
· Nombre de combinaisons :
\\binom{3}{2} = 3
· Chaque combinaison contient les 2 bases + 2 parmi les 3 autres.

Combinaisons : (Base1 + Base2 + A + B), (B1+B2+A+C), (B1+B2+B+C).

Mise totale = 3 × mise de base.

👉 Avec 2 bases, on réduit encore le coût par rapport à un système 4/5 classique, car on ne fait varier que 3 matchs. Mais la double dépendance rend le ticket très fragile.

---

Exemple 3 : 1 base + système 3/5 (plus ambitieux)

· 1 base + 5 autres
· Système 3/5 sur les 5 autres
· Nombre de combinaisons :
\\binom{5}{3} = 10
· Chaque ticket = base + triple parmi les 5

Mise totale = 10 × mise de base.

Conditions : La base + au moins 3 des 5 autres doivent être bons. Si la base passe et 4 autres passent, alors on gagne 4 triples (ceux qui contiennent les 4 en question). Si les 5 passent, on gagne les 10 triples.

---

3.4 Tableau récapitulatif du nombre de combinaisons

Pour t’aider à visualiser, voici le nombre de combinaisons pour différentes configurations.

Total matchs Bases Autres (A) Système sur les autres Nombre de combis Taille finale de chaque ticket
4 1 3 2/3 3 3 matchs (Base + 2)
5 1 4 2/4 6 3 matchs
5 1 4 3/4 4 4 matchs
5 2 3 1/3 3 3 matchs (Base1+Base2+1)
5 2 3 2/3 3 4 matchs (Bases + 2)
6 1 5 2/5 10 3 matchs
6 1 5 3/5 10 4 matchs
6 2 4 2/4 6 4 matchs
7 1 6 3/6 20 4 matchs
8 2 6 4/6 15 6 matchs

---

3.5 Avantages et risques

✅ Avantages ❌ Risques
Réduction du nombre de combinaisons (donc mise plus faible qu’un système complet). Si la base perd, tout est perdu. Aucun filet de sécurité.
Permet de construire un ticket autour d’un "coup sûr" sans exploser le budget. La confiance excessive dans une base est la première cause de perte.
Possibilité de mixer des matchs à forte cote en système, tout en sécurisant avec une base à faible cote. Une base à 1.15 ne rapporte quasiment rien, mais fait grimper le nombre de matchs par ticket sans augmenter le gain.

---

3.6 Conseils pratiques

1. Choisir une base solide : idéalement une cote entre 1.20 et 1.50, sur un match à domicile d’une grosse équipe en forme.
2. Ne mettre qu’une seule base si tu veux rester raisonnable. Deux bases, c’est très risqué.
3. Toujours vérifier le coût total : 1 base + 2/5, c’est 10 combinaisons. À 2 € l’unité, le ticket coûte 20 €, ce n’est pas anodin.
4. Utiliser la base pour diminuer le risque, pas pour le croire nul : le piège est de surcharger le ticket avec des matchs exotiques à forte cote en se reposant sur la base.


---

4.1 La double chance

Principe

La double chance permet de couvrir deux issues sur trois d’un match de foot (ou sport à trois résultats). Les trois possibilités :

· 1N : l’équipe à domicile gagne ou match nul (elle ne perd pas)
· N2 : match nul ou l’équipe à l’extérieur gagne
· 12 : une des deux équipes gagne (pas de match nul)

Calcul de la cote implicite d’une double chance

Si on connaît les cotes 1, N et 2, la cote juste (hors marge du bookmaker) se calcule ainsi :

Cote_{1N} = \\frac{1}{\\frac{1}{Cote_1} + \\frac{1}{Cote_N}} \\qquad
Cote_{N2} = \\frac{1}{\\frac{1}{Cote_N} + \\frac{1}{Cote_2}} \\qquad
Cote_{12} = \\frac{1}{\\frac{1}{Cote_1} + \\frac{1}{Cote_2}}

Exemples de cotes (match équilibré)

· Cote 1 = 2.40, N = 3.20, Cote 2 = 2.80
→ 1N ≈ 1.37, N2 ≈ 1.49, 12 ≈ 1.29

Impact dans un combiné

Remplacer un pari 1N2 par une double chance diminue la cote finale mais augmente fortement les chances de passer le match. C’est un outil de sécurisation.

Exemple concret
Tu fais un triple avec :

· Match A : 1N (cote 1.40)
· Match B : victoire de l’équipe B (cote 2.00)
· Match C : victoire de l’équipe C (cote 1.90)

Cote totale = 1.40 × 2.00 × 1.90 = 5.32, au lieu de 2.40 × 2.00 × 1.90 = 9.12 si tu avais joué le 1 sec au match A. Tu perds en potentiel, mais tu gagnes une énorme sécurité sur le match A.

---

4.2 Le handicap européen (3-way handicap)

Principe

Le handicap européen attribue un avantage ou désavantage virtuel d’un nombre entier de buts (+1, -1, -2, etc.). Contrairement au handicap asiatique, le match nul reste une issue à part entière et est payé comme tel.

Exemple : Handicap -1 sur l’équipe A.

· Si A gagne par 2 buts ou plus → pari gagnant.
· Si A gagne par 1 but → après handicap, c’est un match nul, donc pari perdant (sauf si tu as misé sur le N du handicap).
· Match nul réel ou défaite de A → pari perdant.

Les trois issues 1, N, 2 sont systématiquement proposées avec le handicap choisi.

Utilisation dans un combiné

Cela permet de booster la cote d’un favori. Par exemple :

· Cote simple de l’équipe A : 1.30
· Cote du handicap -1 (A gagne par ≥ 2 buts) : 1.95

Tu préfères un ticket avec la cote de 1.95 plutôt que 1.30, car cela multiplie mieux le gain global. Mais tu acceptes le risque qu’une victoire 1-0 ou 2-1 fasse perdre le combiné.

Exemple de combiné avec handicap européen

· Match 1 : Handicap -2 (équipe A gagne par ≥ 3 buts) → cote 2.80
· Match 2 : Double chance N2 → cote 1.60
· Match 3 : 1N2 classique → cote 2.10

Cote finale = 2.80 × 1.60 × 2.10 = 9.41. Un ticket agressif avec un handicap sévère.

---

4.3 Le handicap asiatique

Principe

Le handicap asiatique supprime le match nul en attribuant des fractions de but (0.5, 0.25, 0.75, 1.0…) et peut aboutir à des gains partiels ou des remboursements partiels (half win / half lose). C’est plus subtil à intégrer en combiné.

Les lignes les plus courantes :

Handicap asiatique Signification
0 (PK) Match nul = mise remboursée.
-0.5 L’équipe doit gagner (comme le 1 sec).
+0.5 L’équipe ne doit pas perdre (équivaut au 1N).
-1.0 Gagner par 2 buts ou plus → gain ; par 1 but → remboursement ; nul/défaite → perte.
-0.25 Split en -0 et -0.5. Victoire → gain ; nul → moitié remboursée, moitié perdue ; défaite → perte.
+0.25 Split en +0 et +0.5. Victoire → gain ; nul → moitié remboursée, moitié gagnée ; défaite → perte.

Dans un combiné

Les règles varient selon les bookmakers, mais généralement :

· Un half win (moitié gain, moitié remboursement) est pris en compte en réduisant la cote de ce match.
· Un half loss (moitié perte, moitié remboursement) peut faire perdre le combiné si trop de matchs sont perdus, ou modifier le gain.
· Un match remboursé (push) : le match est retiré du combiné, et la cote finale est recalculée sans lui.

Exemple :
Tu combines :

· Match 1 : Handicap asiatique -1.0 → cote 2.00
· Match 2 : Victoire simple → cote 1.80
Si le match 1 se solde par une victoire d’un but, il est remboursé (cote = 1.00). Le combiné devient un simple sur le match 2, donc cote finale = 1.80.

Si le match 1 était un -0.25 à 1.90 et qu’il y a match nul, tu as un « half loss » : une moitié de la mise est perdue, l’autre est remboursée. Dans un accumulé, cela peut entraîner la perte de la moitié de la mise totale ou un calcul complexe. Il vaut mieux éviter ces lignes dans les systèmes si on veut rester simple.

---

4.4 Construire un combiné tout en double chance ou tout en handicap

4.4.1 Le combiné « sécure » 100 % double chance

Tu prends plusieurs matchs en double chance (1N, N2 ou 12). La cote finale est faible mais les chances de gagner sont élevées.

Exemple :

· Match A : 1N @1.35
· Match B : 1N @1.45
· Match C : N2 @1.50
Cote = 1.35 × 1.45 × 1.50 ≈ 2.94.
Avec 10 €, gain possible = 29,40 €. On reste dans un rapport risque/gain modéré.

4.4.2 Le combiné « attaque » avec handicaps européens négatifs

Tu prends des favoris avec un handicap -1 ou -2, ce qui booste la cote mais rend chaque match plus difficile à passer. C’est un ticket « à sensations ».

Exemple :

· A (-1) @2.10
· B (-1) @2.30
· C (-2) @3.00
Cote = 2.10 × 2.30 × 3.00 ≈ 14.49. Gagner est difficile.

4.4.3 Le mix & match intelligent

La plupart des parieurs combinent :

· quelques matchs en double chance (ou handicap +0.5) pour sécuriser,
· un ou deux matchs en 1N2 classique,
· et éventuellement un handicap négatif sur un très gros favori.

Cela donne un ticket plus équilibré avec une cote intéressante et une probabilité de succès acceptable.

---

4.5 Tableau de synthèse : options et sécurité pour un match

Sur un match avec cotes standards : 1 = 2.50, N = 3.10, 2 = 2.90

Option de pari Issue(s) couverte(s) Cote approx. Niveau de sécurité
1 simple Domicile gagne 2.50 Moyen
N simple Nul 3.10 Faible
Double chance 1N Domicile ou nul 1.38 Très élevé
Double chance N2 Nul ou extérieur 1.50 Élevé
Double chance 12 Pas de match nul 1.34 Très élevé
Handicap -1 (Euro, 1) Domicile gagne par ≥ 2 buts ~3.50 Faible
Handicap +1 (Euro, 2) Visiteurs ne perdent pas par plus d’un but ~1.45 Élevé
Asiatique -0.5 Domicile gagne (idem 1) 2.50 Moyen
Asiatique 0 Domicile gagne, nul remboursé ~1.70 Élevé
Asiatique +0.5 Domicile ou nul (= 1N) 1.38 Très élevé

---

4.6 Ce qu’il faut retenir

1. Intégrer une double chance : c’est transformer un pari risqué en un pari quasi-certain, au prix d’une cote plus faible. Idéal si tu veux construire un combiné long sans trop de casse.
2. Utiliser un handicap européen : c’est l’inverse, tu augmentes la difficulté pour doper la cote. À réserver aux très gros écarts.
3. Handicap asiatique : offre des nuits de remboursement et de gain partiel. Peut être intéressant mais complexe en système. Le plus simple est d’utiliser les lignes -0.5, +0.5 ou 0.
4. On peut tout mélanger : un même ticket peut contenir du 1N2, du double chance et du handicap. La cote finale est toujours le produit des cotes individuelles (exception : half win / half lose en asiatique).
---

---

5.1 Le Cash Out

Principe

Le Cash Out te permet de clôturer un pari avant la fin de tous les matchs pour récupérer une partie, la totalité, ou parfois plus que ta mise. Le bookmaker te propose une somme en temps réel en fonction du déroulement des événements.

Il existe trois variantes principales.

5.1.1 Cash Out total

Tu revends le ticket entier. La somme proposée dépend de l’avancée des matchs et des probabilités restantes.

· Avant les matchs : souvent proche de ta mise (parfois un peu moins).
· Pendant les matchs : si tout se passe bien, l’offre augmente progressivement.
· À un match de la fin : si les premiers sont passés, l’offre peut être très proche du gain final (avec une petite décote).

Exemple :
Ticket combiné 4 matchs, cote totale 12.00, mise 10 € → gain potentiel 120 €.
Après 3 matchs gagnés, tous en ta faveur, le quatrième est le Real Madrid qui mène 2-0 à la 70e minute. Le bookmaker peut proposer un cash out à 105 € (gain quasi-assuré, mais décote liée au risque minime d’un retournement).

Stratégie : Prendre le cash out quand la somme proposée est supérieure à ta mise et que tu sens un risque sur le(s) dernier(s) match(s). C’est une forme de sécurisation.

5.1.2 Cash Out partiel

Tu peux retirer une partie du gain tout en laissant courir le reste sur le ticket. Par exemple :

· Mise 10 €.
· Cash out partiel proposé : retirer 25 € et laisser 5 € en jeu.
· Si la fin du ticket passe, tu touches le gain sur les 5 € restants ; si elle perd, tu as quand même les 25 €.

Cela permet de prendre des bénéfices sans tout abandonner.

5.1.3 Cash Out automatique (ou stop-loss / take-profit)

Tu demandes au système de vendre ton ticket automatiquement quand l’offre atteint :

· un certain montant (ex. « je prends dès que le cash out ≥ 2 fois ma mise ») ;
· ou un pourcentage du gain max (ex. 80 %).

Utile si tu ne veux pas surveiller les matchs en direct.

Attention : Le Cash Out n’est pas toujours disponible. Les bookmakers peuvent suspendre l’option lors d’actions dangereuses (coup franc, penalty), et ce n’est pas ajusté sur un fil : il y a une légère marge pour le bookmaker.

---

5.2 L’Acca Boost (ou combiné boosté)

Principe

Le bookmaker majore la cote finale de ton combiné si tu sélectionnes un certain nombre de matchs (et parfois sous conditions, comme un nombre minimal de sélections, une cote minimum par match).

Exemples classiques :

· « 5% de boost pour 4 sélections, 10% pour 5, 15% pour 6 ou plus. »
· « Boost de 20% sur tout combiné de la Ligue 1 ce week-end. »

Calcul

Si ta cote naturelle est de 8.00, avec un boost de 10 %, la nouvelle cote devient :

8.00 \\times 1.10 = 8.80

Ton gain augmente sans coût supplémentaire. C’est un pur avantage mathématique (même si cela reste à la faveur du bookmaker car ils sélectionnent les matchs ou périodes).

Stratégie : Tant que tu misais déjà sur ces matchs, c’est tout bénéfice. Ne force jamais un combiné juste pour le boost.

---

5.3 L’Acca Insurance (ou “filet de sécurité”) – Remboursement si un match fait perdre

Principe

C’est une assurance : si un seul match de ton combiné est perdant, le bookmaker te rembourse ta mise, souvent sous forme de paris gratuits, jusqu’à un certain montant (ex. 20 €). Certains le font pour deux matchs perdants aussi. Parfois appelé « Lucky Loser », « Acca Edge », ou « Combiné assuré ».

Conditions fréquentes :

· Minimum 5 sélections.
· Chaque sélection doit avoir une cote supérieure à 1.30 (ou 1.20).
· Remboursement en freebets, pas en cash direct.

Exemple :
Tu fais un combiné 6 matchs, mise 10 €. Tu en passes 5, un seul perd. Si l’offre est active, tu récupères un freebet de 10 €. Sans l’assurance, tu avais 0 €.

Limite : On ne peut pas enchaîner les paris gratuits à l’infini, et les conditions varient. C’est une sécurité très appréciée sur les combinés longs.

---

5.4 Le Bet Builder (ou Same Game Multi) – Le combiné sur un seul match

Principe

Il permet de combiner plusieurs paris issus du même événement en un seul ticket, avec une cote dédiée. Exemple sur un match de foot :

· Résultat du match (1N2)
· Nombre de buts total (plus de 2.5)
· Buteur (Mbappé marque)
· Nombre de corners (plus de 9.5)

Le Bet Builder calcule une cote spécifique (pas simplement le produit des cotes individuelles, car beaucoup d’issues sont corrélées). Tu obtiens un ticket unique.

Utilisation dans un combiné plus large : Certains bookmakers te permettent d’inclure un Bet Builder comme un match à part entière dans un combiné classique. La cote du Bet Builder devient alors un multiplicateur parmi d’autres.

Exemple : Tu crées un Bet Builder sur PSG-OM avec une cote de 4.50, puis tu le regroupes avec deux autres matchs classiques (2.00 et 1.80). La cote finale = 4.50 × 2.00 × 1.80 = 16.20.

Avantages : Gain potentiel énorme, tout en restant sur un match que tu connais très bien.

Risques : Très volatil. Un carton rouge, un penalty raté, une égalisation tardive peuvent ruiner plusieurs éléments à la fois.

---

5.5 L’Edit Bet (ou “Modifier le pari”)

Principe

Certains opérateurs proposent, avant le début des matchs ou parfois en direct, de modifier un ticket déjà validé. Tu peux :

· Ajouter un match à ton combiné.
· Retirer un match (s’il n’a pas commencé).
· Changer un pronostic (ex. transformer un 1 en 1N).

La contrepartie : la cote est immédiatement recalculée. L’interface te montre le nouveau gain potentiel. C’est surtout utile quand un joueur clé se blesse à l’échauffement ou que tu veux profiter d’une cote modifiée.

---

5.6 Les Early Payouts (paiements anticipés)

Certains bookmakers règlent un match comme gagné avant la fin sous certaines conditions.

· Si une équipe mène de 2 buts : le pari « victoire de cette équipe » est immédiatement payé, même si le match se termine par un nul (rare en foot, mais ça peut arriver).
· Si un joueur choisit marque : ta sélection buteur est gagnante dès qu’il marque, même si le match n’est pas terminé.

Cela peut rendre ton ticket gagnant plus tôt, ou du moins valider une partie du combiné avant que tout le reste ne soit fini.

---

5.7 Tableau de synthèse

Option Effet Moment Gain modifié ?
Cash Out total Vente du ticket entier En direct Oui, immédiat
Cash Out partiel Une partie sécurisée, le reste court En direct Oui, partiel
Acca Boost Cote finale majorée Avant le match Cote boostée → gain plus élevé
Acca Insurance Remboursement si 1 (ou 2) match(s) perdu(s) Après le dernier match Mise remboursée en freebet
Bet Builder Plusieurs paris sur le même match en un seul Avant / pendant Cote spécifique, souvent plus forte que le produit
Edit Bet Modification du ticket en cours de vie Avant / parfois pendant Nouvelle cote recalculée
Early Payout Règlement anticipé du match Dès la condition atteinte Sélection validée immédiatement dans le combiné

---

5.8 Conseils pour utiliser ces options intelligemment

1. Cash Out : Utilise-le quand l’offre est > 70-80 % du gain potentiel et que la fin du ticket est très incertaine.
2. Boost : Profites-en, mais ne monte pas un combiné avec des matchs que tu n’aurais pas misés uniquement pour le pourcentage bonus.
3. Assurance : Intéressante pour les combinés à 5+ matchs, car elle transforme une perte en freebet. Vérifie toujours les conditions (cote min, nombre de sélections).
4. Bet Builder : Idéal pour un match que tu analyses en profondeur. Le corréler dans un grand combiné augmente encore le risque, à manier avec une petite mise.
5. Edit Bet : Une fonction sous-utilisée mais parfaite pour sauver un ticket quand un facteur imprévu survient.

---
Entendu. Je vais maintenant te fournir la liste la plus exhaustive possible de tout ce qui peut être qualifié de « pari à multiples chances » (ou « multichance ») dans l’univers des paris sportifs, c’est-à-dire tout ticket qui offre plusieurs chemins vers un gain, que ce soit en couvrant plusieurs résultats d’un même match ou en jouant plusieurs combinaisons sur plusieurs matchs.

---

1. Les paris « doubles issues » sur un seul match

Ces paris augmentent tes chances en couvrant deux résultats sur trois (football) ou en incluant le match nul comme refuge.

Type Signification Chances couvertes
1N L'équipe 1 gagne ou match nul L'équipe 1 ne perd pas
N2 Match nul ou l'équipe 2 gagne L'équipe 2 ne perd pas
12 L'équipe 1 ou l'équipe 2 gagne Aucun match nul

👉 On peut les combiner avec d’autres matchs dans un ticket (cote réduite).

---

2. Les handicaps asiatiques (remboursement partiel ou total)

Ils offrent une chance de remboursement voire de gain partiel en cas de résultat limite.

Ligne Effet si match nul Effet si victoire par 1 but d’écart
0 (PK) Remboursement total Gain si ton équipe gagne
-0.25 Moitié perdue, moitié remboursée Gain intégral si victoire
+0.25 Moitié gagnée, moitié remboursée Gain intégral si victoire
-0.75 Gain intégral si victoire par ≥2 buts ; si par 1 but : moitié gagnée, moitié remboursée Gain partiel en cas de petite victoire
-1.0 Perte si nul/défaite ; remboursement si victoire par exactement 1 but Remboursement

👉 Ces handicaps multiplient les situations de gain partiel et donc les « chances » de ne pas repartir les mains vides.

---

3. Les paris doubles sur un même match (non combinés avec d’autres matchs)

Certains paris consistent à réunir plusieurs conditions sur le même événement. Tu as plusieurs chances de voir une partie de ton pari payée, ou un gain boosté.

· Mi-temps / Fin de match (ex : 1/1, X/2, etc.) : deux pronostics liés.
· Résultat + les deux équipes marquent (ex : 1 & Oui).
· Buteur + résultat : plusieurs événements corrélés.
· Bet Builder (Same Game Multi) : tu combines plusieurs paris du même match ; tu as une « chance » unique mais sur une construction multi-critères, souvent plus risquée.

Ce n’est pas une « multichance » au sens de plusieurs issues séparées mais une multi-condition.

---

4. Les paris système (multi combinaisons sur plusieurs matchs)

C’est le cœur des paris « multi chances » : un ticket génère des dizaines de petites combinaisons et il suffit qu’une partie de tes pronostics passe pour être payé.

4.1 Les systèmes classiques (X/Y)

Tu choisis N matchs, et tu joues toutes les combinaisons de K matchs parmi N.
→ Plusieurs tickets dans un seul.

Système Signification Combien de bons matchs minimum pour gagner
2/3 3 matchs → tous les doubles 2
2/4 4 matchs → tous les doubles 2
3/4 4 matchs → tous les triples 3
2/5 5 matchs → tous les doubles 2
3/5 5 matchs → tous les triples 3
4/5 5 matchs → tous les quadruples 4
3/6, 4/7, 5/8… Etc. K minimum

4.2 Les systèmes « pleine couverture »

Ce sont des systèmes qui jouent toutes les combinaisons possibles d’un ensemble de matchs. Certains incluent les paris simples, d’autres non.

Nom Matchs Détail (paris joués) Nb total de paris Avec simples ?
Trixie 3 3 doubles + 1 triple 4 Non
Patent 3 3 simples + 3 doubles + 1 triple 7 Oui
Yankee 4 6 doubles + 4 triples + 1 quadruple 11 Non
Lucky 15 4 4 simples + 6 doubles + 4 triples + 1 quadruple 15 Oui
Canadian (Super Yankee) 5 Doubles, triples, quadruples, quintuple (sans simples) 26 Non
Lucky 31 5 Tous les multiples du simple au quintuple 31 Oui
Heinz 6 Tous les multiples de 2 à 6 57 Non
Lucky 63 6 Tous les multiples de 1 à 6 63 Oui
Super Heinz 7 Tous les multiples de 2 à 7 120 Non
Goliath 8 Tous les multiples de 2 à 8 247 Non

Avec ces systèmes, si tu mets 1 € par pari, un Lucky 15 coûte 15 €. Si 1 seul match passe, tu touches le simple correspondant. Si 2 passent, tu touches 2 simples + 1 double, etc. C’est la définition même du « multi chance ».

---

5. Les paris avec « base »

Tu désignes un ou plusieurs matchs obligatoires, et les autres sont joués en système.

· 1 base + 2/4 → 6 combinaisons (des triples base + 2 autres)
· 2 bases + 2/3 → 3 combinaisons (des quadruples bases + 2 autres)

La base réduit le coût et donne plusieurs chemins de gain tant que la base passe. C’est un hybride sécurité / chance multiple.

---

6. Les paris « permutations » et « multi » (hippisme et dérivés)

À l’origine conçus pour les courses hippiques, on les retrouve parfois adaptés à d’autres sports.

6.1 Les paris « Multi » (PMU / turf)

Tu sélectionnes plusieurs chevaux dans une même course, et tu les combines pour qu’ils occupent les premières places, sans ordre.

· Multi en 4 : tu choisis 4 chevaux ou plus. Gagnant si 4 d’entre eux sont à l’arrivée (dans n’importe quel ordre). Plus tu mets de chevaux, plus le nombre de combinaisons augmente, mais plus ta « chance » est grande.
· Multi en 5, en 6, en 7 : même principe pour des champs plus grands.

6.2 Les permutations buteurs / scores en football

Certains sites proposent des paris comme :

· Multibuteurs : tu sélectionnes plusieurs joueurs et tu paries que X d’entre eux marqueront (ex : 3 parmi 5). Cela fonctionne comme un système.
· Multi Score : tu choisis plusieurs scores exacts pour un même match ; chacun constitue un ticket séparé dans le système.

---

7. Les paris each-way (gagnant/placé)

Surtout en sports individuels (golf, tennis, F1) et en hippisme.
Tu mises une somme divisée en deux :

· 50 % sur la victoire (gagnant)
· 50 % sur une place (dans le top 3, top 5…)

Si ton joueur/cheval ne gagne pas mais termine placé, tu touches la partie « placé » à une cote réduite. Cela te donne deux chances (gagnant ou placé) avec une mise unique.

---

8. L’assurance combiné (Acca Insurance)

Ce n’est pas un type de pari, mais une option qui crée une chance de remboursement. Si ton combiné échoue à cause d’un seul match, le bookmaker te rembourse ta mise (en freebet).
C’est une « chance » supplémentaire de récupérer quelque chose.

---

Tableau récapitulatif : où se trouvent les « chances multiples » ?

Type de pari Multi chance grâce à… Exemple
Double chance Deux issues couvertes 1N au lieu de 1
Handicap asiatique (0, -0.25) Remboursement si nul Pari remboursé au lieu de perdu
Système 2/4 Plusieurs combinaisons, seules 2 justes suffisent 6 doubles, gain si 2 bons
Trixie, Yankee, Lucky Pleine couverture, inclut les simples Yankee = 11 combinaisons
Base + système Base obligatoire, système sur les autres 1 base + 2/4 → 6 triples
Multi (turf) Chevaux à l’arrivée dans le désordre Multi en 4 avec 5 chevaux = 5 combinaisons
Each-way Partie placée payée Gagnant/placé au golf
Acca Insurance Remboursement si 1 erreur Ticket 5 matchs avec 1 perdant remboursé

------

1. Double chance (1N, N2, 12)

C'est la base des paris multichances sur un match.

Type Parier sur... Signification
1N Domicile ou Nul L'équipe à domicile ne perd pas.
N2 Nul ou Extérieur L'équipe à l'extérieur ne perd pas.
12 Domicile ou Extérieur Il n'y a pas match nul. Une des deux équipes gagne.

Exemple : PSG (1) - Real Madrid (2).
Tu penses que le Real ne perdra pas, mais sans certitude qu'il gagne → tu joues N2.
Si score final = 1-1 ou 0-2, tu gagnes. Si le PSG gagne, tu perds.

---

2. Résultat à la mi-temps / Résultat à la fin du match (MT/FT)

Il faut deviner le résultat à la mi-temps ET le résultat à la fin du match. Neuf combinaisons possibles : 1/1, 1/N, 1/2, N/1, N/N, N/2, 2/1, 2/N, 2/2.

Exemple :

· Tu joues Mi-temps : Nul / Fin : 1 (N/1).
→ À la pause, les équipes sont à égalité. En seconde période, l'équipe à domicile marque et gagne.
· Tu joues Mi-temps : 1 / Fin : 1 (1/1).
→ L'équipe à domicile mène déjà à la pause et gagne le match.

Cotes typiques pour un match équilibré :

Pari Cote approximative
1/1 3.50
N/1 4.50
2/2 5.00
N/N 4.00
1/N 13.00
1/2 (renversement) 23.00

---

3. Résultat de chaque mi-temps (Half Time / Full Time séparé)

On peut aussi parier sur le vainqueur de la 1ère mi-temps seule ou le vainqueur de la 2nde mi-temps seule, sans lien direct. Ce ne sont pas des paris multichances en soi, mais on peut les combiner.

Exemple :

· 1ère mi-temps : Nul (cote 2.10)
· 2nde mi-temps : Domicile gagne (cote 2.80)
En les combinant, ta cote est de 2.10 × 2.80 = 5.88.
Si les deux conditions sont réunies, tu gagnes.

---

4. Résultat final ET les deux équipes marquent (Résultat & Both Teams To Score)

Ici, on combine deux conditions dans le même match :

· Le résultat final (1, N ou 2)
· Les deux équipes marquent-elles ? (Oui / Non)

Cela donne 6 combinaisons possibles.

Exemple :

· 1 & Oui : Domicile gagne ET les deux équipes marquent. Score probable : 2-1, 3-1, etc.
· 2 & Oui : Extérieur gagne ET les deux équipes marquent. Score probable : 1-2, 2-3, etc.
· N & Oui : Match nul avec buts des deux côtés. Score probable : 1-1, 2-2, etc.
· 1 & Non : Domicile gagne sans encaisser de but. Score probable : 1-0, 2-0, etc.
· 2 & Non : Extérieur gagne sans encaisser. Score probable : 0-1, 0-2.
· N & Non : 0-0.

Cotes typiques :

· 1 & Oui : 3.20
· 1 & Non : 4.00
· N & Oui : 4.75
· N & Non : 7.50 (le 0-0)
· 2 & Oui : 4.50

---

5. Tous ces paris combinés dans un même ticket (Bet Builder)

Tu peux tout regrouper dans un même match via un outil "Bet Builder" (ou "Same Game Multi").
Exemple avec Lyon - Marseille :

Pari Sélection Cote
Double chance 1N (Lyon ne perd pas) 1.40
Mi-temps / Fin de match Nul / Lyon (N/1) 4.30
Les deux équipes marquent Oui 1.70
Cote combinée 1.40 × 4.30 × 1.70 = 10.23

👉 Ce ticket combine une double chance (1N) + un pronostic sur le scénario du match (N/1) + une condition de buts.

---

En bref :

· Double chance = deux résultats sur trois → sécurité.
· Mi-temps / Fin de match = un résultat à la pause ET un à la fin → scénario, cote élevée.
· Résultat + Les deux équipes marquent = deux conditions simples combinées sur le même match.
· Résultat de chaque mi-temps = on parle sur un vainqueur par période.


---

1. Buteur multichance (le principe)

Le pari "Buteur" simple répond à la question : "Le joueur X va-t-il marquer à n'importe quel moment du match ?" → Oui / Non.

La multichance appliquée aux buteurs consiste à sélectionner plusieurs joueurs et à parier qu'au moins un, deux, ou X d'entre eux marqueront dans le match, ou qu'ils occuperont certaines positions dans l'ordre des buts.

C'est l'équivalent d'un système ou d'une couverture appliqué aux buteurs.

---

2. But et buteur (Résultat ET buteur)

C'est le croisement de deux conditions :

· Le résultat du match (1, N, 2)
· Un joueur spécifique marque (Oui)

Exemple : PSG gagne (1) ET Mbappé buteur.
→ Si Mbappé marque mais que le PSG fait match nul → ticket perdu.

---

3. Duos et trios de buteurs (Multibuteurs / Combo Buteur)

Tu choisis deux joueurs (duo) ou trois joueurs (trio), et tu paries que TOUS marqueront dans le match. Ce n'est pas un pari multichance "ou", c'est un ET strict.

Exemple Duo : Mbappé ET Kane marquent. Cote combinée ~ 1.90 × 2.10 = 4.00.

Exemple Trio : Mbappé, Kane, Lewandowski marquent. Cote combinée ~ 8.00 à 12.00.

Variante true multichance : Certains opérateurs proposent "Au moins X parmi Y buteurs marquent". Exemple : sélectionner 4 joueurs, parier qu'au moins 2 d'entre eux marquent. Cela active un système (comme un 2/4, mais sur les buteurs).

---

4. Buteur et passeur (Scoreur et Assistant)

Pari sur un match : "Le joueur A marque ET le joueur B délivre une passe décisive".

Exemple : Mbappé buteur ET Neymar passeur décisif.
Si Mbappé marque sur un centre de Neymar, ticket gagnant. Cote généralement élevée car corrélation parfaite exigée (ex: > 10.00).

Parfois proposé comme "Combo Joueurs" : un seul joueur qui marque ET fait une passe dans le même match. (Ex: Messi buteur et passeur dans le match → cote ~ 6.00 à 8.00).

---

5. Buteurs et résultats (Wincast / Résultat + Buteur)

Équivalent du point 2, mais parfois le terme Wincast est utilisé pour :

· Le vainqueur du match (1 ou 2, pas le nul)
· ET un buteur désigné.

Exemple Wincast : Real Madrid gagne ET Vinícius marque. Cote = cote_Real × cote_but_Vini (avec légère corrélation).

Certains bookmakers proposent aussi "Résultat exact + Buteur", ce qui est extrêmement précis et risqué, mais avec une cote énorme (ex: 3-1 + buteur X → 40.00).

---

6. Buteur et mi-temps (Buteur en 1ère / 2ème mi-temps)

Pari : "Le joueur X marque pendant la 1ère mi-temps" ou "marque pendant la 2nde mi-temps".

· Cote plus élevée que "Buteur à tout moment" car la fenêtre est plus courte.
· On peut combiner : "Joueur X marque en 1ère MT et en 2nde MT" → s'il marque deux fois, c'est un doublé.

Exemple : Mbappé marque en 1ère mi-temps @2.75.

---

7. Buteur par période (15 minutes, tranches exactes)

Le match est découpé en périodes de 15 minutes (+ arrêts de jeu).

· 1ère période (0:00 - 14:59)
· 2ème période (15:00 - 29:59)
· 3ème période (30:00 - Mi-temps)
· 4ème période (46:00 - 59:59)
· 5ème période (60:00 - 74:59)
· 6ème période (75:00 - 90:00+)

Tu peux parier sur "Joueur X marque pendant la période Y".
C'est un pari extrêmement précis, donc la cote est très haute (souvent > 6.00 même pour un grand buteur).

Exemple : Mbappé marque entre la 15e et la 29e minute → cote 7.00.

---

8. Buteur et type de buts

Tu paries sur la manière dont le joueur va marquer :

· Du pied droit
· Du pied gauche
· De la tête
· Sur coup franc direct
· Sur penalty
· De l'extérieur de la surface
· Coup du chapeau (marquer 3 buts dans le match)

On peut PARFOIS combiner : "Joueur X marque de la tête ET du pied droit" pour un doublé spécifique, mais c'est très rare.

Exemple : Cristiano Ronaldo marque de la tête @3.50.
Mbappé marque sur penalty @4.00.

---

9. Premier et dernier buteur (First / Last Goalscorer)

Les paris classiques du type "buteur" concernant l'ordre :

· Premier buteur : Qui marque le 1er but du match ? Si le joueur marque en second mais que son but est le premier du match, il gagne.
· Dernier buteur : Qui marque le dernier but du match ?
· Buteur à tout moment (Anytime) : plus facile, cote plus basse.

Règle importante : Si le joueur choisi n'entre pas en jeu, le pari est remboursé. S'il entre après le 1er but, il peut encore être "dernier buteur" mais plus "premier buteur" (le pari est perdant pour premier buteur).

Variante multichance :

· Demander Premier OU Dernier buteur. Certains books proposent ce pari qui couvre les deux extrémités.
· "Joueur X marque en premier, et son équipe gagne" (First Goalscorer + Win).

---

10. Parier sur les buteurs d'une liste (Multibuteur / Sélection)

C'est un pari système appliqué aux buteurs.

Tu sélectionnes 5 joueurs, et tu choisis le système :

· 1 parmi 5 : Au moins 1 de ces 5 joueurs marque (5 combinaisons, gain si un seul buteur trouvé).
· 2 parmi 5 : Au moins 2 de ces 5 joueurs marquent (10 combinaisons).
· 3 parmi 5 : Au moins 3 buteurs différents marquent (10 combinaisons).

Chaque combinaison est un petit pari indépendant, comme un système de foot classique, mais avec des joueurs.

Exemple concret (système 1/3) :
3 joueurs : Mbappé (@1.90), Haaland (@2.10), Lewandowski (@2.00).
Système 1/3 → 3 paris simples.
Mise de base 10 € par pari = 30 €.
Si seul Mbappé marque, gain = 10 € × 1.90 = 19 € (perte de 11 €).
Si Mbappé et Haaland marquent, gain = 19 + 21 = 40 € (bénéfice de 10 €).

---

Tableau de synthèse multichance buteurs

Type de pari Conditions Type de chance
Buteur simple Un joueur marque Une chance
Multibuteur 1/N Au moins 1 parmi N buteurs marque N chances
Multibuteur 2/N Au moins 2 parmi N buteurs marquent Combinaisons de 2
Duo / Trio Les X joueurs marquent TOUS ET strict
Wincast Vainqueur + buteur désigné Cote boostée
Buteur + Passeur Joueur A marque, Joueur B passe ET strict
Buteur + Mi-temps Buteur en 1ère ou 2nde MT Fenêtre réduite
Buteur par période Buteur dans une tranche de 15 min Très spécifique
Type de but Pied, tête, coup franc, penalty Très spécifique
Premier / Dernier buteur Buteur ouvrant ou clôturant le score Ordre exact

---

1. Les deux équipes marquent (BTTS – Both Teams To Score)

C'est le pari le plus simple de cette famille. Il répond à la question : "Les deux équipes vont-elles marquer au moins un but chacune ?"

· Oui : il faut que chaque équipe inscrive au minimum un but (ex. 1-1, 2-1, 3-2…).
· Non : il suffit qu'une des deux équipes ne marque pas (ex. 1-0, 0-0, 2-0…).

Certains bookmakers le déclinent en :

· Les deux équipes marquent en 1ère mi-temps (BTTS 1st Half).
· Les deux équipes marquent en 2nde mi-temps (BTTS 2nd Half).
· Les deux équipes marquent + Résultat : par exemple BTTS Oui & victoire du domicile (1 & Oui).
· Les deux équipes marquent + Over/Under : par exemple BTTS Oui & +2.5 buts → cote boostée car les deux conditions sont corrélées.

---

2. But par équipe (Team Goals)

On ne regarde qu'une seule équipe. On parle sur le nombre exact de buts qu'elle va marquer (ou une fourchette).

2.1 Over / Under par équipe

· Plus de 0.5 but → l'équipe marque au moins un but.
· Plus de 1.5 buts → au moins deux buts (doublé).
· Plus de 2.5 buts → au moins trois buts.
· Moins de 0.5 but → l'équipe ne marque pas (équivaut à "l'adversaire garde sa cage inviolée").

2.2 Nombre exact de buts

· Marque exactement 1 but
· Marque exactement 2 buts
· Marque 3 buts ou plus

2.3 Tranche de buts

· De 1 à 3 buts, plus de 4 buts, etc.

2.4 Mi-temps par équipe

Combinaison possible : "Équipe A marque en 1ère mi-temps", "Équipe A marque dans les deux mi-temps", "Équipe B marque en 2nde mi-temps uniquement".

2.5 Clean Sheet (pas de but encaissé)

C'est l'équivalent de "Moins de 0.5 but pour l'adversaire". Exemple : "PSG ne prend pas de but" est identique à "Adversaire - de 0.5 but".

Cotes typiques (ex. équipe favorite à domicile) :

· +0.5 but @1.25
· +1.5 buts @2.10
· +2.5 buts @4.50
· Exactement 1 but @2.75
· Exactement 2 buts @3.50

---

3. But par mi-temps (Half Goals)

On s'intéresse à la production de buts dans une période de 45 minutes (1ère mi-temps ou 2ème mi-temps).

3.1 Over/Under par mi-temps

· 1ère mi-temps +0.5 but : y aura-t-il au moins un but avant la pause ?
· 1ère mi-temps +1.5 buts : au moins deux buts en première période.
· 2ème mi-temps +0.5 but, +1.5, +2.5, etc.

3.2 Score exact à la mi-temps

On parle sur le nombre exact de buts dans la mi-temps (pas le score des équipes). Par exemple :

· Exactement 0 but en 1ère MT
· Exactement 1 but en 1ère MT
· Exactement 2 buts en 1ère MT

3.3 Mi-temps la plus prolifique

On compare les deux mi-temps :

· 1ère mi-temps > 2ème mi-temps (plus de buts avant la pause)
· 2ème mi-temps > 1ère mi-temps
· Égalité en nombre de buts

3.4 Exemple de combinaison

"Plus de 0.5 but en 1ère MT ET plus de 2.5 buts dans le match" → ticket logique car si la 1ère MT comporte déjà un but, le +2.5 au total est plus probable.

---

4. But par période (15-minute intervals)

Le match est découpé en six périodes de 15 minutes (les arrêts de jeu sont inclus dans la dernière période de chaque mi-temps, sauf précision du bookmaker) :

Période Temps de jeu
1ère 0:00 – 14:59
2ème 15:00 – 29:59
3ème 30:00 – 45:00+
4ème 46:00 – 59:59
5ème 60:00 – 74:59
6ème 75:00 – 90:00+

4.1 Les paris proposés

· Il y aura un but dans la période X (Over 0.5).
· Nombre exact de buts dans la période (0, 1, 2, 3+).
· Plus de 1.5 buts dans la période X.
· Équipe qui marque dans la période X (parfois proposé sous forme de buteur, sinon "Équipe A marque dans la période 2").
· Quelle période contiendra le plus de buts ? → pari "Période avec le plus de buts".
· But dans les 10 premières minutes (variante 0:00 – 9:59).

4.2 Exemples de cotes (match assez ouvert)

· But entre 0:00 et 14:59 : @2.50
· But entre 75:00 et 90:00 : @2.00
· Plus de 1.5 buts dans la 2ème période : @5.00
· Aucun but dans la 1ère période : @3.00

4.3 Stratégie

Ces paris sont très volatils et très dépendants du scénario du match. On peut les utiliser pour couvrir un over/under classique : par exemple, si tu as joué +2.5 buts, un but rapide dans la 1ère période augmente fortement tes chances, et tu peux parfois encaisser un cash out avantageux.

---

Tableau récapitulatif

Catégorie Question principale Paris dérivés
Deux équipes marquent Les deux équipes marquent-elles ? BTTS Oui/Non, BTTS & Résultat, BTTS & Over/Under, BTTS en 1ère/2ème MT
But par équipe Combien de buts marque une équipe précise ? Over/Under par équipe, nombre exact, clean sheet, marque ou non, marque dans les deux mi-temps
But par mi-temps Combien de buts dans une mi-temps ? Over/Under par mi-temps, score exact de la mi-temps, comparaison des deux mi-temps
But par période Dans quelle(s) tranche(s) de 15 minutes le(s) but(s) sera(ont) marqué(s) ? Over 0.5 par période, nombre exact de buts par période, 1er but avant X minutes, période la plus riche en buts

---
---

1. But sur penalty

1.1 Le pari simple « Un penalty sera marqué »

Tu paries sur le fait qu’au moins un penalty sera transformé pendant le match (qu’il soit sifflé pour l’équipe A ou B).
Ce n’est pas un pari sur le tireur, mais sur l’événement lui-même.

· Oui : il faut qu’un penalty soit accordé ET réussi.
· Non : aucun penalty sifflé, ou penalty raté/arrêté.

👉 Cote souvent élevée (ex : 4.00 à 6.00), car les penalties ne sont pas systématiques.

1.2 « Un penalty sera sifflé » (sans obligation de réussite)

Certains sites distinguent :

· Penalty accordé : oui/non (même si raté).
· Penalty marqué : oui/non.

La cote est plus faible pour « penalty accordé » que pour « marqué ».

1.3 Pari sur le tireur

Tu peux désigner un joueur précis et parier qu’il marquera un penalty (ou qu’il en tentera un).
Exemple : « Mbappé marque un penalty » → gagnant si Mbappé transforme un penalty pendant le match. Pas gagnant s’il marque dans le jeu.

1.4 « Premier but sur penalty », « Dernier but sur penalty »

Pari rare : le premier but du match est-il un penalty ?

· Oui : le 1-0 est inscrit sur penalty.
· Non : toute autre configuration.

---

2. But de la tête

2.1 Le pari « Un but de la tête sera marqué »

Tu paries sur le fait qu’au moins un but du match sera inscrit de la tête.
Le type de but est déterminé par le dernier contact avant la ligne.

· Oui : au moins un but de la tête (même contre son camp de la tête).
· Non : aucun but de la tête dans le match.

Cote généralement un peu inférieure à celle du penalty, car les buts de la tête sont plus fréquents (cotes autour de 2.50 à 3.50 selon les équipes).

2.2 « Nombre de buts de la tête »

· Exactement 1 but de la tête, 2 buts de la tête, etc.
· Over 1.5 buts de la tête (rare).

2.3 Buteur précis qui marque de la tête

Tu combines un joueur + type de but. Exemple : « Giroud marque de la tête ».
Très risqué, cote élevée.

2.4 Autres variantes liées à la tête

· Équipe X marque de la tête : une équipe spécifique marque d’une tête.
· Les deux équipes marquent de la tête (BTTS Header) : rarissime, cote énorme.
· Le 1er but du match est marqué de la tête.

---

3. Combinaisons multichances autour du type de but

Là où ça devient intéressant, c’est quand tu utilises ces types de buts comme des briques dans un combiné ou un système.

3.1 Combiné type de but + résultat

· « L’équipe A gagne ET il y a un but de la tête »
· « Match nul ET penalty marqué »
→ Cotes boostées grâce à la corrélation.

3.2 Buteur + type de but

· « Kane marque ET son but est de la tête »
· « Benzema marque sur penalty »

3.3 Système multitype de buts

Certains opérateurs proposent un pari « Type de but du match » avec plusieurs cases :

· Coche « penalty » et « tête » → tu gagnes si au moins un des deux se produit.
· Ou tu dois avoir les deux pour gagner (ET strict).

Tu peux aussi créer un système maison : tu sélectionnes 3 matchs, et pour chaque match tu prends « penalty marqué oui ». Tu les joues en 2/3.
Exemple :

· Match 1 : penalty oui @4.50
· Match 2 : penalty oui @5.00
· Match 3 : penalty oui @4.80
Système 2/3 : 3 combinaisons de 2 matchs. Si 2 penalties sur les 3 se produisent, tu gagnes.

---

4. Points d’attention (règles bookmakers)

4.1 Penalty

· Un but sur penalty n’est pas un but « dans le jeu ». Si tu as parié « but dans le jeu » pour un joueur, il ne compte pas s’il marque sur penalty (sauf mention contraire).
· Si le penalty est d’abord arrêté puis repris par un coéquipier, le but n’est pas un penalty (c’est un but en jeu).
· Un CSC direct sur penalty (tir sur le poteau puis contre le gardien) peut être compté comme penalty selon le règlement du book.

4.2 Tête

· Le but est validé « de la tête » si le dernier contact du ballon avant de franchir la ligne est la tête (ou l’épaule, parfois considérée comme tête). La poitrine ne compte généralement pas.
· Un but contre son camp de la tête compte comme but de la tête dans la plupart des offres.

---

5. Tableau récapitulatif

Type de but Exemple de pari Cote indicative Multichance possible ?
Penalty (accordé) Penalty sifflé dans le match 3.50 – 5.00 Oui, combinable avec résultat
Penalty (marqué) Penalty transformé dans le match 4.00 – 6.00 Oui, système multitype
Tête Au moins 1 but de la tête 2.50 – 3.50 Oui, avec buteur ou résultat
Buteur + penalty Désigné marque sur penalty 6.00 – 12.00 Peu de marge, mais cote haute
Buteur + tête Désigné marque de la tête 5.00 – 10.00 Intéressant pour attaquants aériens


---

1. But sur penalty

1.1 Le pari simple « Un penalty sera marqué »

Tu paries sur le fait qu’au moins un penalty sera transformé pendant le match (qu’il soit sifflé pour l’équipe A ou B).
Ce n’est pas un pari sur le tireur, mais sur l’événement lui-même.

· Oui : il faut qu’un penalty soit accordé ET réussi.
· Non : aucun penalty sifflé, ou penalty raté/arrêté.

👉 Cote souvent élevée (ex : 4.00 à 6.00), car les penalties ne sont pas systématiques.

1.2 « Un penalty sera sifflé » (sans obligation de réussite)

Certains sites distinguent :

· Penalty accordé : oui/non (même si raté).
· Penalty marqué : oui/non.

La cote est plus faible pour « penalty accordé » que pour « marqué ».

1.3 Pari sur le tireur

Tu peux désigner un joueur précis et parier qu’il marquera un penalty (ou qu’il en tentera un).
Exemple : « Mbappé marque un penalty » → gagnant si Mbappé transforme un penalty pendant le match. Pas gagnant s’il marque dans le jeu.

1.4 « Premier but sur penalty », « Dernier but sur penalty »

Pari rare : le premier but du match est-il un penalty ?

· Oui : le 1-0 est inscrit sur penalty.
· Non : toute autre configuration.

---

2. But de la tête

2.1 Le pari « Un but de la tête sera marqué »

Tu paries sur le fait qu’au moins un but du match sera inscrit de la tête.
Le type de but est déterminé par le dernier contact avant la ligne.

· Oui : au moins un but de la tête (même contre son camp de la tête).
· Non : aucun but de la tête dans le match.

Cote généralement un peu inférieure à celle du penalty, car les buts de la tête sont plus fréquents (cotes autour de 2.50 à 3.50 selon les équipes).

2.2 « Nombre de buts de la tête »

· Exactement 1 but de la tête, 2 buts de la tête, etc.
· Over 1.5 buts de la tête (rare).

2.3 Buteur précis qui marque de la tête

Tu combines un joueur + type de but. Exemple : « Giroud marque de la tête ».
Très risqué, cote élevée.

2.4 Autres variantes liées à la tête

· Équipe X marque de la tête : une équipe spécifique marque d’une tête.
· Les deux équipes marquent de la tête (BTTS Header) : rarissime, cote énorme.
· Le 1er but du match est marqué de la tête.

---

3. Combinaisons multichances autour du type de but

Là où ça devient intéressant, c’est quand tu utilises ces types de buts comme des briques dans un combiné ou un système.

3.1 Combiné type de but + résultat

· « L’équipe A gagne ET il y a un but de la tête »
· « Match nul ET penalty marqué »
→ Cotes boostées grâce à la corrélation.

3.2 Buteur + type de but

· « Kane marque ET son but est de la tête »
· « Benzema marque sur penalty »

3.3 Système multitype de buts

Certains opérateurs proposent un pari « Type de but du match » avec plusieurs cases :

· Coche « penalty » et « tête » → tu gagnes si au moins un des deux se produit.
· Ou tu dois avoir les deux pour gagner (ET strict).

Tu peux aussi créer un système maison : tu sélectionnes 3 matchs, et pour chaque match tu prends « penalty marqué oui ». Tu les joues en 2/3.
Exemple :

· Match 1 : penalty oui @4.50
· Match 2 : penalty oui @5.00
· Match 3 : penalty oui @4.80
Système 2/3 : 3 combinaisons de 2 matchs. Si 2 penalties sur les 3 se produisent, tu gagnes.

---

4. Points d’attention (règles bookmakers)

4.1 Penalty

· Un but sur penalty n’est pas un but « dans le jeu ». Si tu as parié « but dans le jeu » pour un joueur, il ne compte pas s’il marque sur penalty (sauf mention contraire).
· Si le penalty est d’abord arrêté puis repris par un coéquipier, le but n’est pas un penalty (c’est un but en jeu).
· Un CSC direct sur penalty (tir sur le poteau puis contre le gardien) peut être compté comme penalty selon le règlement du book.

4.2 Tête

· Le but est validé « de la tête » si le dernier contact du ballon avant de franchir la ligne est la tête (ou l’épaule, parfois considérée comme tête). La poitrine ne compte généralement pas.
· Un but contre son camp de la tête compte comme but de la tête dans la plupart des offres.

---

5. Tableau récapitulatif

Type de but Exemple de pari Cote indicative Multichance possible ?
Penalty (accordé) Penalty sifflé dans le match 3.50 – 5.00 Oui, combinable avec résultat
Penalty (marqué) Penalty transformé dans le match 4.00 – 6.00 Oui, système multitype
Tête Au moins 1 but de la tête 2.50 – 3.50 Oui, avec buteur ou résultat
Buteur + penalty Désigné marque sur penalty 6.00 – 12.00 Peu de marge, mais cote haute
Buteur + tête Désigné marque de la tête 5.00 – 10.00 Intéressant pour attaquants aériens

---
---
Je vais maintenant te détailler une nouvelle famille : les paris basés sur les statistiques individuelles et collectives autres que les buts. Ces marchés ont explosé ces dernières années et permettent de construire des combinés très variés.

Voici l’analyse exhaustive des paris Tirs, Tirs cadrés et Passes décisives.

---

1. Les paris sur les Tirs (Shots)

1.1 Par équipe (Team Total Shots)

· Over / Under X tirs : exemple "Plus de 12.5 tirs pour l'équipe A" ou "Moins de 10.5 tirs".
· Nombre exact de tirs : groupes (10-12, 13-15, 16+).

Cotes typiques :

· Over 10.5 tirs pour un favori offensif : @1.60
· Over 15.5 tirs : @2.80

1.2 Par joueur (Player Shots)

· Over/Under 0.5, 1.5, 2.5 tirs... : le joueur va-t-il tenter au moins 1, 2, 3 frappes ?
· Nombre exact de tirs : 1, 2, 3, 4+ tirs.

Exemples pour un attaquant titulaire :

· Over 0.5 tir : @1.15 (quasi-certitude, un attaquant tire presque toujours au moins une fois)
· Over 1.5 tirs : @1.70
· Over 2.5 tirs : @2.80
· Over 3.5 tirs : @5.00

Pour un défenseur central, l'over 1.5 tirs peut avoir une cote énorme (@10.00+).

---

2. Les paris sur les Tirs cadrés (Shots on Target)

Un tir cadré est une frappe qui oblige le gardien à une parade, OU un but (car le ballon a fini dans le cadre). Les tirs sur le poteau/barre ne comptent pas comme cadrés, sauf si touchés par le gardien avant.

2.1 Par équipe (Team Shots on Target)

· Over/Under X tirs cadrés : 2.5, 3.5, 4.5, 5.5...
· Combinaison classique : "Plus de 4.5 tirs cadrés pour l'équipe A ET l'équipe A gagne".

Cotes typiques :

· Plus de 3.5 tirs cadrés pour une équipe moyenne : @1.80
· Plus de 6.5 tirs cadrés pour Manchester City : @2.40

2.2 Par joueur (Player Shots on Target)

Le grand classique : la frappe cadrée de l'attaquant.

· Over 0.5 tir cadré : le joueur cadre-t-il au moins une fois ? (Cote ~1.40 pour un bon buteur)
· Over 1.5 tirs cadrés : (@2.50 - 3.00)
· Over 2.5 tirs cadrés : (@6.00 - 10.00)

2.3 Le pari spécifique "Un tir cadré dans le match ?"

Sur certains matchs très fermés, parier "Moins de 1.5 tirs cadrés pour l'équipe B" est un marché prisé (@1.50 par exemple).

---

3. Les paris sur les Passes décisives (Assists)

Définition stricte : Une passe décisive est le dernier ballon touché par un coéquipier avant que le buteur ne marque, sans qu'un défenseur adverse ne dévie significativement la trajectoire. Les règles exactes (déviation, centre contré) varient légèrement selon le fournisseur de données (Opta est la référence la plus stricte).

3.1 Par joueur (Player Assist)

· Joueur X fait une passe décisive (Over 0.5 assist) : Oui/Non. Cote typique pour un milieu créatif : @2.50 à 4.00. Pour un latéral offensif : @4.00 à 6.00.
· Nombre de passes décisives : 1, 2, 3+ passes. Extrêmement rare.

3.2 Par équipe (souvent lié aux buts)

Peu de marchés "total de passes décisives d'équipe" car le nombre de buts remplace cette stat. Mais on peut trouver :

· "Plus de 1.5 passes décisives pour l'équipe" (très risqué).

---

4. Paris combinant Tirs, Tirs cadrés et Passes décisives

Ces stats s'intègrent dans des "Bet Builders" pour créer des combinaisons multichances.

4.1 Combo Joueur (Player Bet Builder)

Tu prends UN joueur et tu cumules ses stats :

· Mbappé : Over 1.5 tirs + Over 0.5 tir cadré + Over 0.5 passe décisive (ou but, pour éviter la double condition passe).
· Exemple : "Mbappé a 3 tirs, 1 cadré, et 1 but" → cote combinée 4.50.
· Le combo classique est "Tir cadré + But" ou "Tir cadré + Passe décisive".

4.2 Combo Match

· "Plus de 3.5 tirs cadrés pour l'équipe A + Plus de 2.5 buts dans le match" : logique et corrélé.
· "Joueur A fait une passe dé + Joueur B a 2 tirs cadrés" : parfait sur un duo d'attaque (ex: Neymar passe, Mbappé tire).

4.3 Systèmes multi-joueurs sur les tirs cadrés

Tu prends 5 joueurs de champ, tu paries qu'au moins 3 d'entre eux cadreront un tir. Cela fonctionne comme un système 3/5. Chaque joueur est un "match".

Exemple concret :
Joueurs : A (@1.50), B (@1.60), C (@1.80), D (@2.20), E (@2.00).
Système "Au moins 3 cadrent" : coût = 10 combinaisons × mise = 10 € pour 1 €/combi.
Si 3 cadrent, tu gagnes les combinaisons correspondantes.

---

5. Autres stats courantes souvent mélangées

Pour enrichir tes multichances, sache qu'on trouve aussi :

· Corners (par équipe, par joueur)
· Fautes (par joueur/équipe)
· Hors-jeu
· Arrêts du gardien (Saves)
· Duels gagnés, plaquages

Elles se combinent toutes avec les tirs, tirs cadrés et passes décisives dans un Bet Builder.

---

6. Tableau récapitulatif

Stat Par équipe ? Par joueur ? Intervalle typique (Over)
Tirs Total équipe : 8-20+ Joueur : 0.5, 1.5, 2.5, 3.5, 4.5 Over 1.5 tir @1.70
Tirs cadrés Total équipe : 2-8+ Joueur : 0.5, 1.5, 2.5 Over 0.5 cadré @1.40
Passes décisives Rare (lié aux buts) Joueur : 1 ou plus (@2.50-6.00) Over 0.5 passe dé @3.00

---

---

1. Les paris sur les Corners

Un corner est accordé quand le ballon franchit la ligne de but, touché en dernier par un défenseur, sans qu’un but soit marqué. Les bookmakers se basent sur les données officielles (Opta, StatsPerform). Un corner est comptabilisé même s’il n’est pas tiré physiquement, du moment qu’il est sifflé (sauf règle contraire du book).

1.1 Total des corners (Over/Under)

Le classique : nombre total de corners dans le match.

· Over 8.5 corners : @1.80 – @2.00 (match ouvert).
· Over 10.5 corners : @2.50 – @3.00.
· Under 6.5 corners : @2.20 (match fermé).
· Nombre exact : 8-10, 11-13, etc.

1.2 Corners par équipe

· Équipe A : Over 4.5 corners : @1.70 si elle domine largement.
· Équipe B : Under 3.5 corners : @1.80 pour une équipe faible offensivement.
· Corners exacts pour une équipe : 3, 4, 5+.

1.3 Handicap corners (européen ou asiatique)

· Handicap -2 corners pour l’équipe A : elle doit obtenir au moins 3 corners de plus que B pour que le pari -2 passe.
· Handicap asiatique +1.5 corners pour B : si B obtient 2 corners et A 5, après handicap : A 5 – 1.5 = 3.5 vs B 2 → défaite. L’asiatique permet le remboursement partiel sur certaines lignes (comme +0.5, aucun remboursement).

1.4 Pari sur le premier / dernier corner

· Qui obtiendra le 1er corner du match ? (équipe A ou B).
· Dernier corner du match (pari risqué, cote autour de 1.85/1.85 si match équilibré).
· Heure du 1er corner : avant la 6e minute, pas de corner dans les 10 premières minutes, etc.

1.5 Corners par mi-temps

· 1ère mi-temps Over 4.5 corners : @2.00.
· 2ème mi-temps plus de corners que la 1ère : @2.10.
· Mi-temps avec le plus de corners : choix entre 1ère, 2ème, égalité.

1.6 Parlay corners & buts

· "Match avec plus de 2.5 buts ET plus de 9.5 corners" (combo devenu classique).
· "Les deux équipes marquent ET plus de 8.5 corners".

---

2. Les paris sur les Cartons

Ici on suit les cartons jaunes et rouges. Le barème habituel :

· Carton jaune = 1 point
· Carton rouge direct = 2 points (ou parfois 3, selon le book)
· Deuxième jaune qui vaut rouge = 1 point pour le jaune + 2 pour le rouge, total 3 points dans certains systèmes, ou simplement carton rouge compté comme 2 points quand il est direct, et un second jaune non compté séparément. L'important est de vérifier la règle du bookmaker.

2.1 Total des cartons dans le match

· Over 3.5 cartons (jaunes + rouges) : @1.70 – @1.90.
· Over 4.5 cartons : @2.30.
· Over 5.5 cartons : @3.50+.
· Moins de 2.5 cartons (match calme) : @2.40.

2.2 Cartons par équipe

· Équipe A Over 1.5 cartons : @1.65.
· Équipe B en dessous de 0.5 carton (0 jaune/rouge).

2.3 Pari sur le carton rouge

· Carton rouge : Oui / Non (cote pour Oui : 3.00 - 4.50 selon l’intensité attendue).
· Moment du 1er carton rouge, voire "pas de carton rouge" (Oui est risqué, Non est souvent @1.15).

2.4 Types de carton

· Nombre exact de jaunes : 2, 3, 4, 5+.
· Combien de joueurs recevront un jaune (au moins 1 jaune). Souvent proposé par joueur (voir ci-dessous).

2.5 Par joueur (Player Card)

· Le joueur X reçoit un carton jaune : @2.50 – @4.00.
· Le joueur Y reçoit un carton rouge : @15.00 – @25.00.
· Système multijoueurs : tu sélectionnes 4 défenseurs agressifs, tu fais un système "au moins 1 sera averti" (1/4) ou "au moins 2" (2/4).

2.6 Combo classique

· "Plus de 2.5 cartons ET les deux équipes marquent" : utile sur un match électrique.
· "Équipe A gagne ET équipe A plus de 1.5 cartons" (victoire avec discipline limite).

---

3. Combiner Corners et Cartons : multichances & systèmes

Les marchés corners et cartons sont parfaits pour créer des systèmes puisque chaque ligne est indépendante et a une cote assez élevée.

3.1 Ticket Corners multi-matchs (système 2/3)

Prenons 3 matchs avec des over corners :

· Match 1 : +8.5 corners @1.85
· Match 2 : +9.5 corners @2.10
· Match 3 : +7.5 corners @1.70

Système 2/3 (3 doubles) : mise 1 €/combi → 3 €. Il faut 2 bons paris sur 3 pour récupérer une partie ou tout. Si deux matchs finissent avec beaucoup de corners, gain.

3.2 Ticket mixte Corners & Cartons

· Match 1 : +8.5 corners @2.00
· Match 2 : +3.5 cartons @1.80
· Match 3 : Équipe A +4.5 corners @1.75

Combiné à 3 matchs : 2.00 × 1.80 × 1.75 = 6.30. On peut le sécuriser en système 2/3 → 3 combinaisons de 2.

3.3 Système multijoueurs cartons ET corners

Exemple sur un seul match :

· Joueur A (défenseur rugueux) : averti @2.50
· Joueur B (ailier provocateur) : averti @3.00
· Corners total +9.5 @2.20

Ces trois sélections dans un Bet Builder → cote combinée autour de 16.00 si elles sont liées. Pas système, mais ticket unique.

Pour une vraie multichance, tu fais un "1 parmi 3" sur ces trois pronos : 3 paris simples, mise 10 € chacun. Si 1 seul passe, tu limites la perte.

---

4. Tableau récapitulatif

Marché Types de paris principaux Exemple de cote
Corners Total match, par équipe, handicap, 1er/dernier, mi-temps, over/under exact +8.5 @1.85
Cartons Total match, par équipe, jaune/rouge, joueur averti, moments +3.5 cartons @1.75
Corners & Cartons mix Combo dans un match (Bet Builder) +8.5 corners & +3.5 cartons @3.50
Systèmes Corners 2/3 over corners, 2/4 corners équipe Variable
Systèmes Cartons 2/3 over cartons, joueur averti 1/4 Variable


---

1. Les paris Long Terme / Outright (ou "Futures")

Ces paris ne portent pas sur un match unique, mais sur le résultat final d’une compétition, ou une performance sur la durée.

1.1 Types d’Outright

Catégorie Exemples
Vainqueur de la compétition Vainqueur de la Ligue 1, de la Ligue des Champions, de l’Euro, de la Coupe du Monde…
Top 4 / Top 6 / Relégation Se qualifier pour la LDC, être relégué en Ligue 2.
Meilleur buteur (Golden Boot) Meilleur buteur du championnat, de la Coupe du Monde.
Meilleur passeur Meilleur passeur de la saison.
Joueur de l’année (Ballon d’Or, MVP) Vainqueur du Ballon d’Or, meilleur joueur de la compétition.
Promotion / Relégation Équipe promue en fin de saison.
Nombre de points / de victoires Total de points d’une équipe en saison régulière.
Spécial saison Le champion sera invaincu, une équipe perd tous ses matchs, etc.

1.2 Cotes et échéances

Les cotes sont fixées longtemps à l’avance et évoluent en fonction des résultats et des transferts.
Exemple :

· PSG vainqueur de Ligue 1 en août : @1.40
· Meilleur buteur : Mbappé @2.50 en début de saison.

Le gain n’est versé qu’à l’issue de la compétition (parfois un cash out est disponible).

1.3 Multichance sur les Outright

On peut parfaitement combiner plusieurs outright dans un système pour multiplier les chances.

· 2/3 vainqueurs de championnat : par exemple, prendre le Barça en Liga, le Bayern en Bundesliga, et le Napoli en Serie A, joués en système 2/3 (3 doubles). Si deux sont champions, le ticket gagne.
· 1/3 meilleur buteur : tu sélectionnes 3 prétendants, système 1/3 (3 paris simples). Tu limites la perte si seul un des trois est sacré.
· Combiné vainqueur LDC + vainqueur PL : plus risqué mais cote énorme.

1.4 Intérêt des Outright

· Permet de miser tôt sur une opinion forte avec une grosse cote.
· Pas besoin d’analyser chaque match.
· Peut être sécurisé via des paris en direct (trading sportif).

---

2. Les paris spéciaux : TV, Poteau, VAR

Ces marchés sont souvent proposés pour les grands matchs télévisés et pour les compétitions majeures.

2.1 Paris "TV"

Ces paris sont directement liés à la diffusion télévisuelle et aux éléments visibles à l’écran.

Type de pari Description Exemple de cote
Quel diffuseur aura interviewé l'entraîneur en premier ? À la mi-temps ou après le match. Canal+ / beIN / autre @1.80
Un joueur sera interviewé à chaud au bord terrain ? Oui / Non Oui @2.20
L’arbitre portera un micro visible Oui / Non Rare
Un drone ou une caméra araignée sera montré à l’antenne Oui / Non Oui @1.50
Plan sur un joueur célèbre blessé en tribune Oui / Non Oui @2.50

Ces paris restent anecdotiques mais peuvent être amusants en combinaison.

2.2 Paris "Poteau / Barre transversale"

Un marché très prisé : "Y aura-t-il un tir sur le poteau ou la barre transversale ?"

· Oui : un tir heurte le montant (même si ça rentre, même si c’est un tir contré qui finit sur le poteau, selon les règles).
· Non : aucun montant touché.

Exemples de cotes :

· Oui : @2.40 – 3.00
· Non : @1.40 – 1.50

Variantes :

· Tir sur le poteau d’une équipe spécifique (ex : Équipe A frappe un montant).
· Le ballon touche le poteau et rentre (poteau rentrant) : @5.00.
· Touche le poteau et n’entre pas (poteau sortant) : @4.00.
· Nombre de tirs sur les montants (over/under 0.5, 1.5).

2.3 Paris "VAR"

Avec la VAR, les paris se sont multipliés :

Type de pari Description Cote typique
La VAR sera utilisée dans le match Oui / Non Oui @2.50
Un penalty sera accordé après VAR Oui / Non Oui @4.50
Un but sera refusé après VAR Oui / Non Oui @3.50
Un carton rouge sera donné après VAR Oui / Non Oui @6.00
Combien de fois l’arbitre ira consulter l’écran ? Over/Under 1.5 consultations Over @3.50

Ces paris sont souvent associés aux matchs à fort enjeu (derbys, phases finales).

---

3. Combinaisons multichances avec ces paris spéciaux

3.1 Ticket "match à polémiques"

Un combiné typé « faits de match » :

· Carton rouge : Oui (@3.50)
· Penalty après VAR : Oui (@4.50)
· Tir sur le poteau : Oui (@2.80)

Cote totale : 3.50 × 4.50 × 2.80 ≈ 44.00.
On peut le jouer en système 2/3 (3 doubles) pour survivre à une erreur.
Si les trois arrivent, jackpot. Si seulement deux, une combinaison est gagnante (par ex. carton rouge + poteau = 3.50 × 2.80 = 9.80).

3.2 Outright + spécial TV

Exemple pour la finale de la LDC :

· Vainqueur (outright) : Real Madrid @2.10
· Il y aura un tir sur le poteau : Oui @2.60
· La VAR annulera un but : Non @1.60

Ticket combiné : 2.10 × 2.60 × 1.60 = 8.74. On peut ajouter une assurance « acca insurance » si un seul fait défaut.

3.3 Système multi-outrights

Sur 4 championnats, tu sélectionnes le favori pour le titre. Tu joues le système 3/4 (4 triples). Si 3 sur 4 sont champions, tu gagnes.
Coût : 4 combinaisons × mise.

---

4. Tableau récapitulatif

Famille Types Multichance possible
Outright Vainqueur compétition, meilleur buteur, top 4, Ballon d’Or Système 1/3, 2/3, outrights croisés
Paris TV Interview, caméra, micro arbitre Amusant, combinable en Bet Builder
Poteau / Barre Montant touché oui/non, poteau rentrant/sortant, nombre de montants Oui, en simple ou combo
VAR Intervention oui/non, but refusé, penalty après VAR, consultation écran Système 2/3 sur plusieurs matchs ou combo "match à scandale"
`;

export const FOOTBALL_KNOWLEDGE_VERSION = "2026-04-pro";

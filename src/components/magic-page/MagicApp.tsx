import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Toaster, toast } from "sonner";
import { Cpu, Check, Sparkles } from "lucide-react";
import type {
  CalendarMatch,
  HistoryItem,
  Match,
  Prediction,
} from "@/types/magic";
import { invokeFn } from "@/lib/api";
import { repairedInvoke } from "@/lib/auto-repair";
import { translateBetOption, translateBetType } from "@/lib/bet-fr";

const HISTORY_KEY = "magic.history.v1";

import { TabBar, type TabKey } from "@/components/magic/TabBar";
import { PageTurner } from "@/components/magic/PageTurner";
import { SettingsView } from "@/components/magic/SettingsView";
import { MagicHero } from "@/components/magic/MagicHero";
import { MatchInput } from "@/components/magic/MatchInput";
import { StakeAndAnalyze } from "@/components/magic/StakeAndAnalyze";
import { StatsPanel } from "@/components/magic/StatsPanel";
import { AnalysisCards } from "@/components/magic/AnalysisCards";
import { ActionFooter } from "@/components/magic/ActionFooter";
import { WinamaxMatchCalendar } from "@/components/magic/WinamaxMatchCalendar";
import { Top20Combo } from "@/components/magic/Top20Combo";
import { VoiceCoach } from "@/components/magic/VoiceCoach";
import { HistoryView } from "@/components/magic/HistoryView";
import { TicketsView } from "@/components/magic/TicketsView";
import { HoloLogo } from "@/components/magic/HoloLogo";
import ballPng from "@/assets/ball.png";
import { useTicketAutoResolve } from "@/hooks/useTicketAutoResolve";
import { useTicketAlerts } from "@/hooks/useTicketAlerts";
import { detectMotivation } from "@/lib/motivation";
import { agentBus } from "@/lib/agent-bus";
import {
  getExtraKeys,
  resolveAndVerify,
  updateExtraKey,
  isSeededKey,
} from "@/lib/extra-api-keys";
import { getUserApiKeys } from "@/lib/user-api-keys";
import { syncGeminiKeys } from "@/lib/gemini-core";
import { restorePersistentKeys, installPersistenceMirror } from "@/lib/persistent-storage";
import { emitKeysUpdated } from "@/lib/keys-events";
import {
  LockScreen,
  isUnlockedNow,
  UNLOCK_STORAGE_KEY,
} from "@/components/magic/LockScreen";
import {
  OnboardingScreen,
  loadUserProfile,
  type UserProfile,
} from "@/components/magic/OnboardingScreen";

const STAKE_KEY = "magic.defaultStake";

const MagicApp = () => {
  const [tab, setTab] = useState<TabKey>("dashboard");
  // SSR-safe : on démarre identique côté serveur (locked=true, profile=null)
  // puis on hydrate depuis localStorage côté client après mount.
  const [locked, setLocked] = useState<boolean>(true);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  useEffect(() => {
    // 1) Installe le miroir IndexedDB pour les clés critiques (Gemini, etc.)
    //    et restaure depuis IDB ce que Safari/ITP aurait pu purger.
    installPersistenceMirror();
    void restorePersistentKeys().then(({ restored }) => {
      if (restored.length) {
        // Resync Gemini après restauration éventuelle
        try { syncGeminiKeys(); } catch { /* noop */ }
      }
      setProfile(loadUserProfile());
      setLocked(!isUnlockedNow());
    });
  }, []);

  const handleLock = () => {
    try {
      localStorage.removeItem(UNLOCK_STORAGE_KEY);
    } catch {
      /* noop */
    }
    setLocked(true);
    toast.info("Application verrouillée");
  };
  const [showSettings, setShowSettings] = useState(false);
  const [matches, setMatches] = useState<Match[]>([]);
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [stake, setStake] = useState<number>(10);
  // Hydrate la mise par défaut depuis localStorage côté client uniquement
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STAKE_KEY);
      if (raw) {
        const n = Number(raw);
        if (Number.isFinite(n) && n > 0) setStake(n);
      }
    } catch {
      /* noop */
    }
  }, []);

  // Auto-détection au boot : re-vérifie toutes les clés stockées (présentes + futures).
  // Le provider gagnant est re-promu dans le bon slot (Calendrier/Top20).
  useEffect(() => {
    // Synchronise la clé Gemini saisie dans Réglages avec cotes-engine
    // (et inversement). Tous les modules utilisent ensuite la même clé.
    syncGeminiKeys();
    let cancelled = false;
    (async () => {
      // Détection auto des clés foot stockées localement avant le scan habituel
      try {
        const { autoDiscoverKeys } = await import("@/lib/auto-discover-keys");
        await autoDiscoverKeys(false);
      } catch {
        /* noop */
      }
      if (cancelled) return;
      const list = getExtraKeys();
      let changed = false;
      const seededPresent = list.some((entry) => isSeededKey(entry.key));
      for (const entry of list) {
        if (cancelled) return;
        if (entry.enabled === false) continue;
        // Les clés "seed" sont déjà attribuées au bon provider — on ne les
        // re-teste pas (certains endpoints comme football-data.org bloquent
        // en CORS depuis le navigateur, ce qui causerait un faux négatif).
        if (isSeededKey(entry.key)) continue;
        try {
          const r = await resolveAndVerify(entry.key);
          if (cancelled) return;
          if (r.result.valid) {
            updateExtraKey(entry.id, {
              provider: r.provider,
              label: (await import("@/lib/extra-api-keys")).EXTRA_PROVIDERS[
                r.provider
              ].label,
              valid: true,
              message: r.result.message,
            });
            changed = true;
          }
        } catch {
          /* noop */
        }
      }
      const userKeys = getUserApiKeys();
      const coreKeysReady = Boolean(
        userKeys.odds && userKeys.apiSports && userKeys.gemini,
      );
      if (changed || seededPresent || coreKeysReady)
        emitKeysUpdated({ action: "save-all" });
    })();
    return () => {
      cancelled = true;
    };
  }, []);
  // Persiste la mise à chaque changement → permanente entre les démarrages
  useEffect(() => {
    try {
      localStorage.setItem(STAKE_KEY, String(stake));
    } catch {
      /* noop */
    }
  }, [stake]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [actionFlash, setActionFlash] = useState<{
    id: number;
    label: string;
  } | null>(null);
  const flashAction = (label: string) => {
    setActionFlash({ id: Date.now(), label });
    window.setTimeout(() => setActionFlash(null), 1400);
  };
  const [history, setHistory] = useState<HistoryItem[]>(() => {
    try {
      const raw = localStorage.getItem(HISTORY_KEY);
      return raw ? (JSON.parse(raw) as HistoryItem[]) : [];
    } catch {
      return [];
    }
  });

  // Persist history to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
    } catch {
      /* noop */
    }
  }, [history]);

  const clearAnalysis = () => {
    setMatches([]);
    setPredictions([]);
    toast.success("Liste d'analyse effacée");
    flashAction("Liste effacée");
  };

  const addMatch = (
    a: string,
    b: string,
    details?: {
      a?: string;
      b?: string;
      date?: string;
      time?: string;
      league?: string;
      country?: string;
      countryCode?: string;
      utcDate?: string;
      realOdds?: CalendarMatch["realOdds"];
    },
  ) => {
    if (matches.length >= 20) {
      toast.warning("Limite de 20 matchs");
      return;
    }
    setMatches((p) => [
      ...p,
      {
        id: crypto.randomUUID(),
        teamA: a,
        teamB: b,
        teamALogo: details?.a,
        teamBLogo: details?.b,
        date: details?.date,
        time: details?.time,
        league: details?.league,
        country: details?.country,
        countryCode: details?.countryCode,
        utcDate: details?.utcDate,
        realOdds: details?.realOdds,
      },
    ]);
    flashAction(`+ ${a} vs ${b}`);
  };

  const removeMatch = (id: string) => {
    setMatches((p) => p.filter((m) => m.id !== id));
    setPredictions((p) => p.filter((x) => x.matchId !== id));
  };

  const handleMagicMode = async () => {
    try {
      // Mode Magique branché directement sur la même source que le module Match
      // (Winamax) → 100% serveur, aucune clé API utilisateur requise.
      const { fetchWinamaxFootball } = await import("@/server-api/winamax");
      const payload = await fetchWinamaxFootball();
      const winaMatches = payload?.matches ?? [];
      const calendar: CalendarMatch[] = winaMatches
        .filter((m) => m.status !== "finished")
        .map((m) => {
          const d = new Date(m.matchStart);
          const fmt = new Intl.DateTimeFormat("fr-FR", {
            timeZone: "Europe/Paris",
            year: "numeric", month: "2-digit", day: "2-digit",
            hour: "2-digit", minute: "2-digit", hour12: false,
          }).formatToParts(d);
          const get = (t: string) => fmt.find((p) => p.type === t)?.value ?? "";
          const date = `${get("year")}-${get("month")}-${get("day")}`;
          const time = `${get("hour")}:${get("minute")}`;
          return {
            id: `wina:${m.id}`,
            teamA: m.homeTeam,
            teamB: m.awayTeam,
            teamALogo: m.homeLogo ?? m.homeJersey ?? undefined,
            teamBLogo: m.awayLogo ?? m.awayJersey ?? undefined,
            date,
            time,
            league: m.tournament || m.category || "Football",
            country: m.category,
            utcDate: new Date(m.matchStart).toISOString(),
            realOdds: {
              home: m.odds.home ?? undefined,
              draw: m.odds.draw ?? undefined,
              away: m.odds.away ?? undefined,
              bookmaker: "Winamax",
              bookmakers: ["Winamax"],
              commenceTimeUTC: new Date(m.matchStart).toISOString(),
            },
          } as CalendarMatch;
        });
      if (calendar.length === 0) {
        toast.warning("Aucun match disponible");
        return;
      }
      // Magic décide : on prend les matchs des prochaines 36h en heure FR.
      const todayParis = new Date().toLocaleDateString("fr-CA", {
        timeZone: "Europe/Paris",
      });
      const tomorrow = new Date(Date.now() + 24 * 3600_000).toLocaleDateString(
        "fr-CA",
        {
          timeZone: "Europe/Paris",
        },
      );
      let pool = calendar.filter(
        (m) => m.date === todayParis || m.date === tomorrow,
      );
      if (pool.length === 0) pool = calendar;

      /**
       * Magic decision engine :
       *  - score = priorité aux matchs avec cotes réelles (+50)
       *  - meilleure value sur le favori dont la cote est entre 1.45 et 2.30
       *  - écarte les matchs trop serrés (favori > 2.85)
       */
      // Cotes réelles non requises : Magic analyse aussi sans clé The Odds API.
      const scored = pool.map((m) => {
        const o = m.realOdds;
        let score = 0;
        if (o) {
          score += 50;
          const minOdds = Math.min(o.home ?? 99, o.draw ?? 99, o.away ?? 99);
          if (minOdds >= 1.45 && minOdds <= 2.3) score += 40;
          if (minOdds > 2.85) score -= 30;
          // implied prob > 55% → favorit clair
          const maxImplied = Math.max(
            o.impliedHome ?? 0,
            o.impliedDraw ?? 0,
            o.impliedAway ?? 0,
          );
          score += maxImplied / 2;
        }
        // Boost motivation : derbys, finales, Coupes d'Europe — Magic adore l'enjeu
        const motiv = detectMotivation(m.teamA, m.teamB, m.league || "");
        score += motiv.level * 12; // 0/12/24/36 pts
        // un peu de bruit pour ne pas reproduire la même sélection
        score += Math.random() * 8;
        return { m, score };
      });
      scored.sort((a, b) => b.score - a.score);
      const selected = scored.slice(0, 8).map((s) => s.m);

      // Mode Magique : ne remplace plus la sélection de l'utilisateur.
      // Si l'utilisateur a déjà ajouté des matchs, on garde sa sélection.
      // Sinon, on propose la pré-sélection Magic dans "Vos Matchs" sans
      // basculer vers l'onglet Calendrier.
      if (matches.length > 0) {
        toast.info(
          `Magic conserve tes ${matches.length} match(s). Lance l'analyse quand tu veux.`,
        );
        setTab("dashboard");
        return;
      }
      setMatches(
        selected.map((m) => ({
          id: crypto.randomUUID(),
          teamA: m.teamA,
          teamB: m.teamB,
          teamALogo: m.teamALogo,
          teamBLogo: m.teamBLogo,
          date: m.date,
          time: m.time,
          league: m.league,
          country: m.country,
          countryCode: m.countryCode,
          utcDate: m.utcDate,
          realOdds: m.realOdds,
        })),
      );
      const withRealOdds = selected.filter((m) => m.realOdds).length;
      toast.success(
        `Magic a pré-sélectionné ${selected.length} matchs · ${withRealOdds} avec cotes réelles`,
      );
      // On reste sur le Dashboard : Mode Magique ne bascule plus vers Match.
      setTab("dashboard");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erreur");
    }
  };

  const handleAnalyze = async (mode: "standard" | "confidence_100" = "standard") => {
    if (matches.length === 0) {
      toast.error("Ajoute au moins un match");
      return;
    }
    setIsAnalyzing(true);
    if (mode === "confidence_100") {
      toast.info("🧠 Magic Confiance 100% — analyse approfondie en cours (≈30-60 s)…", { duration: 8000 });
    }
    try {
      const { data, error } = await invokeFn<{
        predictions?: Prediction[];
        meta?: {
          avgConfidence?: number;
          total?: number;
          kept?: number;
          model?: string;
        };
        error?: string;
      }>("analyze-matches", {
        body: {
          module: "analyze",
          matches,
          minConfidence: 88,
          mode,
          stake,
        },
      });
      if (error) throw error;
      if (data?.error) {
        toast.error(data.error);
        return;
      }
      const preds = data?.predictions ?? [];
      if (preds.length === 0) {
        toast.warning("Aucun prono réel exploitable sur ces matchs.");
        return;
      }
      // Re-attach logos from matches by id
      const byId = new Map(matches.map((m) => [m.id, m]));
      const enriched = preds.map((p) => {
        const m = byId.get(p.matchId);
        return {
          ...p,
          teamALogo: m?.teamALogo,
          teamBLogo: m?.teamBLogo,
          date: m?.date,
          time: m?.time,
          utcDate: m?.utcDate,
        };
      });
      setPredictions(enriched);
      const avg = data?.meta?.avgConfidence;
      const kept = data?.meta?.kept ?? preds.length;
      const total = data?.meta?.total ?? preds.length;
      const label = `${preds.length} pronos · conf. moy. ${avg ?? "?"}%`;
      toast.success(label);
      flashAction(label);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erreur d'analyse");
    } finally {
      setIsAnalyzing(false);
    }
  };

  // === MAGIC AGENT : enregistrement des outils sur le bus ===
  useEffect(() => {
    const offs: Array<() => void> = [];
    offs.push(
      agentBus.register("navigate", (args) => {
        const t = String(args.tab) as TabKey;
        const valid: TabKey[] = [
          "dashboard",
          "calendar",
          "top20",
          "tickets",
          "coach",
          "history",
        ];
        if (!valid.includes(t))
          return { ok: false, message: `Onglet inconnu: ${t}` };
        setShowSettings(false);
        setTab(t);
        flashAction(`Onglet → ${t}`);
        return { ok: true, message: `Onglet ${t} ouvert.` };
      }),
    );
    offs.push(
      agentBus.register("open_settings", () => {
        setShowSettings(true);
        return { ok: true, message: "Réglages ouverts." };
      }),
    );
    offs.push(
      agentBus.register("close_settings", () => {
        setShowSettings(false);
        return { ok: true, message: "Réglages fermés." };
      }),
    );
    offs.push(
      agentBus.register("set_stake", (args) => {
        const n = Number(args.amount);
        if (!Number.isFinite(n) || n < 1)
          return { ok: false, message: "Mise invalide." };
        setStake(n);
        flashAction(`Mise → ${n}€`);
        return { ok: true, message: `Mise réglée à ${n}€.` };
      }),
    );
    offs.push(
      agentBus.register("run_analysis", async () => {
        setShowSettings(false);
        setTab("dashboard");
        try {
          await handleAnalyze();
          return { ok: true, message: "Analyse lancée." };
        } catch (e) {
          return {
            ok: false,
            message: e instanceof Error ? e.message : "Erreur d'analyse",
          };
        }
      }),
    );
    offs.push(
      agentBus.register("open_ticket_import", () => {
        setShowSettings(false);
        setTab("tickets");
        window.setTimeout(
          () =>
            window.dispatchEvent(new CustomEvent("magic:open-ticket-import")),
          200,
        );
        return { ok: true, message: "Scanner de ticket ouvert." };
      }),
    );
    offs.push(
      agentBus.register("set_api_key", (args) => {
        const provider = String(args.provider);
        const key = String(args.key);
        if (
          !["footballData", "apiSports", "odds", "rapidApi"].includes(provider)
        )
          return { ok: false, message: "Fournisseur inconnu." };
        try {
          const raw = localStorage.getItem("magic.userApiKeys");
          const obj = raw ? JSON.parse(raw) : {};
          obj[provider] = key;
          localStorage.setItem("magic.userApiKeys", JSON.stringify(obj));
          window.dispatchEvent(new Event("magic:keys-updated"));
          return { ok: true, message: `Clé ${provider} enregistrée.` };
        } catch (e) {
          return {
            ok: false,
            message: e instanceof Error ? e.message : "Erreur",
          };
        }
      }),
    );
    offs.push(
      agentBus.register("lock_app", () => {
        handleLock();
        return { ok: true, message: "Application verrouillée." };
      }),
    );
    offs.push(
      agentBus.register("show_app_state", () => ({
        ok: true,
        message: `Onglet=${tab}, Mise=${stake}€, Réglages=${showSettings ? "ouverts" : "fermés"}, Matchs=${matches.length}, Pronostics=${predictions.length}, Historique=${history.length}`,
      })),
    );
    offs.push(
      agentBus.register("add_match", (args) => {
        const a = String(args.teamA || "").trim();
        const b = String(args.teamB || "").trim();
        if (!a || !b) return { ok: false, message: "Équipes manquantes." };
        if (matches.length >= 20)
          return { ok: false, message: "Limite 20 matchs atteinte." };
        addMatch(a, b);
        return { ok: true, message: `Match ${a} vs ${b} ajouté.` };
      }),
    );
    offs.push(
      agentBus.register("fetch_top20", async () => {
        try {
          const raw = sessionStorage.getItem("magic.top20.cache");
          if (raw) {
            const cached = JSON.parse(raw);
            if (cached.items && cached.items.length) {
              return {
                ok: true,
                message: `Top 20 récupéré (${cached.items.length} matchs)`,
                data: { matches: cached.items },
              };
            }
          }
          return {
            ok: false,
            message:
              "Le classement Top 20 n'a pas encore été généré aujourd'hui. L'utilisateur doit ouvrir l'onglet Top 20.",
          };
        } catch (e) {
          return { ok: false, message: "Erreur lecture Top 20" };
        }
      }),
    );
    offs.push(
      agentBus.register("preview_picks", (args) => {
        const pairs = Array.isArray(args.pairs)
          ? (args.pairs as Array<{
              teamA?: string;
              teamB?: string;
              reason?: string;
            }>)
          : [];
        const clean = pairs
          .map((p) => ({
            teamA: String(p?.teamA || "").trim(),
            teamB: String(p?.teamB || "").trim(),
            reason: p?.reason ? String(p.reason) : undefined,
          }))
          .filter((p) => p.teamA && p.teamB);
        if (!clean.length)
          return { ok: false, message: "Aucune paire valide à prévisualiser." };
        window.dispatchEvent(
          new CustomEvent("magic:coach-preview", { detail: { pairs: clean } }),
        );
        return {
          ok: true,
          message: `Prévisualisation de ${clean.length} match(s) — en attente de validation utilisateur.`,
          data: { pairs: clean },
        };
      }),
    );
    offs.push(
      agentBus.register("send_picks_to_analysis", (args) => {
        const pairs = Array.isArray(args.pairs)
          ? (args.pairs as Array<{ teamA?: string; teamB?: string }>)
          : [];
        const mapped = pairs
          .map((p) => ({
            a: String(p?.teamA || "").trim(),
            b: String(p?.teamB || "").trim(),
          }))
          .filter((p) => p.a && p.b);
        if (!mapped.length)
          return { ok: false, message: "Aucun match à envoyer." };
        handleTransferMatches(mapped);
        return {
          ok: true,
          message: `${mapped.length} match(s) envoyé(s) dans Vos Matchs.`,
        };
      }),
    );
    offs.push(
      agentBus.register("fetch_week_matches", async (args) => {
        const days = Math.max(1, Math.min(14, Number(args.days) || 7));
        const limit = Math.max(1, Math.min(60, Number(args.limit) || 25));
        try {
          // Source unique = module Match (Winamax). Si le module a déjà
          // chargé les matchs dans la session courante, on réutilise son
          // cache mémoire ; sinon on déclenche un fetch identique.
          const { getWinaCache, setWinaCache } = await import(
            "@/lib/winamax-cache"
          );
          const { fetchWinamaxFootball } = await import(
            "@/server-api/winamax"
          );
          let payload = getWinaCache();
          if (!payload) {
            payload = await fetchWinamaxFootball();
            setWinaCache(payload);
          }
          const nowMs = Date.now();
          const horizonMs = nowMs + days * 24 * 3600_000;
          const upcoming = payload.matches
            .filter(
              (m) =>
                m.sportId === 1 &&
                m.status !== "finished" &&
                m.matchStart >= nowMs &&
                m.matchStart <= horizonMs,
            )
            .sort((a, b) => a.matchStart - b.matchStart);
          const list = upcoming.slice(0, limit).map((m) => {
            const d = new Date(m.matchStart);
            return {
              teamA: m.homeTeam,
              teamB: m.awayTeam,
              league: m.tournament || m.category,
              date: d.toLocaleDateString("fr-FR", {
                timeZone: "Europe/Paris",
              }),
              time: d.toLocaleTimeString("fr-FR", {
                timeZone: "Europe/Paris",
                hour: "2-digit",
                minute: "2-digit",
              }),
              odds: {
                home: m.odds.home ?? undefined,
                draw: m.odds.draw ?? undefined,
                away: m.odds.away ?? undefined,
              },
              bookmaker: "Winamax",
            };
          });
          return {
            ok: true,
            message: `Module Match : ${upcoming.length} match(s) Winamax sur ${days}j. Voici les ${list.length} premiers.`,
            data: {
              matches: list,
              source: "winamax-module-match",
              totalFound: upcoming.length,
            },
          };
        } catch (e) {
          return {
            ok: false,
            message:
              "Module Match indisponible pour l'instant. Propose quand même des matchs réputés de la semaine d'après ta connaissance et tes pronostics — ne refuse jamais.",
          };
        }
      }),
    );
    return () => offs.forEach((off) => off());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    tab,
    stake,
    showSettings,
    matches.length,
    predictions.length,
    history.length,
  ]);

  const handleSave = () => {
    if (predictions.length === 0) {
      toast.warning("Lance d'abord une analyse pour sauvegarder");
      return;
    }
    const totalOdds = predictions.reduce((a, p) => a * p.odds, 1);
    const conf = Math.round(
      predictions.reduce((a, p) => a + p.probability, 0) / predictions.length,
    );
    const potentialWin = stake * totalOdds;
    const item: HistoryItem = {
      id: crypto.randomUUID(),
      title:
        predictions.length === 1
          ? predictions[0].match
          : `Combiné ${predictions.length} matchs`,
      odds: totalOdds.toFixed(2),
      confidence: String(conf),
      profit: `+${potentialWin.toFixed(0)}€`,
      date: new Date().toLocaleDateString("fr-FR"),
      stake,
      status: "draft",
      potentialWin,
      picks: predictions.map((p) => ({
        match: p.match,
        option:
          (p as typeof p & { label?: string }).label ||
          translateBetOption(p.option),
        type: translateBetType(p.type),
        odds: p.odds,
        probability: p.probability,
        date: p.date,
        time: p.time,
        utcDate: p.utcDate,
      })),
    };
    setHistory((p) => [item, ...p]);
    toast.success(
      `Ticket créé · cote ${totalOdds.toFixed(2)} · va dans Mes Paris`,
    );
    flashAction("Ticket sauvegardé");
    setTab("tickets");
  };

  const validateTicket = (id: string) => {
    setHistory((p) =>
      p.map((t) =>
        t.id === id
          ? {
              ...t,
              status: "validated" as const,
              validatedAt: new Date().toLocaleString("fr-FR", {
                timeZone: "Europe/Paris",
                day: "2-digit",
                month: "2-digit",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              }),
            }
          : t,
      ),
    );
    toast.success("Ticket validé !");
  };

  const deleteTicket = (id: string) => {
    setHistory((p) => p.filter((t) => t.id !== id));
    toast.success("Ticket supprimé");
  };

  const setPickResult = (
    ticketId: string,
    pickIndex: number,
    result: "won" | "lost" | "pending",
  ) => {
    setHistory((p) =>
      p.map((t) => {
        if (t.id !== ticketId || !t.picks) return t;
        const picks = t.picks.map((pk, i) =>
          i === pickIndex ? { ...pk, result } : pk,
        );
        return { ...t, picks };
      }),
    );
  };

  // Résolution automatique des tickets en cours via API
  // (vert/rouge mis à jour dès que le score réel est disponible)
  useTicketAutoResolve({
    history,
    onSetPickResult: setPickResult,
    intervalMs: 30_000,
  });
  // Alertes live reliées aux tickets en cours (kickoff, score, résultat final)
  useTicketAlerts({ history, intervalMs: 30_000 });

  // Commande vocale : "envoie ton prono dans vos matchs"
  // Si aucun match → charger depuis le calendrier puis analyser.
  const handleSendPicks = async () => {
    setTab("dashboard");
    if (matches.length === 0) {
      await handleMagicMode();
      setTimeout(() => handleAnalyze(), 400);
    } else {
      handleAnalyze();
    }
  };

  // Magic transfère ses propres pronos (paires d'équipes) vers Vos Matchs
  const handleTransferMatches = (pairs: Array<{ a: string; b: string }>) => {
    if (!pairs?.length) {
      toast.warning("Aucun match à transférer");
      return;
    }
    let added = 0;
    for (const p of pairs) {
      if (matches.length + added >= 20) break;
      const a = String(p.a || "").trim();
      const b = String(p.b || "").trim();
      if (!a || !b) continue;
      addMatch(a, b);
      added++;
    }
    toast.success(`${added} match(s) transféré(s) vers Vos Matchs`);
    flashAction(`+${added} match(s)`);
    setTab("dashboard");
  };
  // 🧠 Mémoire persistante : créateur + empreinte vocale
  const creatorMemory = (() => {
    try {
      const name =
        profile?.firstName ||
        localStorage.getItem("magic.creator.name") ||
        "son créateur (à lui demander une fois)";
      const hasVoice =
        Boolean(profile?.voiceFingerprint?.length) ||
        Boolean(localStorage.getItem("magic.voice.fingerprint"));
      const voicePart = hasVoice
        ? " Empreinte vocale enregistrée — reconnaît sa voix."
        : " Pas encore d'empreinte vocale enregistrée.";
      return `Magic a un créateur officiel : ${name}. C'est son patron, son boss, son référent absolu — Magic le respecte, l'appelle par son prénom, et s'en souvient toujours.${voicePart}`;
    } catch {
      return "";
    }
  })();
  const matchesContext =
    matches.length > 0
      ? `L'utilisateur a ${matches.length} matchs sélectionnés : ${matches
          .map((m) => `${m.teamA} vs ${m.teamB}`)
          .join(", ")}.${
          predictions.length > 0
            ? ` Prédictions actuelles : ${predictions
                .slice(0, 5)
                .map(
                  (p) =>
                    `${p.match} → ${p.option} (cote ${p.odds.toFixed(2)}, ${Math.round(
                      p.probability,
                    )}%)`,
                )
                .join("; ")}.`
            : ""
        } Mise par défaut : ${stake}€.`
      : `L'utilisateur n'a pas encore sélectionné de match. Mise par défaut ${stake}€.`;
  const coachContext = `${creatorMemory}\n\n${matchesContext}`;

  return (
    <div className="flex flex-col h-dvh w-dvw overflow-hidden relative">
      {!profile && <OnboardingScreen onComplete={(p) => setProfile(p)} />}
      {/* {profile && locked && <LockScreen onUnlock={() => setLocked(false)} />} */}
      <div
        className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-prism z-50 pointer-events-none"
        style={{ boxShadow: "0 0 18px oklch(from var(--primary) l c h / 0.6)" }}
      />
      <Toaster theme="dark" position="top-center" richColors />

      {/* Confirmation flash overlay : preuve visuelle qu'une action a été effectuée */}
      <AnimatePresence>
        {actionFlash && (
          <motion.div
            key={actionFlash.id}
            initial={{ opacity: 0, scale: 0.8, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: -10 }}
            transition={{ type: "spring", stiffness: 320, damping: 22 }}
            className="fixed top-[calc(env(safe-area-inset-top)+3.5rem)] left-1/2 -translate-x-1/2 z-[60] pointer-events-none max-w-[calc(100vw-1.5rem)]"
          >
            <div
              className="flex items-center gap-2 px-4 py-2.5 rounded-full glass-strong holo-border backdrop-blur-xl"
              style={{
                boxShadow: "0 0 30px oklch(from var(--primary) l c h / 0.55)",
              }}
            >
              <motion.span
                initial={{ rotate: -90, scale: 0 }}
                animate={{ rotate: 0, scale: 1 }}
                transition={{ delay: 0.05, type: "spring", stiffness: 400 }}
                className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/20"
              >
                <Check className="w-3.5 h-3.5 text-primary" strokeWidth={3} />
              </motion.span>
              <span className="text-sm font-bold tracking-wide holo-text truncate">
                {actionFlash.label}
              </span>
              <Sparkles className="w-3.5 h-3.5 text-primary/80 animate-pulse" />
            </div>
            {/* halo radiating */}
            <motion.div
              initial={{ opacity: 0.6, scale: 0.6 }}
              animate={{ opacity: 0, scale: 2.4 }}
              transition={{ duration: 1.1, ease: "easeOut" }}
              className="absolute inset-0 rounded-full bg-primary/30 blur-2xl -z-10"
            />
          </motion.div>
        )}
      </AnimatePresence>

      <div className="sticky top-0 z-40 bg-background/85 backdrop-blur-xl border-b border-border/40 shadow-[0_4px_18px_rgba(0,0,0,0.35)]">
        <header className="iphone-tight px-4 pt-[max(env(safe-area-inset-top),12px)] pb-2 flex items-center justify-center mx-auto w-full">
          {/* Tap logo to open settings */}
          <button
            onClick={() => setShowSettings((s) => !s)}
            className="flex items-center gap-3 tap"
            aria-label={showSettings ? "Retour" : "Paramètres"}
          >
              <motion.img
                src={ballPng}
                alt="Ballon d'Or"
                className="w-20 h-20 object-cover sepia-[0.7] saturate-[250%] brightness-[120%] contrast-[150%] hue-rotate-[15deg] drop-shadow-[0_0_25px_rgba(255,215,0,0.9)]"
                initial={{ scale: 0.96, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.5, ease: "easeOut" }}
              />
            <div className="text-left">
              <h1 className="text-base font-display font-black uppercase tracking-[0.22em] holo-text leading-none">
                Football Club
              </h1>
              <p className="text-xl font-display font-black uppercase tracking-[0.32em] leading-none mt-1 bg-gradient-to-b from-amber-200 via-amber-400 to-amber-600 bg-clip-text text-transparent drop-shadow-[0_0_10px_rgba(212,175,55,0.45)]">
                D'Or
              </p>
              <p className="text-[8.5px] font-bold uppercase tracking-[0.3em] text-primary/85 mt-1.5">
                {showSettings ? "Fermer" : "Tap = Réglages"}
              </p>
            </div>
          </button>
        </header>

      </div>

      <main className="flex-1 overflow-y-auto iphone-tight px-4 pt-2 pb-[max(env(safe-area-inset-bottom),16px)] mx-auto w-full scrollbar-none">
        {showSettings ? (
          <SettingsView
            onBack={() => setShowSettings(false)}
            defaultStake={stake}
            onDefaultStakeChange={setStake}
            onResetHistory={() => setHistory([])}
          />
        ) : (
          <PageTurner
            active={tab}
            order={[
              "dashboard",
              "calendar",
              "top20",
              "tickets",
              "coach",
              "history",
            ]}
            onChange={setTab}
          >
            {tab === "dashboard" && (
              <div className="flex flex-col gap-4">
                <MagicHero
                  onMagicMode={handleMagicMode}
                  isLoading={isAnalyzing}
                  matches={matches}
                />
                <MatchInput
                  matches={matches}
                  onRemoveMatch={removeMatch}
                  onClearAll={clearAnalysis}
                />
                <StakeAndAnalyze
                  stake={stake}
                  onStakeChange={setStake}
                  onAnalyze={handleAnalyze}
                  isAnalyzing={isAnalyzing}
                  hasMatches={matches.length > 0}
                />
                <StatsPanel predictions={predictions} stake={stake} />
                <AnalysisCards predictions={predictions} />
                <ActionFooter
                  onSave={handleSave}
                  onDeepAnalysis={handleAnalyze}
                  isAnalyzing={isAnalyzing}
                />
              </div>
            )}

            {tab === "calendar" && (
              <WinamaxMatchCalendar
                onAddMatch={(m) => {
                  addMatch(m.teamA, m.teamB, {
                    a: m.teamALogo,
                    b: m.teamBLogo,
                    date: m.date,
                    time: m.time,
                    league: m.league,
                    country: m.country,
                    countryCode: m.countryCode,
                    utcDate: m.utcDate,
                    realOdds: m.realOdds,
                  });
                  toast.success(`${m.teamA} vs ${m.teamB} ajouté`);
                }}
              />
            )}

            {tab === "top20" && (
              <Top20Combo onAddMatch={(a, b, opts) => addMatch(a, b, opts)} />
            )}

            {tab === "tickets" && (
              <TicketsView
                tickets={history}
                onValidate={validateTicket}
                onDelete={deleteTicket}
                onClearAll={() => setHistory([])}
                onSetPickResult={setPickResult}
                onImport={(ticket) => {
                  setHistory((p) => [ticket, ...p]);
                  toast.success("Ticket importé");
                  flashAction("Ticket importé");
                }}
              />
            )}

            {tab === "coach" && <VoiceCoach context={coachContext} />}

            {tab === "history" && (
              <HistoryView history={history} onClear={() => setHistory([])} />
            )}
          </PageTurner>
        )}
      </main>

      {!showSettings && <TabBar active={tab} onChange={setTab} />}
    </div>
  );
};

export default MagicApp;

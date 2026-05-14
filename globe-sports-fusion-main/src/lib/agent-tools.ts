// Catalogue des outils exposés à l'agent Magic.
// Sert à la fois pour le edge function (envoi à l'IA) et pour la doc côté client.

export const AGENT_TOOLS = [
  {
    name: "navigate",
    description: "Change l'onglet principal de l'application. Utiliser pour ouvrir une section.",
    parameters: {
      type: "object",
      properties: {
        tab: {
          type: "string",
          enum: ["dashboard", "calendar", "top20", "tickets", "coach", "history"],
          description:
            "dashboard=Analyse, calendar=Match, top20=Top 20 combo, tickets=Paris, coach=Coach vocal, history=Historique",
        },
      },
      required: ["tab"],
    },
  },
  {
    name: "open_settings",
    description: "Ouvrir l'écran des Réglages (clés API, modules, notifications).",
    parameters: { type: "object", properties: {}, required: [] },
  },
  {
    name: "close_settings",
    description: "Fermer l'écran des Réglages et revenir à l'app.",
    parameters: { type: "object", properties: {}, required: [] },
  },
  {
    name: "set_stake",
    description: "Définir la mise par défaut en euros utilisée pour les analyses et tickets.",
    parameters: {
      type: "object",
      properties: { amount: { type: "number", description: "Montant en euros (>=1)" } },
      required: ["amount"],
    },
  },
  {
    name: "toggle_high_confidence",
    description: "Activer/désactiver le filtre 'haute confiance uniquement' sur les pronostics.",
    parameters: {
      type: "object",
      properties: { enabled: { type: "boolean" } },
      required: ["enabled"],
    },
  },
  {
    name: "run_analysis",
    description: "Lancer l'analyse complète (matchs + pronostics) sur les jours à venir.",
    parameters: {
      type: "object",
      properties: {
        days_ahead: {
          type: "number",
          description: "Nombre de jours à analyser (1-14)",
          minimum: 1,
          maximum: 14,
        },
      },
      required: [],
    },
  },
  {
    name: "open_ticket_import",
    description: "Ouvrir le scanner de ticket (OCR photo) pour importer un pari existant.",
    parameters: { type: "object", properties: {}, required: [] },
  },
  {
    name: "set_api_key",
    description: "Enregistrer une clé API pour un fournisseur de données sport.",
    parameters: {
      type: "object",
      properties: {
        provider: {
          type: "string",
          enum: ["footballData", "apiSports", "odds", "rapidApi"],
          description: "Nom du fournisseur",
        },
        key: {
          type: "string",
          description: "La clé API (sera stockée localement, jamais envoyée à l'agent)",
        },
      },
      required: ["provider", "key"],
    },
  },
  {
    name: "show_app_state",
    description:
      "Renvoyer l'état actuel de l'app (onglet, mise, nombre de tickets, modules actifs). À appeler quand l'utilisateur pose une question d'état.",
    parameters: { type: "object", properties: {}, required: [] },
  },
  {
    name: "add_match",
    description:
      "Ajouter manuellement un match (équipe A vs équipe B) à la liste d'analyse. Utiliser quand l'utilisateur dicte un match.",
    parameters: {
      type: "object",
      properties: {
        teamA: { type: "string", description: "Nom de la première équipe" },
        teamB: { type: "string", description: "Nom de la seconde équipe" },
      },
      required: ["teamA", "teamB"],
    },
  },
  {
    name: "fetch_week_matches",
    description:
      "Récupérer automatiquement les matchs de football de la semaine proposés par Winamax (via toutes les clés API utilisateur disponibles + The Odds API). Retourne la liste des matchs (équipes, date, heure, championnat, cotes 1X2 réelles Winamax). À UTILISER SYSTÉMATIQUEMENT quand l'utilisateur demande des pronostics, des matchs intéressants, ou un programme de la semaine — ne jamais refuser, même sans clés. Les matchs sont triés par date.",
    parameters: {
      type: "object",
      properties: {
        days: {
          type: "number",
          description: "Nombre de jours à scanner (1-14). Défaut 7.",
          minimum: 1,
          maximum: 14,
        },
        limit: {
          type: "number",
          description: "Nombre max de matchs à retourner (défaut 25, max 60).",
        },
      },
      required: [],
    },
  },
  {
    name: "preview_picks",
    description:
      "Préparer un envoi de pronostics vers le module Analyse. N'ENVOIE RIEN — affiche d'abord la prévisualisation détaillée pour validation par l'utilisateur.",
    parameters: {
      type: "object",
      properties: {
        pairs: {
          type: "array",
          description: "Liste de matchs (paires d'équipes) à proposer",
          items: {
            type: "object",
            properties: {
              teamA: { type: "string" },
              teamB: { type: "string" },
              reason: { type: "string", description: "Raison brève du choix" },
            },
            required: ["teamA", "teamB"],
          },
        },
      },
      required: ["pairs"],
    },
  },
  {
    name: "fetch_top20",
    description:
      "Récupérer le classement des matchs du module Top 20 (prédictions IA de haute confiance, value bet). Utilise ceci pour voir les meilleures opportunités actuelles du module Top 20 et les proposer.",
    parameters: { type: "object", properties: {}, required: [] },
  },
  {
    name: "send_picks_to_analysis",
    description:
      "Envoyer directement une liste de matchs dans le module Analyse (Vos Matchs). À utiliser quand l'utilisateur te demande d'ajouter ou d'envoyer tes pronostics directement à ses matchs.",
    parameters: {
      type: "object",
      properties: {
        pairs: {
          type: "array",
          items: {
            type: "object",
            properties: {
              teamA: { type: "string" },
              teamB: { type: "string" },
            },
            required: ["teamA", "teamB"],
          },
        },
      },
      required: ["pairs"],
    },
  },
] as const;

export type ToolName = (typeof AGENT_TOOLS)[number]["name"];

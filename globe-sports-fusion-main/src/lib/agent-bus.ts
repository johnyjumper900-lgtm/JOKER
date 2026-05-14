// Bus d'actions de l'agent Magic.
// Chaque vue/composant s'abonne aux outils qu'il sait exécuter.
// L'agent (LLM) renvoie des appels d'outils → on les dispatch ici.

export type ToolResult = {
  ok: boolean;
  message: string;
  data?: unknown;
};

type Handler = (args: Record<string, unknown>) => Promise<ToolResult> | ToolResult;

const handlers = new Map<string, Handler>();
const listeners = new Set<
  (toolName: string, args: Record<string, unknown>, result: ToolResult) => void
>();

export const agentBus = {
  /** Composants : s'enregistrer pour exécuter un outil */
  register(toolName: string, handler: Handler): () => void {
    handlers.set(toolName, handler);
    return () => {
      if (handlers.get(toolName) === handler) handlers.delete(toolName);
    };
  },

  /** Agent : exécuter un outil par nom */
  async dispatch(toolName: string, args: Record<string, unknown>): Promise<ToolResult> {
    const handler = handlers.get(toolName);
    if (!handler) {
      const result: ToolResult = {
        ok: false,
        message: `Outil "${toolName}" non disponible (composant non monté).`,
      };
      listeners.forEach((l) => l(toolName, args, result));
      return result;
    }
    try {
      const result = await handler(args);
      listeners.forEach((l) => l(toolName, args, result));
      return result;
    } catch (e) {
      const result: ToolResult = {
        ok: false,
        message: e instanceof Error ? e.message : "Erreur inconnue",
      };
      listeners.forEach((l) => l(toolName, args, result));
      return result;
    }
  },

  /** UI : suivre les exécutions pour afficher dans le chat */
  subscribe(
    listener: (toolName: string, args: Record<string, unknown>, result: ToolResult) => void,
  ): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },

  /** Liste des outils actuellement disponibles */
  available(): string[] {
    return Array.from(handlers.keys());
  },
};

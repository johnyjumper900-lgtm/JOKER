import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/ai-fallback")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const { prompt, system, json, temperature, maxOutputTokens, model } =
            (await request.json()) as {
              prompt: string;
              system?: string;
              json?: boolean;
              temperature?: number;
              maxOutputTokens?: number;
              model?: string;
            };

          const apiKey = process.env.LOVABLE_API_KEY;
          if (!apiKey) {
            return Response.json(
              { error: "LOVABLE_API_KEY not configured" },
              { status: 500 },
            );
          }

          const messages: Array<{ role: string; content: string }> = [];
          if (system) messages.push({ role: "system", content: system });
          messages.push({ role: "user", content: prompt });

          // Modèle le plus intelligent disponible sur le Lovable AI Gateway.
          // Sert de relais quand la clé Gemini perso de l'utilisateur n'est pas configurée
          // ou que Gemini est temporairement indisponible (quota / 401 / 403).
          const body: Record<string, unknown> = {
            model: model ?? "google/gemini-2.5-flash",
            messages,
            temperature: temperature ?? 0.4,
            max_tokens: maxOutputTokens ?? 2048,
          };
          if (json) body.response_format = { type: "json_object" };

          const res = await fetch(
            "https://ai.gateway.lovable.dev/v1/chat/completions",
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${apiKey}`,
              },
              body: JSON.stringify(body),
            },
          );

          if (!res.ok) {
            const txt = await res.text().catch(() => "");
            return Response.json(
              { error: `AI Gateway ${res.status}: ${txt.slice(0, 300)}` },
              { status: res.status },
            );
          }

          const data = (await res.json()) as {
            choices?: Array<{ message?: { content?: string } }>;
          };
          const text = data.choices?.[0]?.message?.content ?? "";
          return Response.json({ text });
        } catch (e) {
          return Response.json(
            { error: e instanceof Error ? e.message : String(e) },
            { status: 500 },
          );
        }
      },
    },
  },
});

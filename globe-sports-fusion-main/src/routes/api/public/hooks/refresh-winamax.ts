import { createFileRoute } from "@tanstack/react-router";
import { fetchWinamaxFootball } from "@/server-api/winamax";

export const Route = createFileRoute("/api/public/hooks/refresh-winamax")({
  server: {
    handlers: {
      POST: async () => {
        try {
          const payload = await fetchWinamaxFootball();
          return Response.json({
            success: true,
            totalCount: payload.totalCount,
            liveCount: payload.liveCount,
            sports: payload.sports.length,
          });
        } catch (e) {
          console.error("[refresh-winamax] failed", e);
          return Response.json(
            { success: false, error: e instanceof Error ? e.message : String(e) },
            { status: 500 },
          );
        }
      },
      GET: async () => {
        // Simple ping for manual checks
        return Response.json({ ok: true, hint: "POST to refresh Winamax cache" });
      },
    },
  },
});
import React, { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { fetchWinamaxFootball, type WinaMatch } from "@/server-api/winamax";

interface BetSlip {
  matchId: string;
  matchTitle: string;
  type: "home" | "draw" | "away";
  pick: string;
  odds: number;
}

const TeamBadge: React.FC<{ name: string; logo: string | null; jersey: string | null }> = ({
  name,
  logo,
  jersey,
}) => {
  const [src, setSrc] = React.useState<string | null>(logo);
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
      {src ? (
        <img
          src={src}
          alt={name}
          width={24}
          height={24}
          style={{ width: 24, height: 24, objectFit: "contain", borderRadius: 4, background: "#f4f4f4" }}
          onError={() => {
            if (jersey && src !== jersey) setSrc(jersey);
            else setSrc(null);
          }}
        />
      ) : (
        <span
          style={{
            width: 24,
            height: 24,
            borderRadius: 4,
            background: "#eee",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 10,
            color: "#888",
          }}
        >
          ⚽
        </span>
      )}
      <span>{name}</span>
    </span>
  );
};

const StatusBadge: React.FC<{ status: WinaMatch["status"]; minute?: number; score?: string }> = ({
  status,
  minute,
  score,
}) => {
  const styles: Record<string, React.CSSProperties> = {
    live: { background: "#f44336", color: "white" },
    upcoming: { background: "#2196f3", color: "white" },
    finished: { background: "#9e9e9e", color: "white" },
  };
  const s: React.CSSProperties = {
    ...styles[status],
    padding: "2px 8px",
    borderRadius: 4,
    fontSize: 11,
    fontWeight: 600,
    display: "inline-block",
  };
  return (
    <span style={s}>
      {status === "live"
        ? `🔴 ${minute || 0}'${score ? ` · ${score}` : ""}`
        : status === "upcoming"
        ? "⏳ À venir"
        : `✅ ${score || "Terminé"}`}
    </span>
  );
};

const OddsButton: React.FC<{
  label: string;
  odds: number | null;
  selected: boolean;
  onClick: () => void;
}> = ({ label, odds, selected, onClick }) => {
  if (odds === null || odds === undefined) {
    return (
      <div
        style={{
          padding: "8px 14px",
          border: "1px dashed #ddd",
          borderRadius: 8,
          minWidth: 56,
          textAlign: "center",
          color: "#bbb",
          fontSize: 12,
        }}
      >
        <div style={{ fontSize: 10 }}>{label}</div>
        <div>—</div>
      </div>
    );
  }
  return (
    <button
      onClick={onClick}
      style={{
        padding: "8px 14px",
        border: selected ? "2px solid #4caf50" : "1px solid #ddd",
        borderRadius: 8,
        background: selected ? "#e8f5e9" : "white",
        cursor: "pointer",
        fontWeight: selected ? "bold" : 500,
        fontSize: 13,
        minWidth: 56,
        transition: "all 0.15s",
      }}
    >
      <div style={{ fontSize: 10, color: "#888" }}>{label}</div>
      <div style={{ fontSize: 16, fontWeight: "bold" }}>{odds.toFixed(2)}</div>
    </button>
  );
};

export default function WinamaxDashboard() {
  const fetcher = useServerFn(fetchWinamaxFootball);
  const { data, isLoading, isError, error, refetch, isFetching, dataUpdatedAt } = useQuery({
    queryKey: ["winamax-foot"],
    queryFn: () => fetcher(),
    refetchInterval: 30_000,
    staleTime: 15_000,
  });

  const [tab, setTab] = useState<"all" | "live" | "betslip">("all");
  const [tournamentFilter, setTournamentFilter] = useState<string>("all");
  const [sportFilter, setSportFilter] = useState<number | "all">("all");
  const [search, setSearch] = useState("");
  const [slip, setSlip] = useState<BetSlip[]>([]);
  const [stake, setStake] = useState(10);

  const matches = data?.matches ?? [];
  const sports = data?.sports ?? [];
  const tournaments = useMemo(() => {
    const all = data?.tournaments ?? [];
    if (sportFilter === "all") return all;
    const counts: Record<string, number> = {};
    for (const m of matches) {
      if (m.sportId !== sportFilter) continue;
      counts[m.tournament] = (counts[m.tournament] || 0) + 1;
    }
    return Object.entries(counts)
      .map(([name, count]) => ({ id: name, name, count }))
      .sort((a, b) => b.count - a.count);
  }, [data, matches, sportFilter]);

  const filtered = useMemo(() => {
    let m = matches;
    if (tab === "live") m = m.filter((x) => x.status === "live");
    if (sportFilter !== "all") m = m.filter((x) => x.sportId === sportFilter);
    if (tournamentFilter !== "all") m = m.filter((x) => x.tournament === tournamentFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      m = m.filter(
        (x) =>
          x.title.toLowerCase().includes(q) ||
          x.tournament.toLowerCase().includes(q),
      );
    }
    return m;
  }, [matches, tab, tournamentFilter, sportFilter, search]);

  const isSelected = (mid: string, type: string) =>
    slip.some((b) => b.matchId === mid && b.type === type);

  const addBet = (m: WinaMatch, type: "home" | "draw" | "away", odd: number) => {
    setSlip((prev) => {
      const existing = prev.find((b) => b.matchId === m.id);
      if (existing && existing.type === type) return prev.filter((b) => b.matchId !== m.id);
      const without = prev.filter((b) => b.matchId !== m.id);
      const pick = type === "home" ? m.homeTeam : type === "draw" ? "Match nul" : m.awayTeam;
      return [...without, { matchId: m.id, matchTitle: m.title, type, pick, odds: odd }];
    });
  };

  const removeBet = (mid: string) => setSlip((prev) => prev.filter((b) => b.matchId !== mid));
  const totalOdds = slip.reduce((acc, b) => acc * b.odds, 1);
  const potentialWin = totalOdds * stake;

  const styles = {
    container: {
      fontFamily: "'Segoe UI', system-ui, sans-serif",
      maxWidth: 1400,
      margin: "0 auto",
      padding: 16,
      background: "linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)",
      minHeight: "100vh",
    } as React.CSSProperties,
    header: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      padding: "16px 24px",
      background: "linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)",
      borderRadius: 16,
      color: "white",
      marginBottom: 16,
      flexWrap: "wrap",
      gap: 12,
    } as React.CSSProperties,
    logo: {
      fontSize: 24,
      fontWeight: 800,
      background: "linear-gradient(90deg, #e31837, #ff6b6b)",
      WebkitBackgroundClip: "text",
      WebkitTextFillColor: "transparent",
    } as React.CSSProperties,
    tab: (active: boolean): React.CSSProperties => ({
      padding: "10px 18px",
      border: "none",
      borderRadius: 10,
      cursor: "pointer",
      fontWeight: 700,
      fontSize: 13,
      background: active ? "linear-gradient(135deg, #e31837, #ff4444)" : "rgba(255,255,255,0.1)",
      color: "white",
    }),
    grid: { display: "grid", gridTemplateColumns: "1fr 340px", gap: 16 } as React.CSSProperties,
    card: { background: "white", borderRadius: 16, padding: 20, boxShadow: "0 2px 8px rgba(0,0,0,0.08)" } as React.CSSProperties,
    sidebar: {
      background: "white",
      borderRadius: 16,
      padding: 20,
      boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
      position: "sticky",
      top: 16,
      maxHeight: "calc(100vh - 32px)",
      overflow: "auto",
    } as React.CSSProperties,
    matchCard: {
      padding: "12px 14px",
      border: "1px solid #eee",
      borderRadius: 12,
      marginBottom: 8,
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      flexWrap: "wrap",
      gap: 10,
    } as React.CSSProperties,
    chip: (active: boolean): React.CSSProperties => ({
      padding: "5px 12px",
      borderRadius: 20,
      border: active ? "1px solid #e31837" : "1px solid #ddd",
      background: active ? "#e31837" : "white",
      color: active ? "white" : "#333",
      cursor: "pointer",
      fontSize: 12,
      fontWeight: 600,
      whiteSpace: "nowrap",
    }),
    input: { padding: "8px 12px", border: "1px solid #ddd", borderRadius: 8, fontSize: 13, width: "100%" } as React.CSSProperties,
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div>
          <div style={styles.logo}>🎯 WINAMAX — OFFRE COMPLÈTE</div>
          <div style={{ fontSize: 11, opacity: 0.7, marginTop: 4 }}>
            {data
              ? `${data.totalCount} matchs · ${data.liveCount} en direct · maj ${new Date(
                  dataUpdatedAt,
                ).toLocaleTimeString("fr-FR")}`
              : "Connexion à Winamax…"}
            {isFetching && " · ⟳"}
          </div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button style={styles.tab(tab === "all")} onClick={() => setTab("all")}>
            📋 Tous ({data?.totalCount ?? 0})
          </button>
          <button style={styles.tab(tab === "live")} onClick={() => setTab("live")}>
            🔴 Live ({data?.liveCount ?? 0})
          </button>
          <button style={styles.tab(tab === "betslip")} onClick={() => setTab("betslip")}>
            🎫 Panier ({slip.length})
          </button>
          <button
            style={{ ...styles.tab(false), background: "rgba(255,255,255,0.2)" }}
            onClick={() => refetch()}
            disabled={isFetching}
          >
            ⟳ Actualiser
          </button>
        </div>
      </div>

      <div style={styles.grid}>
        <div>
          {tab !== "betslip" && (
            <>
              <div style={{ ...styles.card, marginBottom: 12, padding: 14 }}>
                <input
                  placeholder="🔎 Rechercher une équipe ou compétition…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  style={styles.input}
                />
                <div
                  style={{
                    display: "flex",
                    gap: 6,
                    marginTop: 12,
                    flexWrap: "wrap",
                  }}
                >
                  <button
                    style={styles.chip(sportFilter === "all")}
                    onClick={() => { setSportFilter("all"); setTournamentFilter("all"); }}
                  >
                    🌐 Tous les sports ({data?.totalCount ?? 0})
                  </button>
                  {sports.map((s) => (
                    <button
                      key={s.id}
                      style={styles.chip(sportFilter === s.id)}
                      onClick={() => { setSportFilter(s.id); setTournamentFilter("all"); }}
                    >
                      {s.name} ({s.count})
                    </button>
                  ))}
                </div>
                <div
                  style={{
                    display: "flex",
                    gap: 6,
                    marginTop: 12,
                    flexWrap: "wrap",
                    maxHeight: 90,
                    overflowY: "auto",
                  }}
                >
                  <button
                    style={styles.chip(tournamentFilter === "all")}
                    onClick={() => setTournamentFilter("all")}
                  >
                    Toutes les compétitions
                  </button>
                  {tournaments.slice(0, 50).map((t) => (
                    <button
                      key={t.id}
                      style={styles.chip(tournamentFilter === t.name)}
                      onClick={() => setTournamentFilter(t.name)}
                    >
                      {t.name} ({t.count})
                    </button>
                  ))}
                </div>
              </div>

              <div style={styles.card}>
                {isLoading && (
                  <div style={{ textAlign: "center", padding: 60 }}>
                    <div style={{ fontSize: 40 }}>⚽</div>
                    <p>Aspiration des données Winamax…</p>
                  </div>
                )}
                {isError && (
                  <div style={{ padding: 20, color: "#c62828" }}>
                    Erreur : {(error as Error).message}
                  </div>
                )}
                {!isLoading &&
                  !isError &&
                  filtered.length === 0 && (
                    <div style={{ textAlign: "center", padding: 40, color: "#888" }}>
                      Aucun match correspondant
                    </div>
                  )}
                {filtered.map((m) => (
                  <div
                    key={m.id}
                    style={{
                      ...styles.matchCard,
                      background: m.status === "live" ? "#fff5f5" : "white",
                      borderLeft:
                        m.status === "live" ? "3px solid #f44336" : "1px solid #eee",
                      opacity: m.status === "finished" ? 0.6 : 1,
                    }}
                  >
                    <div style={{ flex: 1, minWidth: 240 }}>
                      <div style={{ fontSize: 11, color: "#888", marginBottom: 4 }}>
                        {m.tournament}
                        {m.category ? ` · ${m.category}` : ""}
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 700, fontSize: 15, marginBottom: 4, flexWrap: "wrap" }}>
                        <TeamBadge name={m.homeTeam} logo={m.homeLogo} jersey={m.homeJersey} />
                        <span style={{ color: "#bbb" }}>vs</span>
                        <TeamBadge name={m.awayTeam} logo={m.awayLogo} jersey={m.awayJersey} />
                      </div>
                      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                        <StatusBadge status={m.status} minute={m.minute} score={m.score} />
                        {m.status === "upcoming" && (
                          <span style={{ fontSize: 11, color: "#666" }}>
                            {new Date(m.matchStart).toLocaleString("fr-FR", {
                              weekday: "short",
                              day: "2-digit",
                              month: "short",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        )}
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: 6 }}>
                      <OddsButton
                        label="1"
                        odds={m.odds.home}
                        selected={isSelected(m.id, "home")}
                        onClick={() => m.odds.home && addBet(m, "home", m.odds.home)}
                      />
                      <OddsButton
                        label="N"
                        odds={m.odds.draw}
                        selected={isSelected(m.id, "draw")}
                        onClick={() => m.odds.draw && addBet(m, "draw", m.odds.draw)}
                      />
                      <OddsButton
                        label="2"
                        odds={m.odds.away}
                        selected={isSelected(m.id, "away")}
                        onClick={() => m.odds.away && addBet(m, "away", m.odds.away)}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {tab === "betslip" && (
            <div style={styles.card}>
              <h2 style={{ marginTop: 0 }}>🎫 Mon Panier</h2>
              {slip.length === 0 ? (
                <p style={{ color: "#888", textAlign: "center", padding: 40 }}>
                  Cliquez sur une cote pour l'ajouter
                </p>
              ) : (
                <>
                  {slip.map((b) => (
                    <div key={b.matchId} style={styles.matchCard}>
                      <div>
                        <div style={{ fontSize: 12, color: "#888" }}>{b.matchTitle}</div>
                        <div style={{ fontWeight: 700 }}>
                          {b.pick} <span style={{ color: "#4caf50" }}>@ {b.odds.toFixed(2)}</span>
                        </div>
                      </div>
                      <button
                        onClick={() => removeBet(b.matchId)}
                        style={{
                          background: "#f44336",
                          color: "white",
                          border: "none",
                          borderRadius: 6,
                          padding: "6px 12px",
                          cursor: "pointer",
                        }}
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                  <div style={{ marginTop: 16, padding: 16, background: "#f5f5f5", borderRadius: 12 }}>
                    <label style={{ fontWeight: 700 }}>Mise : </label>
                    <input
                      type="number"
                      min={1}
                      value={stake}
                      onChange={(e) => setStake(Number(e.target.value) || 0)}
                      style={{ width: 100, padding: 6, borderRadius: 6, border: "1px solid #ddd", marginLeft: 8 }}
                    />{" "}
                    €
                    <div style={{ marginTop: 12, fontSize: 13, color: "#666" }}>
                      Cote totale : <b>{totalOdds.toFixed(2)}</b>
                    </div>
                    <div style={{ marginTop: 6, fontSize: 18, fontWeight: 800, color: "#2e7d32" }}>
                      Gain potentiel : {potentialWin.toFixed(2)} €
                    </div>
                    <button
                      onClick={() => setSlip([])}
                      style={{
                        marginTop: 12,
                        padding: "10px 20px",
                        border: "none",
                        borderRadius: 8,
                        background: "#f44336",
                        color: "white",
                        cursor: "pointer",
                        width: "100%",
                        fontWeight: 700,
                      }}
                    >
                      🗑️ Vider le panier
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        <div>
          <div style={styles.sidebar}>
            <h3 style={{ marginTop: 0, fontSize: 15 }}>📊 Stats</h3>
            <div style={{ background: "#f5f5f5", padding: 12, borderRadius: 10, fontSize: 13 }}>
              <div>📋 Matchs : <b>{data?.totalCount ?? 0}</b></div>
              <div>🔴 En direct : <b>{data?.liveCount ?? 0}</b></div>
              <div>🏆 Compétitions : <b>{tournaments.length}</b></div>
              <div>🎫 Paris : <b>{slip.length}</b></div>
            </div>

            <h3 style={{ fontSize: 15, marginTop: 20 }}>🏆 Top compétitions</h3>
            <div>
              {tournaments.slice(0, 15).map((t) => (
                <div
                  key={t.id}
                  onClick={() => {
                    setTournamentFilter(t.name);
                    setTab("all");
                  }}
                  style={{
                    padding: "8px 0",
                    borderBottom: "1px solid #eee",
                    fontSize: 13,
                    display: "flex",
                    justifyContent: "space-between",
                    cursor: "pointer",
                  }}
                >
                  <span>{t.name}</span>
                  <span style={{ color: "#888" }}>{t.count}</span>
                </div>
              ))}
            </div>

            <div style={{ marginTop: 16, fontSize: 10, color: "#aaa", textAlign: "center" }}>
              Données : winamax.fr · Refresh auto 30s
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

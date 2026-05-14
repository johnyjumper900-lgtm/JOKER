import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, X, Send, Mic, MicOff, Loader2 } from "lucide-react";
import { agentBus } from "@/lib/agent-bus";
import { AGENT_TOOLS } from "@/lib/agent-tools";
import { callGeminiRaw, type GeminiContent } from "@/lib/gemini-core";
import { pickFrenchMaleVoice } from "@/lib/voice-utils";
import { speakWithElevenLabs } from "@/lib/elevenlabs-tts";
import { FOOTBALL_BETTING_KNOWLEDGE } from "@/lib/football-knowledge";
import { BASKETBALL_BETTING_KNOWLEDGE } from "@/lib/basketball-knowledge";
import { TENNIS_BETTING_KNOWLEDGE } from "@/lib/tennis-knowledge";
import { MAGIC_MISSION } from "@/lib/magic-mission";

/* eslint-disable @typescript-eslint/no-explicit-any */

type ChatMsg =
  | { role: "user"; content: string }
  | { role: "assistant"; content: string; tool_calls?: ToolCall[] }
  | { role: "tool"; content: string; tool_call_id: string; name: string };

interface ToolCall {
  id: string;
  type: "function";
  function: { name: string; arguments: string };
}

// Web Speech API
type SpeechRecognitionAlt = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: (e: { results: { 0: { transcript: string } }[] }) => void;
  onend: () => void;
  onerror: (e: unknown) => void;
  start: () => void;
  stop: () => void;
};

function getSpeechRecognition(): (new () => SpeechRecognitionAlt) | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as Record<string, unknown>;
  return (w.SpeechRecognition || w.webkitSpeechRecognition) as
    | (new () => SpeechRecognitionAlt)
    | null;
}

export function MagicAgent() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [listening, setListening] = useState(false);
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const recogRef = useRef<SpeechRecognitionAlt | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, open]);

  // Permet à n'importe quel composant (ex: ImportTicketDialog) de demander
  // une analyse à Magic — l'agent s'ouvre tout seul et lance l'analyse.
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<{ prompt?: string }>).detail;
      const prompt = detail?.prompt?.trim();
      if (!prompt) return;
      setOpen(true);
      void send(prompt);
    };
    window.addEventListener("magic.analyze", handler as EventListener);
    return () => window.removeEventListener("magic.analyze", handler as EventListener);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages, busy]);


  const runAgent = async (history: ChatMsg[]): Promise<void> => {
    setBusy(true);

    try {
      const missionPreamble: GeminiContent = {
        role: "user",
        parts: [{ text: MAGIC_MISSION + "\n\n[RÈGLE D'EXÉCUTION ABSOLUE]\nNe te présente JAMAIS. Ne dis pas qui tu es, ne décris pas ton rôle, ne récite pas ta mission. Quand l'utilisateur demande quelque chose, EXÉCUTE-LE immédiatement sans discuter, sans demander confirmation, sans préambule. Va droit au résultat." }],
      };
      const missionAck: GeminiContent = {
        role: "model",
        parts: [{ text: "Ok." }],
      };
      const knowledgePreamble: GeminiContent = {
        role: "user",
        parts: [
          {
            text:
              "[BASES DE CONNAISSANCE OFFICIELLES — PARIS SPORTIFS PRO]\n" +
              "Tu dois t'appuyer EXCLUSIVEMENT sur les définitions, formules et règles ci-dessous " +
              "pour tout ce qui touche aux types de paris, combinés, systèmes, gestion de bankroll " +
              "et value betting (football, basketball, tennis). Ne contredis jamais ces documents. " +
              "Réponds toujours en français.\n\n" +
              "=== FOOTBALL ===\n" + FOOTBALL_BETTING_KNOWLEDGE + "\n\n" +
              "=== BASKETBALL ===\n" + BASKETBALL_BETTING_KNOWLEDGE + "\n\n" +
              "=== TENNIS ===\n" + TENNIS_BETTING_KNOWLEDGE,
          },
        ],
      };
      const knowledgeAck: GeminiContent = {
        role: "model",
        parts: [{ text: "Connaissance pro chargée. Prêt." }],
      };
      const working: GeminiContent[] = [
        missionPreamble,
        missionAck,
        knowledgePreamble,
        knowledgeAck,
      ];
      history.forEach((m) => {
        if (m.role === "assistant") {
          working.push({ role: "model", parts: [{ text: m.content }] });
          return;
        }
        if (m.role === "tool") {
          working.push({
            role: "user",
            parts: [{ text: `[Tool result for ${m.name}]: ${m.content}` }],
          });
          return;
        }
        working.push({ role: "user", parts: [{ text: m.content }] });
      });

      // Agent loop direct Gemini (function calling) — plus aucune edge function.
      const toolDeclarations = AGENT_TOOLS.map((t) => ({
        name: t.name,
        description: t.description,
        parameters: t.parameters,
      }));

      for (let turn = 0; turn < 5; turn++) {
        const data = await callGeminiRaw(working, {
          model: "gemini-3-pro-preview",
          tools: toolDeclarations,
          temperature: 0.3,
          maxOutputTokens: 2048,
        });

        const candidate = data?.candidates?.[0];
        const parts: any[] = candidate?.content?.parts ?? [];
        const textPart = parts.find((p) => typeof p?.text === "string" && p.text.length);
        const functionCalls = parts.filter((p) => p?.functionCall);

        if (textPart?.text) {
          const content = textPart.text as string;
          setMessages((p) => [...p, { role: "assistant", content }]);
          working.push({ role: "model", parts: [{ text: content }] });
          speak(content);
        }

        if (!functionCalls.length) break;

        // Conserver les function calls dans l'historique pour que Gemini voie ses propres appels
        working.push({
          role: "model",
          parts: functionCalls.map((fc) => ({ functionCall: fc.functionCall })),
        });

        for (const fc of functionCalls) {
          const call = fc.functionCall as { name: string; args: Record<string, unknown> };
          const result = await agentBus.dispatch(call.name, call.args);
          const summary = `[${call.name}] ${result.ok ? "✓" : "✗"} ${result.message}`;
          setMessages((p) => [
            ...p,
            { role: "tool", name: call.name, tool_call_id: "id", content: summary },
          ]);
          working.push({
            role: "user",
            parts: [
              {
                functionResponse: {
                  name: call.name,
                  response: result as unknown as Record<string, unknown>,
                },
              },
            ],
          });
        }
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setMessages((p) => [...p, { role: "assistant", content: `⚠ Erreur agent: ${msg}` }]);
    } finally {
      setBusy(false);
    }
  };

  const send = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || busy) return;
    setInput("");
    const userMsg: ChatMsg = { role: "user", content: trimmed };
    const next = [...messages, userMsg];
    setMessages(next);
    await runAgent(next);
  };

  const toggleMic = () => {
    const Recog = getSpeechRecognition();
    if (!Recog) {
      setMessages((p) => [
        ...p,
        { role: "assistant", content: "Reconnaissance vocale non supportée." },
      ]);
      return;
    }
    if (listening) {
      recogRef.current?.stop();
      return;
    }
    const r = new Recog();
    r.lang = "fr-FR";
    r.onresult = (e) => {
      const transcript = e.results[0][0].transcript;
      setInput(transcript);
      setListening(false);
      send(transcript);
    };
    recogRef.current = r;
    setListening(true);
    r.start();
  };

  const speak = (text: string) => {
    if (typeof window === "undefined") return;
    void speakWithElevenLabs(text).then((ok) => {
      if (ok) return;
      if (!("speechSynthesis" in window)) return;
      const u = new SpeechSynthesisUtterance(text);
      u.lang = "fr-FR";
      u.rate = 1.05;
      const v = pickFrenchMaleVoice();
      if (v) u.voice = v;
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(u);
    });
  };

  return (
    <>
      {/* Bouton flottant */}
      <motion.button
        onClick={() => setOpen((o) => !o)}
        className="fixed bottom-20 right-4 z-50 h-14 w-14 rounded-full bg-gradient-prism shadow-prism flex items-center justify-center tap"
        whileTap={{ scale: 0.92 }}
      >
        <Sparkles className="h-6 w-6 text-primary-foreground" />
      </motion.button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.96 }}
            className="fixed bottom-36 right-4 left-4 sm:left-auto sm:w-[380px] z-50 glass-strong rounded-3xl overflow-hidden flex flex-col"
            style={{ maxHeight: "70vh" }}
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-border/50">
              <p className="text-xs font-bold text-foreground">Magic Agent V2</p>
              <button onClick={() => setOpen(false)} className="text-muted-foreground">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div
              ref={scrollRef}
              className="flex-1 overflow-y-auto px-3 py-3 space-y-2 scrollbar-none"
            >
              {messages.map((m, i) => (
                <div
                  key={i}
                  className={`max-w-[85%] px-3 py-2 rounded-2xl text-xs ${
                    m.role === "user"
                      ? "ml-auto bg-primary text-primary-foreground"
                      : "bg-muted text-foreground"
                  }`}
                >
                  {m.content}
                </div>
              ))}
              {busy && (
                <div className="flex items-center gap-2 text-[11px] text-muted-foreground px-2">
                  <Loader2 className="h-3 w-3 animate-spin" /> Magic réfléchit…
                </div>
              )}
            </div>
            <div className="p-3 border-t border-border/50 flex items-center gap-2">
              <button
                onClick={toggleMic}
                className={`h-10 w-10 rounded-full flex items-center justify-center ${
                  listening ? "bg-destructive" : "bg-muted"
                }`}
              >
                {listening ? <MicOff /> : <Mic />}
              </button>
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") send(input);
                }}
                className="flex-1 bg-muted/60 rounded-full px-4 py-2 text-xs outline-none"
              />
              <button
                onClick={() => send(input)}
                className="h-10 w-10 rounded-full bg-gradient-prism flex items-center justify-center"
              >
                <Send />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

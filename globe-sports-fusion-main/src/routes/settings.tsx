import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import { getGeminiKey, setApiKeys } from "@/lib/cotes-engine";

export const Route = createFileRoute("/settings")({
  component: SettingsPage,
});

function SettingsPage() {
  const [gemini, setGemini] = useState("");

  useEffect(() => {
    document.title = "Paramètres — Clés API";
    setGemini(getGeminiKey());
  }, []);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setApiKeys(gemini.trim(), "");
    toast({ title: "Clé enregistrée", description: "Stockée localement dans ce navigateur." });
  };

  const handleClear = () => {
    setApiKeys("", "");
    setGemini("");
    toast({ title: "Clé supprimée" });
  };

  return (
    <div className="min-h-[100dvh] bg-background p-4 sm:p-6 pt-[calc(env(safe-area-inset-top)+1rem)] pb-[calc(env(safe-area-inset-bottom)+1rem)] overflow-x-hidden">
      <div className="mx-auto max-w-2xl space-y-6">
        <div className="flex items-center justify-between gap-2">
          <h1 className="text-2xl sm:text-3xl font-bold">Paramètres</h1>
          <Button asChild variant="outline">
            <Link to="/">Retour</Link>
          </Button>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Source des matchs & cotes</CardTitle>
            <CardDescription>
              Magic utilise désormais <strong>Winamax</strong> directement comme source officielle
              pour les matchs et les cotes. Aucune clé API football n'est requise.
            </CardDescription>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Clé Gemini (optionnel)</CardTitle>
            <CardDescription>
              Utilisée uniquement pour les fonctions IA avancées. Stockée localement,
              jamais partagée.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="gemini">Clé Gemini</Label>
                <Input
                  id="gemini"
                  type="password"
                  autoComplete="off"
                  value={gemini}
                  onChange={(e) => setGemini(e.target.value)}
                />
              </div>
              <div className="flex gap-2">
                <Button type="submit">Enregistrer</Button>
                <Button type="button" variant="outline" onClick={handleClear}>
                  Effacer
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

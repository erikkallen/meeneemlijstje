"use client";

import { useState, use } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function JoinPage({ params }: { params: Promise<{ shareToken: string }> }) {
  const { shareToken } = use(params);
  const router = useRouter();
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);
    setError("");

    const res = await fetch("/api/guest/join", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ shareToken, name: name.trim() }),
    });

    setLoading(false);
    if (!res.ok) {
      const data = await res.json();
      setError(data.error === "List not found" ? "Lijst niet gevonden" : "Deelnemen mislukt");
      return;
    }

    router.push(`/join/${shareToken}/items`);
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Deelnemen aan de lijst</CardTitle>
          <CardDescription>Voer je naam in om te zien wat er meegenomen moet worden en om items te claimen.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1">
              <Label htmlFor="name">Jouw naam</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Erik"
                required
                autoFocus
              />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" className="w-full" disabled={loading || !name.trim()}>
              {loading ? "Bezig…" : "Bekijk de lijst"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

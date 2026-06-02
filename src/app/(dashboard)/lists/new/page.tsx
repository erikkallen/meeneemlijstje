"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeftIcon } from "lucide-react";

export default function NewListPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const form = new FormData(e.currentTarget);
    const res = await fetch("/api/lists", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.get("name"),
        description: form.get("description") || undefined,
      }),
    });

    setLoading(false);
    if (!res.ok) {
      setError("Lijst aanmaken mislukt");
      return;
    }

    const list = await res.json();
    router.push(`/lists/${list.id}`);
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center gap-3">
          <Link href="/dashboard" className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}>
            <ArrowLeftIcon className="w-4 h-4 mr-1" />
            Terug
          </Link>
          <h1 className="font-semibold">Nieuwe lijst</h1>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8">
        <Card className="max-w-lg">
          <CardHeader>
            <CardTitle>Lijst aanmaken</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1">
                <Label htmlFor="name">Lijstnaam</Label>
                <Input id="name" name="name" placeholder="Zomer BBQ" required />
              </div>
              <div className="space-y-1">
                <Label htmlFor="description">Omschrijving (optioneel)</Label>
                <Textarea
                  id="description"
                  name="description"
                  placeholder="Zaterdag 21 juni, 16u bij ons thuis"
                  rows={2}
                />
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
              <div className="flex gap-2">
                <Button type="submit" disabled={loading}>
                  {loading ? "Bezig…" : "Lijst aanmaken"}
                </Button>
                <Link href="/dashboard" className={cn(buttonVariants({ variant: "outline" }))}>
                  Annuleren
                </Link>
              </div>
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

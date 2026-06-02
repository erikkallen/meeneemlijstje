"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckIcon, PlusIcon, Loader2Icon } from "lucide-react";

type Category = { id: string; name: string; sortOrder: number };
type Item = {
  id: string;
  name: string;
  description: string | null;
  categoryId: string | null;
  quantityNeeded: number;
};
type ClaimRow = {
  id: string;
  itemId: string;
  guestSessionId: string | null;
  userId: string | null;
  quantity: number;
  claimerName?: string;
};
type ListData = {
  list: {
    id: string;
    name: string;
    description: string | null;
    allowMultipleClaimants: boolean;
    showWhoBrings: boolean;
  };
  categories: Category[];
  items: Item[];
  claims: ClaimRow[];
  currentGuestId: string | null;
};

export function GuestItemsView({
  shareToken,
  guestName,
}: {
  shareToken: string;
  guestName: string;
}) {
  const [data, setData] = useState<ListData | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    const res = await fetch(`/api/guest/list/${shareToken}`);
    if (res.ok) {
      const json = await res.json();
      setData(json);
    }
    setLoading(false);
  }, [shareToken]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // SSE: receive claim updates pushed by the server
  useEffect(() => {
    if (!data) return;
    const es = new EventSource(`/api/guest/list/${shareToken}/stream`);
    es.onmessage = (e) => {
      const claims = JSON.parse(e.data);
      setData((prev) => (prev ? { ...prev, claims } : prev));
    };
    es.onerror = () => es.close();
    return () => es.close();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shareToken, !data]);

  async function claim(itemId: string) {
    setActionLoading(itemId);
    const res = await fetch("/api/claims", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ itemId, quantity: 1 }),
    });
    if (res.ok) await fetchData();
    setActionLoading(null);
  }

  async function adjustQuantity(claimId: string, itemId: string, newQty: number) {
    setActionLoading(itemId);
    if (newQty === 0) {
      await fetch(`/api/claims/${claimId}`, { method: "DELETE" });
    } else {
      await fetch(`/api/claims/${claimId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quantity: newQty }),
      });
    }
    await fetchData();
    setActionLoading(null);
  }

  async function unclaim(claimId: string, itemId: string) {
    setActionLoading(itemId);
    await fetch(`/api/claims/${claimId}`, { method: "DELETE" });
    await fetchData();
    setActionLoading(null);
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2Icon className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">List not found.</p>
      </div>
    );
  }

  const { list, categories, items, claims, currentGuestId } = data;

  const myClaims = claims.filter((c) => c.guestSessionId === currentGuestId);

  function myClaimForItem(itemId: string) {
    return myClaims.find((c) => c.itemId === itemId);
  }

  function totalQuantityForItem(itemId: string) {
    return claims
      .filter((c) => c.itemId === itemId)
      .reduce((sum, c) => sum + (c.quantity ?? 1), 0);
  }

  function canClaim(item: Item) {
    const total = totalQuantityForItem(item.id);
    if (list.allowMultipleClaimants) return total < item.quantityNeeded;
    // Single-claimant mode: nobody else may have a claim
    return !claims.some((c) => c.itemId === item.id);
  }

  function canIncreaseQty(item: Item) {
    return totalQuantityForItem(item.id) + 1 <= item.quantityNeeded;
  }

  function claimersForItem(itemId: string): string[] {
    if (!list.showWhoBrings) return [];
    return claims
      .filter((c) => c.itemId === itemId && c.claimerName)
      .map((c) => c.claimerName!);
  }

  // Group items by category
  const catMap = Object.fromEntries(categories.map((c) => [c.id, c.name]));
  const grouped: Record<string, Item[]> = { uncategorized: [] };
  for (const cat of categories) grouped[cat.id] = [];
  for (const item of items) {
    const key = item.categoryId ?? "uncategorized";
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(item);
  }

  const orderedGroups = [
    ...categories.map((c) => ({ id: c.id, name: c.name })),
    { id: "uncategorized", name: "Overig" },
  ].filter((g) => (grouped[g.id] ?? []).length > 0);

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <h1 className="font-semibold text-lg">{list.name}</h1>
          {list.description && (
            <p className="text-sm text-muted-foreground mt-0.5">{list.description}</p>
          )}
          <p className="text-sm text-muted-foreground mt-1">
            Deelnemen als <span className="font-medium text-foreground">{guestName}</span>
            {myClaims.length > 0 && (
              <span className="ml-2">· neemt {myClaims.length} item{myClaims.length !== 1 ? "s" : ""} mee</span>
            )}
          </p>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {items.length === 0 && (
          <p className="text-center text-muted-foreground py-12">
            Er zijn nog geen items aan deze lijst toegevoegd.
          </p>
        )}

        {orderedGroups.map((group) => (
          <section key={group.id}>
            {orderedGroups.length > 1 && (
              <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">
                {group.name}
              </h2>
            )}
            <div className="space-y-2">
              {(grouped[group.id] ?? []).map((item) => {
                const myClaim = myClaimForItem(item.id);
                const total = totalQuantityForItem(item.id);
                const claimers = claimersForItem(item.id);
                const isFull = !canClaim(item) && !myClaim;
                const isLoading = actionLoading === item.id;

                return (
                  <Card
                    key={item.id}
                    className={`transition-colors ${myClaim ? "border-primary/40 bg-primary/5" : isFull ? "opacity-60" : ""}`}
                  >
                    <CardContent className="py-3 px-4 flex items-start gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`font-medium text-sm ${isFull && !myClaim ? "line-through text-muted-foreground" : ""}`}>
                            {item.name}
                          </span>
                          {item.quantityNeeded > 1 && (
                            <Badge variant="secondary" className="text-xs">
                              {list.allowMultipleClaimants
                                ? `${total}/${item.quantityNeeded}`
                                : `×${item.quantityNeeded}`}
                            </Badge>
                          )}
                          {isFull && !myClaim && (
                            <Badge variant="outline" className="text-xs">Geclaimd</Badge>
                          )}
                        </div>
                        {item.description && (
                          <p className="text-xs text-muted-foreground mt-0.5">{item.description}</p>
                        )}
                        {list.showWhoBrings && claimers.length > 0 && (
                          <p className="text-xs text-muted-foreground mt-1">
                            {claimers.join(", ")}
                          </p>
                        )}
                        {!list.showWhoBrings && total > 0 && (
                          <p className="text-xs text-muted-foreground mt-1">
                            {total} geclaimd
                          </p>
                        )}
                      </div>
                      <div className="shrink-0">
                        {myClaim ? (
                          <div className="flex items-center gap-1">
                            <Button
                              variant="outline"
                              size="sm"
                              className="w-7 h-7 p-0 text-base"
                              onClick={() => adjustQuantity(myClaim.id, item.id, (myClaim.quantity ?? 1) - 1)}
                              disabled={isLoading}
                            >
                              −
                            </Button>
                            <span className="w-6 text-center text-sm font-medium tabular-nums">
                              {isLoading ? <Loader2Icon className="w-3.5 h-3.5 animate-spin mx-auto" /> : (myClaim.quantity ?? 1)}
                            </span>
                            <Button
                              variant="outline"
                              size="sm"
                              className="w-7 h-7 p-0 text-base"
                              onClick={() => adjustQuantity(myClaim.id, item.id, (myClaim.quantity ?? 1) + 1)}
                              disabled={isLoading || !canIncreaseQty(item)}
                            >
                              +
                            </Button>
                          </div>
                        ) : (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => claim(item.id)}
                            disabled={isFull || isLoading}
                          >
                            {isLoading ? (
                              <Loader2Icon className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <PlusIcon className="w-3.5 h-3.5 mr-1" />
                            )}
                            Ik neem dit mee
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </section>
        ))}
      </main>
    </div>
  );
}

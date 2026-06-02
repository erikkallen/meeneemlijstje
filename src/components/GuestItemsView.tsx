"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Loader2Icon, CheckIcon } from "lucide-react";
import { cn } from "@/lib/utils";

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
    if (res.ok) setData(await res.json());
    setLoading(false);
  }, [shareToken]);

  useEffect(() => { fetchData(); }, [fetchData]);

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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2Icon className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Lijst niet gevonden.</p>
      </div>
    );
  }

  const { list, categories, items, claims, currentGuestId } = data;
  const myClaims = claims.filter((c) => c.guestSessionId === currentGuestId);
  const totalClaimed = new Set(claims.map((c) => c.itemId)).size;

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
    return !claims.some((c) => c.itemId === item.id);
  }

  function canIncreaseQty(item: Item) {
    return totalQuantityForItem(item.id) + 1 <= item.quantityNeeded;
  }

  function claimersForItem(itemId: string) {
    if (!list.showWhoBrings) return [];
    return claims
      .filter((c) => c.itemId === itemId && c.claimerName)
      .map((c) => ({ name: c.claimerName!, qty: c.quantity ?? 1, mine: c.guestSessionId === currentGuestId }));
  }

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

  const myTotal = myClaims.reduce((s, c) => s + (c.quantity ?? 1), 0);

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-background sticky top-0 z-10">
        <div className="max-w-xl mx-auto px-4 py-3">
          <h1 className="font-semibold">{list.name}</h1>
          {list.description && (
            <p className="text-xs text-muted-foreground mt-0.5">{list.description}</p>
          )}
          <div className="flex items-center gap-2 flex-wrap mt-1">
            <span className="text-xs text-muted-foreground">
              Deelnemen als <span className="font-medium text-foreground">{guestName}</span>
            </span>
            {myTotal > 0 && (
              <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-2 py-0.5">
                <CheckIcon className="w-3 h-3" />
                {myTotal} van jou
              </span>
            )}
            {items.length > 0 && (
              <span className={cn(
                "text-xs rounded-full px-2 py-0.5 border",
                totalClaimed === items.length
                  ? "text-amber-700 bg-amber-50 border-amber-200"
                  : totalClaimed > 0
                  ? "text-sky-700 bg-sky-50 border-sky-200"
                  : "text-muted-foreground border-transparent"
              )}>
                {totalClaimed}/{items.length} geregeld
              </span>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-xl mx-auto px-4 py-4">
        {items.length === 0 && (
          <p className="text-center text-muted-foreground py-16 text-sm">
            Er zijn nog geen items aan deze lijst toegevoegd.
          </p>
        )}

        <div className="space-y-6">
          {orderedGroups.map((group) => (
            <div key={group.id}>
              {orderedGroups.length > 1 && (
                <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground mb-1 px-1">
                  {group.name}
                </p>
              )}

              <div className="divide-y rounded-lg border overflow-hidden">
                {(grouped[group.id] ?? []).map((item) => {
                  const myClaim = myClaimForItem(item.id);
                  const total = totalQuantityForItem(item.id);
                  const claimers = claimersForItem(item.id);
                  const isFull = !canClaim(item) && !myClaim;
                  const isLoading = actionLoading === item.id;

                  // Quantity progress for multi-claimant items
                  const showProgress = list.allowMultipleClaimants && item.quantityNeeded > 1;
                  const progressColor =
                    total === 0 ? "text-muted-foreground"
                    : total >= item.quantityNeeded ? "text-amber-600 font-medium"
                    : "text-sky-600 font-medium";

                  return (
                    <div
                      key={item.id}
                      className={cn(
                        "flex items-center gap-3 px-3 py-2.5 transition-colors",
                        myClaim
                          ? "bg-emerald-50/60 border-l-2 border-l-emerald-500"
                          : isFull
                          ? "bg-amber-50/40 border-l-2 border-l-amber-300"
                          : "bg-background border-l-2 border-l-transparent"
                      )}
                    >
                      {/* Item info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-baseline gap-2 flex-wrap">
                          <span className={cn(
                            "text-sm font-medium leading-snug",
                            isFull && !myClaim && "line-through text-muted-foreground"
                          )}>
                            {item.name}
                          </span>

                          {showProgress && (
                            <span className={cn("text-xs tabular-nums", progressColor)}>
                              {total}/{item.quantityNeeded}
                            </span>
                          )}
                          {!list.allowMultipleClaimants && item.quantityNeeded > 1 && (
                            <span className="text-xs text-muted-foreground tabular-nums">
                              ×{item.quantityNeeded}
                            </span>
                          )}
                        </div>

                        {item.description && (
                          <p className="text-xs text-muted-foreground leading-snug mt-0.5">
                            {item.description}
                          </p>
                        )}

                        {list.showWhoBrings && claimers.length > 0 && (
                          <p className="text-xs mt-0.5 flex flex-wrap gap-x-1.5">
                            {claimers.map((c, i) => (
                              <span key={i} className={cn(
                                c.mine
                                  ? "text-emerald-700 font-medium"
                                  : "text-muted-foreground"
                              )}>
                                {c.name}{c.qty > 1 ? ` ×${c.qty}` : ""}
                              </span>
                            ))}
                          </p>
                        )}
                        {!list.showWhoBrings && total > 0 && (
                          <p className="text-xs text-amber-600 mt-0.5">{total} toegezegd</p>
                        )}
                      </div>

                      {/* Action */}
                      <div className="shrink-0">
                        {myClaim ? (
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => adjustQuantity(myClaim.id, item.id, (myClaim.quantity ?? 1) - 1)}
                              disabled={isLoading}
                              className="w-6 h-6 rounded border border-emerald-300 text-emerald-700 text-sm leading-none flex items-center justify-center hover:bg-emerald-100 disabled:opacity-40 transition-colors"
                            >
                              −
                            </button>
                            <span className="w-5 text-center text-sm font-semibold text-emerald-700 tabular-nums">
                              {isLoading
                                ? <Loader2Icon className="w-3 h-3 animate-spin mx-auto text-emerald-600" />
                                : (myClaim.quantity ?? 1)}
                            </span>
                            <button
                              onClick={() => adjustQuantity(myClaim.id, item.id, (myClaim.quantity ?? 1) + 1)}
                              disabled={isLoading || !canIncreaseQty(item)}
                              className="w-6 h-6 rounded border border-emerald-300 text-emerald-700 text-sm leading-none flex items-center justify-center hover:bg-emerald-100 disabled:opacity-40 transition-colors"
                            >
                              +
                            </button>
                          </div>
                        ) : isFull ? (
                          <span className="text-xs text-amber-600 font-medium px-2 py-1 bg-amber-50 border border-amber-200 rounded">
                            vergeven
                          </span>
                        ) : (
                          <button
                            onClick={() => claim(item.id)}
                            disabled={isLoading}
                            className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded border border-emerald-400 text-emerald-700 font-medium hover:bg-emerald-500 hover:text-white hover:border-emerald-500 transition-colors disabled:opacity-40"
                          >
                            {isLoading
                              ? <Loader2Icon className="w-3 h-3 animate-spin" />
                              : "neem ik mee"}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}

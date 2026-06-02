"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { PlusIcon, Trash2Icon, CopyIcon, CheckIcon, UsersIcon, PencilIcon, XIcon } from "lucide-react";
import type { List, Category, Item } from "@/lib/db/schema";
import { cn } from "@/lib/utils";

type GuestRow = { id: string; name: string };
type ClaimRow = {
  id: string;
  itemId: string;
  guestSessionId: string | null;
  userId: string | null;
  quantity: number;
};

interface Props {
  list: List;
  categories: Category[];
  items: Item[];
  claims: ClaimRow[];
  guests: GuestRow[];
  shareUrl: string;
}

type EditState = {
  name: string;
  description: string;
  categoryId: string;
  quantityNeeded: number;
};

export function ListAdminView({ list: initialList, categories: initialCategories, items: initialItems, claims: initialClaims, guests, shareUrl }: Props) {
  const [list, setList] = useState(initialList);
  const [categories, setCategories] = useState(initialCategories);
  const [items, setItems] = useState(initialItems);
  const [claims, setClaims] = useState(initialClaims);
  const [copied, setCopied] = useState(false);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editState, setEditState] = useState<EditState | null>(null);
  const [savingItemId, setSavingItemId] = useState<string | null>(null);

  const [editingCatId, setEditingCatId] = useState<string | null>(null);
  const [editCatName, setEditCatName] = useState("");

  const [newItemName, setNewItemName] = useState("");
  const [newItemDesc, setNewItemDesc] = useState("");
  const [newItemCategory, setNewItemCategory] = useState("none");
  const [newItemQty, setNewItemQty] = useState(1);
  const [addingItem, setAddingItem] = useState(false);

  const [newCatName, setNewCatName] = useState("");
  const [addingCat, setAddingCat] = useState(false);

  async function updateSetting(field: string, value: unknown) {
    const res = await fetch(`/api/lists/${list.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ [field]: value }),
    });
    if (res.ok) {
      const updated = await res.json();
      setList(updated);
    }
  }

  async function addCategory() {
    if (!newCatName.trim()) return;
    setAddingCat(true);
    const res = await fetch(`/api/lists/${list.id}/categories`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newCatName.trim(), sortOrder: categories.length }),
    });
    if (res.ok) {
      const cat = await res.json();
      setCategories([...categories, cat]);
      setNewCatName("");
    }
    setAddingCat(false);
  }

  async function deleteCategory(id: string) {
    await fetch(`/api/categories/${id}`, { method: "DELETE" });
    setCategories(categories.filter((c) => c.id !== id));
    setItems(items.map((i) => (i.categoryId === id ? { ...i, categoryId: null } : i)));
  }

  function startEditCat(cat: Category) {
    setEditingCatId(cat.id);
    setEditCatName(cat.name);
  }

  async function saveCatEdit(id: string) {
    if (!editCatName.trim()) return;
    const res = await fetch(`/api/categories/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: editCatName.trim() }),
    });
    if (res.ok) {
      const updated = await res.json();
      setCategories(categories.map((c) => (c.id === id ? updated : c)));
      setEditingCatId(null);
    }
  }

  async function addItem() {
    if (!newItemName.trim()) return;
    setAddingItem(true);
    const res = await fetch(`/api/lists/${list.id}/items`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: newItemName.trim(),
        description: newItemDesc.trim() || undefined,
        categoryId: newItemCategory !== "none" ? newItemCategory : undefined,
        quantityNeeded: newItemQty,
        sortOrder: items.length,
      }),
    });
    if (res.ok) {
      const item = await res.json();
      setItems([...items, item]);
      setNewItemName("");
      setNewItemDesc("");
      setNewItemCategory("none");
      setNewItemQty(1);
    }
    setAddingItem(false);
  }

  async function releaseClaim(id: string) {
    await fetch(`/api/claims/${id}`, { method: "DELETE" });
    setClaims(claims.filter((c) => c.id !== id));
  }

  async function deleteItem(id: string) {
    await fetch(`/api/items/${id}`, { method: "DELETE" });
    setItems(items.filter((i) => i.id !== id));
    setClaims(claims.filter((c) => c.itemId !== id));
    if (editingItemId === id) {
      setEditingItemId(null);
      setEditState(null);
    }
  }

  function startEdit(item: Item) {
    setEditingItemId(item.id);
    setEditState({
      name: item.name,
      description: item.description ?? "",
      categoryId: item.categoryId ?? "none",
      quantityNeeded: item.quantityNeeded,
    });
  }

  function cancelEdit() {
    setEditingItemId(null);
    setEditState(null);
  }

  async function saveEdit(itemId: string) {
    if (!editState || !editState.name.trim()) return;
    setSavingItemId(itemId);
    const res = await fetch(`/api/items/${itemId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: editState.name.trim(),
        description: editState.description.trim() || null,
        categoryId: editState.categoryId !== "none" ? editState.categoryId : null,
        quantityNeeded: editState.quantityNeeded,
      }),
    });
    if (res.ok) {
      const updated = await res.json();
      setItems(items.map((i) => (i.id === itemId ? updated : i)));
      setEditingItemId(null);
      setEditState(null);
    }
    setSavingItemId(null);
  }

  function copyLink() {
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function claimsForItem(itemId: string) {
    return claims.filter((c) => c.itemId === itemId);
  }

  function totalQuantityForItem(itemId: string) {
    return claims
      .filter((c) => c.itemId === itemId)
      .reduce((sum, c) => sum + (c.quantity ?? 1), 0);
  }

  function claimerName(claim: ClaimRow) {
    if (claim.guestSessionId) {
      return guests.find((g) => g.id === claim.guestSessionId)?.name ?? "Gast";
    }
    return "Jij";
  }

  const itemsByCategory: Record<string, Item[]> = { uncategorized: [] };
  for (const cat of categories) itemsByCategory[cat.id] = [];
  for (const item of items) {
    const key = item.categoryId ?? "uncategorized";
    if (!itemsByCategory[key]) itemsByCategory[key] = [];
    itemsByCategory[key].push(item);
  }

  function categoryLabel(catId: string) {
    if (catId === "none") return "Geen";
    return categories.find((c) => c.id === catId)?.name ?? "Geen";
  }

  return (
    <main className="max-w-4xl mx-auto px-4 py-8 space-y-8">
      {/* Deellink */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <UsersIcon className="w-4 h-4" />
            Deellink
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Input value={shareUrl} readOnly className="font-mono text-sm" />
            <Button variant="outline" size="sm" onClick={copyLink}>
              {copied ? <CheckIcon className="w-4 h-4" /> : <CopyIcon className="w-4 h-4" />}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Iedereen met deze link kan deelnemen als gast zonder account.
          </p>
        </CardContent>
      </Card>

      {/* Instellingen */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Instellingen</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Meerdere personen per item toestaan</p>
              <p className="text-xs text-muted-foreground">
                Wanneer ingeschakeld kunnen meerdere gasten hetzelfde item claimen (tot de benodigde hoeveelheid).
              </p>
            </div>
            <Switch
              checked={list.allowMultipleClaimants}
              onCheckedChange={(v) => updateSetting("allowMultipleClaimants", v)}
            />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Toon wie wat meeneemt</p>
              <p className="text-xs text-muted-foreground">
                Wanneer uitgeschakeld zien gasten alleen dat een item geclaimd is, niet door wie.
              </p>
            </div>
            <Switch
              checked={list.showWhoBrings}
              onCheckedChange={(v) => updateSetting("showWhoBrings", v)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Categorieën */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Categorieën</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {categories.length === 0 && (
            <p className="text-sm text-muted-foreground">Nog geen categorieën.</p>
          )}
          {categories.map((cat) =>
            editingCatId === cat.id ? (
              <div key={cat.id} className="flex items-center gap-2">
                <Input
                  value={editCatName}
                  onChange={(e) => setEditCatName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") saveCatEdit(cat.id);
                    if (e.key === "Escape") setEditingCatId(null);
                  }}
                  className="h-7 text-sm flex-1"
                  autoFocus
                />
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => saveCatEdit(cat.id)}
                  disabled={!editCatName.trim()}
                  className="px-2"
                >
                  <CheckIcon className="w-3.5 h-3.5" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setEditingCatId(null)}
                  className="px-2 text-muted-foreground"
                >
                  <XIcon className="w-3.5 h-3.5" />
                </Button>
              </div>
            ) : (
              <div key={cat.id} className="flex items-center justify-between">
                <span className="text-sm">{cat.name}</span>
                <div className="flex gap-0.5">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => startEditCat(cat)}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <PencilIcon className="w-3.5 h-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => deleteCategory(cat.id)}
                    className="text-muted-foreground hover:text-destructive"
                  >
                    <Trash2Icon className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            )
          )}
          <Separator />
          <div className="flex gap-2">
            <Input
              placeholder="Categorienaam"
              value={newCatName}
              onChange={(e) => setNewCatName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addCategory()}
              className="h-8 text-sm"
            />
            <Button size="sm" variant="outline" onClick={addCategory} disabled={addingCat || !newCatName.trim()}>
              <PlusIcon className="w-4 h-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Items */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-2">
            <CardTitle className="text-base">Items</CardTitle>
            {items.length > 0 && (() => {
              const claimedCount = new Set(claims.map((c) => c.itemId)).size;
              return (
                <span className={cn(
                  "text-xs rounded-full px-2 py-0.5 border font-medium",
                  claimedCount === items.length
                    ? "text-amber-700 bg-amber-50 border-amber-200"
                    : claimedCount > 0
                    ? "text-emerald-700 bg-emerald-50 border-emerald-200"
                    : "text-muted-foreground border-transparent"
                )}>
                  {claimedCount}/{items.length} geregeld
                </span>
              );
            })()}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {items.length === 0 && (
            <p className="text-sm text-muted-foreground">Nog geen items. Voeg hieronder het eerste toe.</p>
          )}

          {[...categories, { id: "uncategorized", name: "Geen categorie" }].map((cat) => {
            const catItems = itemsByCategory[cat.id] ?? [];
            if (catItems.length === 0) return null;
            return (
              <div key={cat.id}>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
                  {cat.name}
                </p>
                <div className="space-y-1">
                  {catItems.map((item) => {
                    const itemClaims = claimsForItem(item.id);
                    const totalClaimed = totalQuantityForItem(item.id);
                    const isFull = totalClaimed >= item.quantityNeeded;
                    const isPartial = totalClaimed > 0 && !isFull;
                    const isEditing = editingItemId === item.id;

                    if (isEditing && editState) {
                      return (
                        <div key={item.id} className="border rounded-md p-3 space-y-2 bg-muted/30">
                          <div className="grid grid-cols-2 gap-2">
                            <div className="col-span-2 space-y-1">
                              <Label className="text-xs">Naam</Label>
                              <Input
                                value={editState.name}
                                onChange={(e) => setEditState({ ...editState, name: e.target.value })}
                                className="h-8 text-sm"
                                autoFocus
                              />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs">Categorie</Label>
                              <Select
                                value={editState.categoryId}
                                onValueChange={(v) => setEditState({ ...editState, categoryId: v ?? "none" })}
                              >
                                <SelectTrigger className="h-8 text-sm">
                                  <span className="flex flex-1 text-left text-sm">
                                    {categoryLabel(editState.categoryId)}
                                  </span>
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="none">Geen</SelectItem>
                                  {categories.map((c) => (
                                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs">Benodigde hoeveelheid</Label>
                              <Input
                                type="number"
                                min={1}
                                value={editState.quantityNeeded}
                                onChange={(e) => setEditState({ ...editState, quantityNeeded: Number(e.target.value) })}
                                className="h-8 text-sm"
                              />
                            </div>
                            <div className="col-span-2 space-y-1">
                              <Label className="text-xs">Omschrijving (optioneel)</Label>
                              <Textarea
                                value={editState.description}
                                onChange={(e) => setEditState({ ...editState, description: e.target.value })}
                                rows={1}
                                className="text-sm"
                              />
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              onClick={() => saveEdit(item.id)}
                              disabled={savingItemId === item.id || !editState.name.trim()}
                            >
                              <CheckIcon className="w-3.5 h-3.5 mr-1" />
                              {savingItemId === item.id ? "Opslaan…" : "Opslaan"}
                            </Button>
                            <Button size="sm" variant="ghost" onClick={cancelEdit}>
                              <XIcon className="w-3.5 h-3.5 mr-1" />
                              Annuleren
                            </Button>
                          </div>
                        </div>
                      );
                    }

                    return (
                      <div
                        key={item.id}
                        className={cn(
                          "flex items-start justify-between gap-2 py-1.5 px-2 rounded-md border-l-2 transition-colors",
                          isFull
                            ? "border-l-amber-400 bg-amber-50/50 hover:bg-amber-50"
                            : isPartial
                            ? "border-l-emerald-500 bg-emerald-50/40 hover:bg-emerald-50/60"
                            : "border-l-transparent hover:bg-muted/50"
                        )}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={cn(
                              "text-sm font-medium",
                              isFull && "text-muted-foreground"
                            )}>
                              {item.name}
                            </span>

                            {/* quantity / progress */}
                            {item.quantityNeeded > 1 && (
                              <span className={cn(
                                "text-xs tabular-nums font-medium",
                                isFull ? "text-amber-600"
                                : isPartial ? "text-emerald-600"
                                : "text-muted-foreground"
                              )}>
                                {list.allowMultipleClaimants
                                  ? `${totalClaimed}/${item.quantityNeeded}`
                                  : `×${item.quantityNeeded}`}
                              </span>
                            )}

                            {/* claimer chips */}
                            {itemClaims.map((claim) => (
                              <span
                                key={claim.id}
                                className="inline-flex items-center gap-1 text-xs bg-emerald-100 text-emerald-800 border border-emerald-200 px-1.5 py-0.5 rounded-full"
                              >
                                {claimerName(claim)}
                                {claim.quantity > 1 && (
                                  <span className="text-emerald-600">×{claim.quantity}</span>
                                )}
                                <button
                                  onClick={() => releaseClaim(claim.id)}
                                  className="text-emerald-500 hover:text-red-500 ml-0.5 leading-none transition-colors"
                                  title="Claim vrijgeven"
                                >
                                  <XIcon className="w-3 h-3" />
                                </button>
                              </span>
                            ))}

                            {/* full indicator when no showWhoBrings context */}
                            {isFull && itemClaims.length === 0 && (
                              <span className="text-xs text-amber-600 font-medium">vergeven</span>
                            )}
                          </div>
                          {item.description && (
                            <p className="text-xs text-muted-foreground mt-0.5">{item.description}</p>
                          )}
                        </div>
                        <div className="flex gap-0.5 shrink-0">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => startEdit(item)}
                            className="text-muted-foreground hover:text-foreground"
                          >
                            <PencilIcon className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deleteItem(item.id)}
                            className="text-muted-foreground hover:text-destructive"
                          >
                            <Trash2Icon className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}

          <Separator />

          <div className="space-y-3">
            <p className="text-sm font-medium">Item toevoegen</p>
            <div className="grid grid-cols-2 gap-2">
              <div className="col-span-2 space-y-1">
                <Label htmlFor="newItemName" className="text-xs">Naam</Label>
                <Input
                  id="newItemName"
                  placeholder="Hamburgers"
                  value={newItemName}
                  onChange={(e) => setNewItemName(e.target.value)}
                  className="h-8 text-sm"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Categorie</Label>
                <Select value={newItemCategory} onValueChange={(v) => setNewItemCategory(v ?? "none")}>
                  <SelectTrigger className="h-8 text-sm">
                    <span className="flex flex-1 text-left text-sm">
                      {categoryLabel(newItemCategory)}
                    </span>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Geen</SelectItem>
                    {categories.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label htmlFor="newItemQty" className="text-xs">Benodigde hoeveelheid</Label>
                <Input
                  id="newItemQty"
                  type="number"
                  min={1}
                  value={newItemQty}
                  onChange={(e) => setNewItemQty(Number(e.target.value))}
                  className="h-8 text-sm"
                />
              </div>
              <div className="col-span-2 space-y-1">
                <Label htmlFor="newItemDesc" className="text-xs">Omschrijving (optioneel)</Label>
                <Textarea
                  id="newItemDesc"
                  placeholder="Eventuele opmerkingen…"
                  value={newItemDesc}
                  onChange={(e) => setNewItemDesc(e.target.value)}
                  rows={1}
                  className="text-sm"
                />
              </div>
            </div>
            <Button
              onClick={addItem}
              disabled={addingItem || !newItemName.trim()}
              size="sm"
            >
              <PlusIcon className="w-4 h-4 mr-1" />
              Item toevoegen
            </Button>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}

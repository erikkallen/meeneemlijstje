"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Trash2Icon } from "lucide-react";

export function DeleteListButton({ listId }: { listId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleDelete() {
    if (!confirm("Verwijder deze lijst en alle items? Dit kan niet ongedaan worden gemaakt.")) return;
    setLoading(true);
    await fetch(`/api/lists/${listId}`, { method: "DELETE" });
    router.refresh();
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleDelete}
      disabled={loading}
      className="text-muted-foreground hover:text-destructive"
    >
      <Trash2Icon className="w-3.5 h-3.5" />
    </Button>
  );
}

import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { lists } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PlusIcon } from "lucide-react";
import { DeleteListButton } from "@/components/DeleteListButton";
import { SignOutButton } from "@/components/SignOutButton";

export default async function DashboardPage() {
  const session = await auth();
  if (!session) redirect("/auth/login");

  const userLists = await db
    .select()
    .from(lists)
    .where(eq(lists.ownerId, session.user.id))
    .orderBy(lists.createdAt);

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="font-semibold text-lg">Meeneemlijstje</h1>
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground">{session.user.name}</span>
            <SignOutButton />
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold">Jouw lijsten</h2>
          <Link href="/lists/new" className={cn(buttonVariants({ size: "sm" }))}>
            <PlusIcon className="w-4 h-4 mr-1" />
            Nieuwe lijst
          </Link>
        </div>

        {userLists.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <p className="mb-4">Je hebt nog geen lijsten.</p>
            <Link href="/lists/new" className={cn(buttonVariants({ variant: "outline" }))}>
              Maak je eerste lijst
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {userLists.map((list) => (
              <Card key={list.id}>
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <CardTitle className="text-base">
                        <Link href={`/lists/${list.id}`} className="hover:underline">
                          {list.name}
                        </Link>
                      </CardTitle>
                      {list.description && (
                        <CardDescription className="mt-0.5">{list.description}</CardDescription>
                      )}
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <Link
                        href={`/lists/${list.id}`}
                        className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
                      >
                        Beheren
                      </Link>
                      <DeleteListButton listId={list.id} />
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0 pb-3">
                  <p className="text-xs text-muted-foreground">
                    Deellink: <code className="text-xs bg-muted px-1 rounded">/join/{list.shareToken}</code>
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

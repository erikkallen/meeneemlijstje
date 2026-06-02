import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function HomePage() {
  const session = await auth();
  if (session) redirect("/dashboard");

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
          <span className="font-semibold">Meeneemlijstje</span>
          <div className="flex gap-2">
            <Link href="/auth/login" className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}>
              Inloggen
            </Link>
            <Link href="/auth/register" className={cn(buttonVariants({ size: "sm" }))}>
              Registreren
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center px-4 text-center">
        <h1 className="text-4xl font-bold tracking-tight mb-4">
          Gedeelde meeneemlijstjes voor elk evenement
        </h1>
        <p className="text-lg text-muted-foreground max-w-md mb-8">
          Maak een lijst voor je BBQ, feest of etentje. Deel een link — gasten kiezen wat ze meenemen zonder account.
        </p>
        <div className="flex gap-3">
          <Link href="/auth/register" className={cn(buttonVariants({ size: "lg" }))}>
            Gratis beginnen
          </Link>
          <Link href="/auth/login" className={cn(buttonVariants({ variant: "outline", size: "lg" }))}>
            Inloggen
          </Link>
        </div>
      </main>

      <footer className="border-t py-4 text-center text-xs text-muted-foreground">
        Meeneemlijstje — voor eenvoudige evenementencoördinatie
      </footer>
    </div>
  );
}

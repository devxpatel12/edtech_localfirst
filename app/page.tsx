import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { buttonVariants } from "@/components/ui/button";
import { SiteFooter } from "@/components/site-footer";
import { APP_NAME } from "@/lib/constants";
import { cn } from "@/lib/utils";

export default async function HomePage() {
  const session = await auth();
  if (session?.user) redirect("/dashboard");

  return (
    <div className="flex min-h-full flex-1 flex-col">
      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col justify-center gap-8 px-4 py-16">
        <div className="space-y-4">
          <p className="text-sm font-medium text-muted-foreground">Local-first collaboration</p>
          <h1 className="max-w-2xl text-4xl font-semibold tracking-tight sm:text-5xl">
            {APP_NAME} keeps your documents fast offline and consistent online.
          </h1>
          <p className="max-w-2xl text-lg text-muted-foreground">
            Edit without waiting on the network, sync in the background, resolve conflicts
            deterministically, and travel through version history safely.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link href="/register" className={cn(buttonVariants())}>
            Get started
          </Link>
          <Link href="/login" className={cn(buttonVariants({ variant: "outline" }))}>
            Sign in
          </Link>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}

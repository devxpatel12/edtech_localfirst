import Link from "next/link";
import { WifiOff } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const metadata = {
  title: "Offline",
};

export default function OfflinePage() {
  return (
    <div className="flex min-h-full flex-1 flex-col items-center justify-center gap-4 px-4 py-16 text-center">
      <span className="flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
        <WifiOff className="size-6" aria-hidden />
      </span>
      <div className="space-y-1">
        <h1 className="text-xl font-semibold">You&apos;re offline</h1>
        <p className="max-w-sm text-sm text-muted-foreground">
          This page hasn&apos;t been cached yet. Documents you&apos;ve already opened stay available
          offline and any edits sync automatically once you reconnect.
        </p>
      </div>
      <Link href="/dashboard" className={cn(buttonVariants({ variant: "outline" }))}>
        Back to documents
      </Link>
    </div>
  );
}

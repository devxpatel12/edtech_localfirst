"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function DocumentError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-full flex-1 flex-col items-center justify-center gap-4 px-4 py-16 text-center">
      <span className="flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
        <AlertTriangle className="size-6" aria-hidden />
      </span>
      <div className="space-y-1">
        <h1 className="text-xl font-semibold">Couldn&apos;t open this document</h1>
        <p className="max-w-sm text-sm text-muted-foreground">
          The server was briefly unreachable. Any edits saved on this device are preserved and will
          sync once you retry.
        </p>
      </div>
      <div className="flex gap-2">
        <Button onClick={() => reset()}>
          <RefreshCw className="size-4" />
          Try again
        </Button>
        <Link href="/dashboard" className={cn(buttonVariants({ variant: "outline" }))}>
          Back to documents
        </Link>
      </div>
    </div>
  );
}

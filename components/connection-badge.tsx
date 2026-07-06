"use client";

import { Wifi, WifiOff, RefreshCw, AlertCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { ConnectionState } from "@/types/documents";
import { cn } from "@/lib/utils";

const labels: Record<ConnectionState, string> = {
  online: "Online",
  offline: "Offline",
  syncing: "Syncing",
  error: "Sync issue",
};

const icons: Record<ConnectionState, React.ReactNode> = {
  online: <Wifi className="size-3.5" aria-hidden />,
  offline: <WifiOff className="size-3.5" aria-hidden />,
  syncing: <RefreshCw className="size-3.5 animate-spin" aria-hidden />,
  error: <AlertCircle className="size-3.5" aria-hidden />,
};

export function ConnectionBadge({ state }: { state: ConnectionState }) {
  return (
    <Badge
      variant="outline"
      className={cn(
        "gap-1.5",
        state === "online" && "border-emerald-500/40 text-emerald-700 dark:text-emerald-400",
        state === "offline" && "border-amber-500/40 text-amber-700 dark:text-amber-400",
        state === "syncing" && "border-sky-500/40 text-sky-700 dark:text-sky-400",
        state === "error" && "border-destructive/40 text-destructive",
      )}
      aria-live="polite"
    >
      {icons[state]}
      {labels[state]}
    </Badge>
  );
}

import Link from "next/link";
import { PROFILE } from "@/lib/constants";

export function SiteFooter() {
  return (
    <footer className="border-t bg-background">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-2 px-4 py-6 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
        <p>
          Built by <span className="font-medium text-foreground">{PROFILE.name}</span>
        </p>
        <div className="flex items-center gap-4">
          <Link href={PROFILE.github} className="hover:text-foreground" target="_blank" rel="noreferrer">
            GitHub
          </Link>
          <Link href={PROFILE.linkedin} className="hover:text-foreground" target="_blank" rel="noreferrer">
            LinkedIn
          </Link>
        </div>
      </div>
    </footer>
  );
}

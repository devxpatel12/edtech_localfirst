"use client";

import { useRouter } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { LogOut } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";

type Props = {
  showSignOut?: boolean;
};

export function HeaderUser({ showSignOut = false }: Props) {
  const router = useRouter();
  const { data: session } = useSession();
  const name = session?.user?.name?.trim() || session?.user?.email || "User";
  const initial = name.charAt(0).toUpperCase();

  async function handleSignOut() {
    await signOut({ redirect: false });
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-2">
        <Avatar size="sm">
          <AvatarFallback>{initial}</AvatarFallback>
        </Avatar>
        <span className="max-w-[140px] truncate text-sm font-medium sm:max-w-[200px]">{name}</span>
      </div>
      {showSignOut ? (
        <Button variant="outline" size="sm" onClick={() => void handleSignOut()}>
          <LogOut className="size-4" />
          <span className="hidden sm:inline">Sign out</span>
        </Button>
      ) : null}
    </div>
  );
}

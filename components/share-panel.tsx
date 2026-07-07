"use client";

import { useEffect, useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

type Member = {
  id: string;
  userId: string;
  name: string;
  email: string;
  role: string;
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  documentId: string;
};

export function SharePanel({ open, onOpenChange, documentId }: Props) {
  const [members, setMembers] = useState<Member[]>([]);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"EDITOR" | "VIEWER">("EDITOR");

  useEffect(() => {
    if (!open) return;
    void loadMembers();
  }, [open, documentId]);

  async function loadMembers() {
    const response = await fetch(`/api/docs/${documentId}/members`);
    if (!response.ok) return;
    const payload = (await response.json()) as { members: Member[] };
    setMembers(payload.members);
  }

  async function invite() {
    const response = await fetch(`/api/docs/${documentId}/members`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, role }),
    });
    if (!response.ok) {
      const payload = (await response.json()) as { error?: string };
      toast.error(payload.error ?? "Invite failed");
      return;
    }
    setEmail("");
    toast.success("Member updated");
    void loadMembers();
  }

  async function changeRole(memberId: string, nextRole: "EDITOR" | "VIEWER") {
    const previous = members;
    setMembers((current) =>
      current.map((member) =>
        member.id === memberId ? { ...member, role: nextRole } : member,
      ),
    );

    const response = await fetch(`/api/docs/${documentId}/members/${memberId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role: nextRole }),
    });

    if (!response.ok) {
      const payload = (await response.json()) as { error?: string };
      toast.error(payload.error ?? "Could not update role");
      setMembers(previous);
      return;
    }
    toast.success("Role updated");
  }

  async function removeMember(memberId: string) {
    const previous = members;
    setMembers((current) => current.filter((member) => member.id !== memberId));

    const response = await fetch(`/api/docs/${documentId}/members/${memberId}`, {
      method: "DELETE",
    });

    if (!response.ok) {
      const payload = (await response.json()) as { error?: string };
      toast.error(payload.error ?? "Could not remove member");
      setMembers(previous);
      return;
    }
    toast.success("Member removed");
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Share document</SheetTitle>
          <SheetDescription>Owners can invite editors and viewers.</SheetDescription>
        </SheetHeader>

        <div className="mt-4 space-y-3">
          <Input
            type="email"
            placeholder="colleague@company.com"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            aria-label="Member email"
          />
          <Select value={role} onValueChange={(value) => setRole(value as "EDITOR" | "VIEWER")}>
            <SelectTrigger aria-label="Member role">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="EDITOR">Editor</SelectItem>
              <SelectItem value="VIEWER">Viewer</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={() => void invite()} disabled={!email.trim()}>
            Send invite
          </Button>
        </div>

        <ul className="mt-6 space-y-2">
          {members.map((member) => (
            <li
              key={member.id}
              className="flex items-center justify-between gap-3 rounded-md border px-3 py-2"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{member.name}</p>
                <p className="truncate text-xs text-muted-foreground">{member.email}</p>
              </div>

              {member.role === "OWNER" ? (
                <Badge variant="secondary">owner</Badge>
              ) : (
                <div className="flex shrink-0 items-center gap-1.5">
                  <Select
                    value={member.role}
                    onValueChange={(value) =>
                      void changeRole(member.id, value as "EDITOR" | "VIEWER")
                    }
                  >
                    <SelectTrigger size="sm" aria-label={`Role for ${member.email}`}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="EDITOR">Editor</SelectItem>
                      <SelectItem value="VIEWER">Viewer</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`Remove ${member.email}`}
                    onClick={() => void removeMember(member.id)}
                  >
                    <Trash2 className="size-4 text-destructive" />
                  </Button>
                </div>
              )}
            </li>
          ))}
        </ul>
      </SheetContent>
    </Sheet>
  );
}

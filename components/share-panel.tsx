"use client";

import { useEffect, useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
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
            <li key={member.id} className="flex items-center justify-between rounded-md border px-3 py-2">
              <div>
                <p className="text-sm font-medium">{member.name}</p>
                <p className="text-xs text-muted-foreground">{member.email}</p>
              </div>
              <Badge variant="secondary">{member.role.toLowerCase()}</Badge>
            </li>
          ))}
        </ul>
      </SheetContent>
    </Sheet>
  );
}

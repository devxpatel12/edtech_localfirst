import NextAuth from "next-auth";
import { authConfig } from "@/lib/auth.config";
import { ensureAuthUrl } from "@/lib/auth-url";

ensureAuthUrl();

export const { handlers, auth, signIn, signOut } = NextAuth(authConfig);

import { PrismaClient } from "@prisma/client";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

function loadEnvLocal() {
  const raw = readFileSync(resolve(process.cwd(), ".env.local"), "utf8");
  for (const line of raw.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const idx = trimmed.indexOf("=");
    if (idx === -1) continue;
    process.env[trimmed.slice(0, idx)] ??= trimmed.slice(idx + 1);
  }
}

loadEnvLocal();

const directUrl = process.env.DIRECT_URL ?? "";
const projectRef = directUrl.match(/db\.([^.]+)\.supabase\.co/)?.[1];
const passwordMatch = directUrl.match(/postgres:([^@]+)@/);
const password = passwordMatch ? decodeURIComponent(passwordMatch[1]) : "";

if (!projectRef || !password) {
  console.error("Could not parse DIRECT_URL in .env.local");
  process.exit(1);
}

const encoded = encodeURIComponent(password);
const regions = [
  "ap-south-1",
  "us-east-1",
  "eu-west-1",
  "ap-southeast-1",
  "eu-central-1",
];

const hosts = ["aws-0", "aws-1"];
const ports = [
  { port: 5432, suffix: "" },
  { port: 6543, suffix: "?pgbouncer=true" },
];

for (const host of hosts) {
  for (const region of regions) {
    for (const { port, suffix } of ports) {
      const url = `postgresql://postgres.${projectRef}:${encoded}@${host}-${region}.pooler.supabase.com:${port}/postgres${suffix}`;
      const prisma = new PrismaClient({ datasources: { db: { url } } });
      try {
        await prisma.$queryRaw`SELECT 1`;
        console.log("WORKING");
        console.log(`host=${host} region=${region} port=${port}`);
        process.exit(0);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.log(`${host}-${region}:${port} -> ${message.replace(/\s+/g, " ").slice(0, 120)}`);
      } finally {
        await prisma.$disconnect();
      }
    }
  }
}

console.log("No pooler worked. Open Supabase Dashboard and restore/unpause the project.");

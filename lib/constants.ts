export const APP_NAME = "Draftboard";

export const PROFILE = {
  name: process.env.NEXT_PUBLIC_AUTHOR_NAME ?? "Surendra Patel",
  github: process.env.NEXT_PUBLIC_GITHUB_URL ?? "https://github.com/devxpatel12",
  linkedin: process.env.NEXT_PUBLIC_LINKEDIN_URL ?? "https://linkedin.com/in/surendrakumar143/",
};

export const SYNC_DEBOUNCE_MS = 600;
export const SYNC_POLL_MS = 8_000;
export const SNAPSHOT_INTERVAL_MS = 30_000;
export const MAX_OPS_PER_SYNC = 200;
export const MAX_OP_TEXT_LENGTH = 10_000;
export const MAX_PAYLOAD_BYTES = 512_000;
export const MAX_DOCUMENT_LENGTH = 500_000;

export const APP_NAME = "Draftboard";

export const PROFILE = {
  name: process.env.NEXT_PUBLIC_AUTHOR_NAME ?? "Your Name",
  github: process.env.NEXT_PUBLIC_GITHUB_URL ?? "https://github.com/yourusername",
  linkedin: process.env.NEXT_PUBLIC_LINKEDIN_URL ?? "https://linkedin.com/in/yourusername",
};

export const SYNC_DEBOUNCE_MS = 400;
export const SNAPSHOT_INTERVAL_MS = 30_000;
export const MAX_OPS_PER_SYNC = 200;
export const MAX_OP_TEXT_LENGTH = 10_000;
export const MAX_PAYLOAD_BYTES = 512_000;
export const MAX_DOCUMENT_LENGTH = 500_000;

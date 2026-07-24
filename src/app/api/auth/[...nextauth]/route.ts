import { handlers } from "@/auth";

// The jwt callback provisions the local user record, so this must run on Node.
export const runtime = "nodejs";

export const { GET, POST } = handlers;

// server/trpc.ts
import { initTRPC } from "@trpc/server";

const t = initTRPC.create({
  errorFormatter({ shape, error }) {
    return {
      ...shape,
      message: error.message, // override default
      stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
    };
  },
});

export const router = t.router;
export const publicProcedure = t.procedure;
export type Context = {
    user: {
        userId: number
    }
}; // Add auth/session later if needed

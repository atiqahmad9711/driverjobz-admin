// server/trpc.ts
import { initTRPC, TRPCError } from "@trpc/server";
import type { PrismaClient } from "@prisma/client";

const t = initTRPC.context<Context>().create({
  errorFormatter({ shape, error }) {
    return {
      ...shape,
      message: error.message,
      stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
    };
  },
});

// Base router and procedure helpers
export const router = t.router;
export const publicProcedure = t.procedure;

// Protected procedure (requires authentication)
export const protectedProcedure = t.procedure.use(
  t.middleware(({ ctx, next }) => {
    // if (!ctx.user) {
    //   throw new TRPCError({ code: 'UNAUTHORIZED' });
    // }
    return next({
      ctx: {
        ...ctx,
        user: ctx.user,
      },
    });
  })
);

export type Context = {
  user?: {
    userId: number;
  };
  prisma: PrismaClient;
};

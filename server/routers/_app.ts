// server/routers/_app.ts
import { router } from "../trpc";
import { appRouter as exampleRouter } from "./example";

export const appRouter = router({
  example: exampleRouter,
});

export type AppRouter = typeof appRouter;

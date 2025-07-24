// server/routers/_app.ts
import { router } from "../trpc";
import { appRouter as exampleRouter } from "./example";
import { appRouter as categoryRouter } from "./category";
import { formValuesRouter } from "./form-values";
import { authRouter } from "./auth";

export const appRouter = router({
  example: exampleRouter,
  category: categoryRouter,
  formValues: formValuesRouter,
  auth: authRouter,
});

export type AppRouter = typeof appRouter;

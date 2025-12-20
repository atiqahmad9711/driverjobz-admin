// server/routers/_app.ts
import { router } from "../trpc";
import { appRouter as exampleRouter } from "./example";
import { categoryRouter } from "./category";
import { formValuesRouter } from "./form-values";
import { authRouter } from "./auth";
import { dashboardRouter } from "./dashboard";
import { driverManagementRouter } from "./driver-management";
import { driverActivationRouter } from "./driver-activation";
import { driverReportsRouter } from "./driver-reports";
import { employerManagementRouter } from "./employer-management";
import { employerActivationRouter } from "./employer-activation";
import { jobManagementRouter } from "./job-management";
import { jobReportsRouter } from "./job-reports";
import { adminRouter } from "./admin";

export const appRouter = router({
  example: exampleRouter,
  category: categoryRouter,
  formValues: formValuesRouter,
  auth: authRouter,
  dashboard: dashboardRouter,
  driverManagement: driverManagementRouter,
  driverActivation: driverActivationRouter,
  driverReports: driverReportsRouter,
  employerManagement: employerManagementRouter,
  employerActivation: employerActivationRouter,
  jobManagement: jobManagementRouter,
  jobReports: jobReportsRouter,
  admin: adminRouter,
});

export type AppRouter = typeof appRouter;

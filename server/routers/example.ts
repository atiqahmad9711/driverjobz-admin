// server/routers/example.ts
import { z } from "zod";
import { publicProcedure, router } from "../trpc";
import prisma from "@/util/prismaClient";

export const appRouter = router({
  hello: publicProcedure
    .input(z.object({ name: z.string().optional() }))
    .query(({ input }) => {
      return {
        message: `Hello, ${input.name ?? "World"}!`,
      };
    }),
  getFormFields: publicProcedure
    .input(z.object({ categorySlug: z.string() }))
    .query(async ({ input }) => {
      const formFields = await prisma.formField.findMany({
        where: {
          formValues: {
            some: {
              inCategorySlug: {
                has: input.categorySlug,
              },
            },
          },
        },

        include: {
          formValues: {
            where: {
              inCategorySlug: {
                has: input.categorySlug,
              },
            },
          },
        },
      });
      
      return formFields;
    }),
});

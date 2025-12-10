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
    .input(
      z.object({
        categorySlug: z.string(),
        type: z.enum(["job", "driver"]).optional().nullable(),
      })
    )
    .query(async ({ input }) => {
      const formFields = await prisma.formField.findMany({
        where: {
          formValues: {
            some: {
              OR: [
                {
                  inCategorySlug: {
                    equals: [],
                  },
                },
                {
                  inCategorySlug: {
                    equals: null,
                  },
                },
                {
                  inCategorySlug: {
                    has: input.categorySlug,
                  },
                },
              ],
            },
          },
          formFieldSlug: {
            contains: input.type ?? "",
          },
        },

        include: {
          formValues: {
            where: {
              OR: [
                {
                  inCategorySlug: {
                    equals: [],
                  },
                },
                {
                  inCategorySlug: {
                    equals: null,
                  },
                },
                {
                  inCategorySlug: {
                    has: input.categorySlug,
                  },
                },
              ],
            },
          },
        },
      });

      return formFields;
    }),
});

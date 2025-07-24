// server/routers/example.ts
import { z } from "zod";
import { publicProcedure, router } from "../trpc";
import prisma from "@/util/prismaClient";

export const appRouter = router({
  getCategories: publicProcedure.input(z.object({})).query(async () => {
    const categories = await prisma.transportationCategory.findMany({
      include: {
        translations: true,
      },
      where:{
        parent: null
      }
    });

    return categories;
  }),
});

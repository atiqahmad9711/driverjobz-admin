// server/routers/category.ts
import { z } from "zod";
import { protectedProcedureWithAuthHeader, router } from "../trpc";
import prisma from "@/util/prismaClient";

export const categoryRouter = router({
  getCategories: protectedProcedureWithAuthHeader.input(z.object({})).query(async () => {
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

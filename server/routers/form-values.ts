import { z } from "zod";
import { router, publicProcedure, protectedProcedure } from "../trpc";
import { formValueSchema, updateFormValueSchema } from "@/schemas/form-values";
import prisma from "@/util/prismaClient";

export const formValuesRouter = router({
  // Update an existing form value
  update: protectedProcedure
    .input(updateFormValueSchema)
    .mutation(async ({ input }) => {
      const { formValueId, ...updateData } = input;
      
      const updatedValue = await prisma.formValue.update({
        where: { formValueId },
        data: {
          ...updateData,
          updatedAt: new Date(),
        },
      });

      return updatedValue;
    }),

  // Get a single form value by ID
  getById: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input, ctx }) => {
      const formValue = await ctx.prisma.formValue.findUnique({
        where: { formValueId: parseInt(input.id) },
      });

      if (!formValue) {
        throw new Error("Form value not found");
      }

      return formValue;
    }),
});

import { z } from "zod";
import { router, protectedProcedureWithAuthHeader } from "../trpc";
import prisma from "@/util/prismaClient";

export const driverReportsRouter = router({
  // Get reported/flagged drivers
  getReportedDrivers: protectedProcedureWithAuthHeader
    .input(
      z.object({
        page: z.number().min(1).default(1),
        pageSize: z.number().min(1).max(100).default(10),
        status: z.enum(["PENDING", "ACCEPTED", "IGNORE"]).optional(),
      }).optional()
    )
    .query(async ({ input }) => {
      const { page = 1, pageSize = 10, status } = input || {};
      const skip = (page - 1) * pageSize;

      const where: any = {
        deletedAt: null,
      };

      if (status) {
        where.status = status;
      }

      const [reportedDrivers, total] = await Promise.all([
        prisma.flagDriver.findMany({
          where,
          skip,
          take: pageSize,
          select: {
            flagDriverId: true,
            driverId: true,
            userId: true,
            flagMessage: true,
            status: true,
            createdAt: true,
            driver: {
              select: {
                driverId: true,
                user: {
                  select: {
                    userId: true,
                    firstName: true,
                    lastName: true,
                    email: true,
                  },
                },
                category: {
                  select: {
                    transportationCategoryId: true,
                    slug: true,
                  },
                },
              },
            },
            user: {
              select: {
                userId: true,
                firstName: true,
                lastName: true,
                email: true,
              },
            },
          },
          orderBy: {
            createdAt: "desc",
          },
        }),
        prisma.flagDriver.count({ where }),
      ]);

      return {
        reportedDrivers,
        pagination: {
          page,
          pageSize,
          total,
          totalPages: Math.ceil(total / pageSize),
        },
      };
    }),
});


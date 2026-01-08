import { z } from "zod";
import { router, protectedProcedureWithAuthHeader } from "../trpc";
import prisma from "@/util/prismaClient";
import { getLang } from "@/util/helper";

export const driverReportsRouter = router({
  // Get reported/flagged drivers
  getReportedDrivers: protectedProcedureWithAuthHeader
    .input(
      z.object({
        page: z.number().min(1).default(1),
        pageSize: z.number().min(1).max(100).default(10),
        status: z.enum(["PENDING", "ACCEPTED", "IGNORE"]).optional(),
        search: z.string().optional(),
      }).optional()
    )
    .mutation(async ({ input, ctx }) => {
      const { page = 1, pageSize = 10, status, search } = input || {};
      const trimmedSearch = search?.trim() || undefined;
      const skip = (page - 1) * pageSize;
      const locale = getLang(ctx.req);

      const where: any = {
        deletedAt: null,
      };

      if (status) {
        where.status = status;
      }

      // Build search conditions for email, name, and category
      if (trimmedSearch) {
        // Search category translations
        const categoryTranslationWhere: any = {
          name: {
            contains: trimmedSearch,
            mode: 'insensitive',
          },
          locale: locale,
        };
        
        let categoryTranslations = await prisma.transportationCategoryTranslation.findMany({
          where: categoryTranslationWhere,
          select: {
            transportationCategoryId: true,
          },
        });

        if (categoryTranslations.length === 0) {
          categoryTranslations = await prisma.transportationCategoryTranslation.findMany({
            where: {
              name: {
                contains: trimmedSearch,
                mode: 'insensitive',
              },
              locale: {
                in: ['en', 'es'],
              },
            },
            select: {
              transportationCategoryId: true,
            },
          });
        }

        const categoryIds = [...new Set(categoryTranslations.map((translation) => translation.transportationCategoryId))];

        // Build OR conditions for search
        const orConditions: any[] = [];

        // Search by driver email
        orConditions.push({
          driver: {
            user: {
              email: { contains: trimmedSearch, mode: 'insensitive' },
            },
          },
        });

        // Search by driver name (firstName, lastName, or name)
        orConditions.push({
          driver: {
            user: {
              OR: [
                { firstName: { contains: trimmedSearch, mode: 'insensitive' } },
                { lastName: { contains: trimmedSearch, mode: 'insensitive' } },
                { name: { contains: trimmedSearch, mode: 'insensitive' } },
              ],
            },
          },
        });

        // Search by category
        if (categoryIds.length > 0) {
          orConditions.push({
            driver: {
              driverCategory: {
                in: categoryIds,
              },
            },
          });
        }

        // Add OR conditions to where clause
        where.OR = orConditions;
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


import { z } from "zod";
import { router, protectedProcedureWithAuthHeader } from "../trpc";
import prisma from "@/util/prismaClient";

export const jobReportsRouter = router({
  // Get reported/flagged jobs
  getReportedJobs: protectedProcedureWithAuthHeader
    .input(
      z.object({
        page: z.number().min(1).default(1),
        pageSize: z.number().min(1).max(100).default(10),
        status: z.enum(["PENDING", "ACCEPTED", "IGNORE"]).optional(),
        search: z.string().optional(),
      }).optional()
    )
    .mutation(async ({ input }) => {
      const { page = 1, pageSize = 10, status, search } = input || {};
      const trimmedSearch = search?.trim() || undefined;
      const skip = (page - 1) * pageSize;

      const where: any = {
        deletedAt: null,
      };

      if (status) {
        where.status = status;
      }

      // Build search conditions for email, company name, and job title
      if (trimmedSearch) {
        // Build OR conditions for search
        const orConditions: any[] = [];

        // Search by company user email
        orConditions.push({
          jobPosting: {
            company: {
              user: {
                email: { contains: trimmedSearch, mode: 'insensitive' },
              },
            },
          },
        });

        // Search by company name
        orConditions.push({
          jobPosting: {
            company: {
              name: { contains: trimmedSearch, mode: 'insensitive' },
            },
          },
        });

        // Search by job title
        orConditions.push({
          jobPosting: {
            jobTitle: { contains: trimmedSearch, mode: 'insensitive' },
          },
        });

        // Add OR conditions to where clause
        where.OR = orConditions;
      }

      const [reportedJobs, total] = await Promise.all([
        prisma.flagJobPost.findMany({
          where,
          skip,
          take: pageSize,
          select: {
            flagJobId: true,
            jobPostingId: true,
            userId: true,
            flagMessage: true,
            status: true,
            createdAt: true,
            jobPosting: {
              select: {
                jobPostingId: true,
                jobTitle: true,
                status: true,
                company: {
                  select: {
                    companyId: true,
                    name: true,
                    user: {
                      select: {
                        userId: true,
                        firstName: true,
                        lastName: true,
                        email: true,
                      },
                    },
                  },
                },
                locationState: {
                  select: {
                    stateId: true,
                    nameEn: true,
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
        prisma.flagJobPost.count({ where }),
      ]);

      return {
        reportedJobs,
        pagination: {
          page,
          pageSize,
          total,
          totalPages: Math.ceil(total / pageSize),
        },
      };
    }),
});


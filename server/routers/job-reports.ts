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
        status: z.enum(["DRAFT", "PENDING", "PUBLISHED", "INACTIVE", "EXPIRED", "REJECTED", "BLOCKED"]).optional(),
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

      // Map BLOCKED to INACTIVE (as per job-management.ts logic)
      const jobStatus = status === "BLOCKED" ? "INACTIVE" : status;

      // Build search conditions for email, company name, and job title
      if (trimmedSearch) {
        const orConditions: any[] = [
          {
            jobPosting: {
              company: {
                user: {
                  email: { contains: trimmedSearch, mode: 'insensitive' },
                },
              },
            },
          },
          {
            jobPosting: {
              company: {
                name: { contains: trimmedSearch, mode: 'insensitive' },
              },
            },
          },
          {
            jobPosting: {
              jobTitle: { contains: trimmedSearch, mode: 'insensitive' },
            },
          },
        ];

        where.OR = orConditions;
      }

      // Filter by jobPosting status
      if (status) {
        if (where.OR) {
          // Combine search OR conditions with status filter using AND
          where.AND = [
            { OR: where.OR },
            { jobPosting: { status: jobStatus } },
          ];
          delete where.OR;
        } else {
          where.jobPosting = { status: jobStatus };
        }
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


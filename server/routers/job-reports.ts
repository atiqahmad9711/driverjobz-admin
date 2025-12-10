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


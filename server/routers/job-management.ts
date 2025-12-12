import { z } from "zod";
import { router, protectedProcedureWithAuthHeader } from "../trpc";
import prisma from "@/util/prismaClient";
import { TRPCError } from "@trpc/server";

// Schema for job review
const jobReviewSchema = z.object({
  jobPostingId: z.number(),
  status: z.enum(["PUBLISHED", "REJECTED"]),
});

// Schema for job status update
const jobStatusUpdateSchema = z.object({
  jobPostingId: z.number(),
  action: z.enum(["BLOCK", "UNBLOCK", "DELETE"]),
});

export const jobManagementRouter = router({
  // API9: Review jobs (approve/reject)
  reviewJob: protectedProcedureWithAuthHeader
    .input(jobReviewSchema)
    .mutation(async ({ input }) => {
      const { jobPostingId, status } = input;

      // Verify job exists
      const job = await prisma.jobPosting.findFirst({
        where: {
          jobPostingId,
          deletedAt: null,
        },
        select: {
          companyId: true,
        },
      });

      if (!job) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Job posting not found",
        });
      }

      // Update job status (APPROVED means PUBLISHED for jobs)
      const updated = await prisma.jobPosting.update({
        where: { jobPostingId },
        data: { status },
        select: {
          jobPostingId: true,
          jobCategoryId: true,
          employmentArrangement: true,
          currentStep: true,
          currentStepStatus: true,
          companyId: true,
          jobTitle: true,
          status: true,
          company: {
            select: {
              userId: true,
            },
          },
        },
      });

      // Transform response to include userId at the top level
      return {
        success: true,
        job: {
          jobPostingId: updated.jobPostingId,
          jobCategoryId: updated.jobCategoryId,
          employmentArrangement: updated.employmentArrangement,
          currentStep: updated.currentStep,
          currentStepStatus: updated.currentStepStatus,
          companyId: updated.companyId,
          jobTitle: updated.jobTitle,
          status: updated.status,
          userId: updated.company?.userId || null,
        },
      };
    }),

  // API10: Update job status (block/unblock/delete)
  updateJobStatus: protectedProcedureWithAuthHeader
    .input(jobStatusUpdateSchema)
    .mutation(async ({ input }) => {
      const { jobPostingId, action } = input;

      // Verify job exists
      const job = await prisma.jobPosting.findFirst({
        where: {
          jobPostingId,
          deletedAt: null,
        },
        select: {
          companyId: true,
        },
      });

      if (!job) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Job posting not found",
        });
      }

      let updated;
      if (action === "BLOCK") {
        // Change status to INACTIVE (BLOCKED doesn't exist in enum)
        updated = await prisma.jobPosting.update({
          where: { jobPostingId },
          data: { status: "INACTIVE" },
          select: {
            jobPostingId: true,
            jobCategoryId: true,
            employmentArrangement: true,
            currentStep: true,
            currentStepStatus: true,
            companyId: true,
            jobTitle: true,
            status: true,
            company: {
              select: {
                userId: true,
              },
            },
          },
        });
      } else if (action === "UNBLOCK") {
        // Change status to PUBLISHED
        updated = await prisma.jobPosting.update({
          where: { jobPostingId },
          data: { status: "PUBLISHED" },
          select: {
            jobPostingId: true,
            jobCategoryId: true,
            employmentArrangement: true,
            currentStep: true,
            currentStepStatus: true,
            companyId: true,
            jobTitle: true,
            status: true,
            company: {
              select: {
                userId: true,
              },
            },
          },
        });
      } else if (action === "DELETE") {
        // Set deletedAt to current time
        updated = await prisma.jobPosting.update({
          where: { jobPostingId },
          data: {
            deletedAt: new Date(),
          },
          select: {
            jobPostingId: true,
            jobCategoryId: true,
            employmentArrangement: true,
            currentStep: true,
            currentStepStatus: true,
            companyId: true,
            jobTitle: true,
            status: true,
            company: {
              select: {
                userId: true,
              },
            },
          },
        });
      } else {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Invalid action: ${action}`,
        });
      }

      // Transform response to include userId at the top level
      return {
        success: true,
        job: {
          jobPostingId: updated.jobPostingId,
          jobCategoryId: updated.jobCategoryId,
          employmentArrangement: updated.employmentArrangement,
          currentStep: updated.currentStep,
          currentStepStatus: updated.currentStepStatus,
          companyId: updated.companyId,
          jobTitle: updated.jobTitle,
          status: updated.status,
          userId: updated.company?.userId || null,
        },
      };
    }),
});


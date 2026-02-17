import { z } from "zod";
import { router, protectedProcedureWithAuthHeader } from "../trpc";
import prisma from "@/util/prismaClient";
import { TRPCError } from "@trpc/server";
import { sendEmail } from "@/util/send-email";
import {
  getJobBlockedEmailHtml,
  getJobBlockedEmailSubject,
} from "@/util/email-templates";

// Schema for job review
const jobReviewSchema = z.object({
  jobPostingId: z.number(),
  status: z.enum(["PUBLISHED", "REJECTED"]),
});

// Schema for job status update (block_reason used when action is BLOCK; email sent only if job status was PUBLISHED)
const jobStatusUpdateSchema = z.object({
  jobPostingId: z.number(),
  action: z.enum(["BLOCK", "UNBLOCK", "DELETE"]),
  block_reason: z.string().optional(),
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

  // API10: Update job status (block/unblock/delete). When BLOCK and status was PUBLISHED, send block email to company user.
  updateJobStatus: protectedProcedureWithAuthHeader
    .input(jobStatusUpdateSchema)
    .mutation(async ({ input }) => {
      const { jobPostingId, action, block_reason } = input;

      // Fetch job with company user for block email (need status, jobTitle, company.user.email)
      const jobForBlock = await prisma.jobPosting.findFirst({
        where: {
          jobPostingId,
          deletedAt: null,
        },
        select: {
          jobPostingId: true,
          status: true,
          jobTitle: true,
          companyId: true,
          company: {
            select: {
              userId: true,
              user: {
                select: {
                  email: true,
                  firstName: true,
                  lastName: true,
                },
              },
            },
          },
        },
      });

      if (!jobForBlock) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Job posting not found",
        });
      }

      const wasPublished = jobForBlock.status === "PUBLISHED";
      const companyUser = jobForBlock.company?.user;

      let updated;
      if (action === "BLOCK") {
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
        // Send block email only when blocking a PUBLISHED job (to company's user)
        if (wasPublished && companyUser?.email) {
          try {
            const firstName = companyUser.firstName || companyUser.lastName || "there";
            const html = getJobBlockedEmailHtml({
              firstName,
              jobTitle: jobForBlock.jobTitle ?? undefined,
              blockReason: block_reason,
            });
            await sendEmail(
              [companyUser.email],
              getJobBlockedEmailSubject(),
              undefined,
              html
            );
          } catch (err) {
            console.error("[ERROR] Block email for job:", jobPostingId, err);
          }
        }
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


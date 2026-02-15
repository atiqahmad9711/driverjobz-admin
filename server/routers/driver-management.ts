import { z } from "zod";
import { router, protectedProcedureWithAuthHeader } from "../trpc";
import prisma from "@/util/prismaClient";
import { TRPCError } from "@trpc/server";
import { sendEmail } from "@/util/send-email";
import {
  getProfileRejectedEmailHtml,
  getProfileRejectedEmailSubject,
} from "@/util/email-templates";

// Schema for document review
const documentReviewSchema = z.object({
  multimediaId: z.number(),
  status: z.enum(["APPROVED", "REJECTED"]),
});

// Schema for driver status update
const driverStatusUpdateSchema = z.object({
  userId: z.number(),
  action: z.enum(["BLOCK", "UNBLOCK", "DELETE"]),
});

// Schema for driver activation
const driverActivationSchema = z.object({
  userId: z.number(),
});

// Schema for driver rejection (with reason; supports multiple rejections via log)
const rejectDriverSchema = z.object({
  userId: z.number(),
  rejection_message: z.string(),
});

export const driverManagementRouter = router({
  // API2: Review driver documents (approve/reject)
  reviewDocument: protectedProcedureWithAuthHeader
    .input(documentReviewSchema)
    .mutation(async ({ input }) => {
      const { multimediaId, status } = input;

      // First check if document exists at all
      const documentExists = await prisma.multimedia.findUnique({
        where: { multimediaId },
      });

      if (!documentExists) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: `Document with ID ${multimediaId} does not exist`,
        });
      }

      // Check if document is soft-deleted
      if (documentExists.deletedAt) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: `Document with ID ${multimediaId} has been deleted`,
        });
      }

      // Check if document is for a driver
      // Driver documents: entityType should be "driver" (or "DRIVER") AND entityId is a driver_id
      const entityTypeUpper = documentExists.entityType.toUpperCase();
      const isDriverEntityType = entityTypeUpper === "DRIVER";

      if (!isDriverEntityType) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Document with ID ${multimediaId} is not a driver document. Entity type: ${documentExists.entityType}`,
        });
      }

      // For driver documents, entityId is the driver_id, not user_id
      // Verify the driver exists
      const driver = await prisma.driver.findUnique({
        where: { driverId: documentExists.entityId },
        select: {
          driverId: true,
          userId: true,
          user: {
            select: {
              userId: true,
              isCompany: true,
            },
          },
        },
      });

      if (!driver) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: `Driver with ID ${documentExists.entityId} (entityId) does not exist`,
        });
      }

      // Verify the driver's user is not a company
      if (driver.user.isCompany === true) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Document with ID ${multimediaId} is not a driver document. Driver's user isCompany: ${driver.user.isCompany}`,
        });
      }

      // Update document status
      const updated = await prisma.multimedia.update({
        where: { multimediaId },
        data: { status },
      });

      return {
        success: true,
        document: updated,
      };
    }),

  // API3: Update driver status (block/unblock/delete)
  updateDriverStatus: protectedProcedureWithAuthHeader
    .input(driverStatusUpdateSchema)
    .mutation(async ({ input }) => {
      const { userId, action } = input;

      // Verify user is a driver
      const user = await prisma.user.findFirst({
        where: {
          userId,
          isCompany: false,
          driver: {
            isNot: null,
          },
        },
      });

      if (!user) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Driver not found",
        });
      }

      let updated;
      if (action === "BLOCK") {
        // Change status to BLOCKED
        updated = await prisma.user.update({
          where: { userId },
          data: { status: "BLOCKED" },
        });
      } else if (action === "UNBLOCK") {
        // Change status to APPROVED
        updated = await prisma.user.update({
          where: { userId },
          data: { status: "APPROVED" },
        });
      } else if (action === "DELETE") {
        // Set isActive to false and deletedAt to current time
        updated = await prisma.user.update({
          where: { userId },
          data: {
            isActive: false,
            deletedAt: new Date(),
          },
        });
      }

      return {
        success: true,
        user: updated,
      };
    }),

  // API4: Activate driver profile
  activateDriver: protectedProcedureWithAuthHeader
    .input(driverActivationSchema)
    .mutation(async ({ input }) => {
      const { userId } = input;

      try {
        // First check if user exists - only select fields we need to avoid type conversion errors
        const user = await prisma.user.findUnique({
          where: { userId: Number(userId) },
          select: {
            userId: true,
            isCompany: true,
            status: true,
            deletedAt: true,
          },
        });

        if (!user) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: `User with ID ${userId} does not exist`,
          });
        }

        // Check if user is soft-deleted
        if (user.deletedAt) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: `User with ID ${userId} has been deleted`,
          });
        }

        // Check if user is a company (employer)
        // isCompany can be true, false, or null (default is false)
        if (user.isCompany === true) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: `User with ID ${userId} is an employer, not a driver`,
          });
        }

        // Check if user has a driver record - REQUIRED for activation
        // Query Driver table directly to check if entry exists where userId = user.userId
        // Only select userId to avoid type conversion errors with other fields
        const driverRecord = await prisma.driver.findUnique({
          where: { userId: Number(userId) },
          select: {
            userId: true,
          },
        });

        if (!driverRecord) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: `User with ID ${userId} does not have a driver record. A Driver entry with userId = ${userId} must exist in the Driver table.`,
          });
        }

        // Check if status is PENDING or null (null means default PENDING)
        // Only allow activation if status is PENDING or null
        const currentStatus = user.status;
        if (currentStatus !== "PENDING" && currentStatus !== null) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: `Driver with ID ${userId} does not have PENDING status. Current status: ${currentStatus || "null"}`,
          });
        }

        // Change status from PENDING (or null) to APPROVED
        const updated = await prisma.user.update({
          where: { userId: Number(userId) },
          data: { status: "APPROVED" },
        });

        // Send account activated email notification
        let emailSent = false;
        let emailError: string | null = null;

        try {
          const backendApiUrl = process.env.BACKEND_API_URL;
          const emailEndpoint = `${backendApiUrl}/api/v1/auth/send-account-activated-email`;
          const requestBody = { userId: Number(userId) };

          console.log('[DEBUG] Sending activation email:', {
            endpoint: emailEndpoint,
            userId: Number(userId),
            backendApiUrl,
          });

          if (backendApiUrl) {
            const emailResponse = await fetch(emailEndpoint, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify(requestBody),
            });

            const responseText = await emailResponse.text();
            let responseData;
            try {
              responseData = JSON.parse(responseText);
            } catch {
              responseData = responseText;
            }



            if (emailResponse.ok) {
              emailSent = true;
              console.log(`[SUCCESS] Activation email sent successfully for user ${userId}`);
            } else {
              emailError = `Failed to send activation email: ${emailResponse.status} ${emailResponse.statusText}`;
              console.error(`[ERROR] Failed to send activation email for user ${userId}:`, {
                status: emailResponse.status,
                statusText: emailResponse.statusText,
                response: responseData,
              });
              // Don't throw error - activation was successful, email is just a notification
            }
          } else {
            emailError = 'BACKEND_API_URL or API_URL not configured';
            console.warn('[WARN] BACKEND_API_URL or API_URL not configured. Skipping activation email.');
          }
        } catch (err: any) {
          // Log the error but don't fail the activation
          emailError = `Error sending activation email: ${err.message}`;
          console.error(`[ERROR] Exception sending activation email for user ${userId}:`, {
            message: err.message,
            stack: err.stack,
            name: err.name,
            cause: err.cause,
          });
        }

        return {
          success: true,
          user: updated,
          emailSent,
          emailError: emailError || undefined,
        };
      } catch (error: any) {
        // If it's already a TRPCError, re-throw it
        if (error instanceof TRPCError) {
          throw error;
        }

        // Log the full error for debugging
        console.error("Error in activateDriver:", {
          message: error.message,
          code: error.code,
          cause: error.cause,
          stack: error.stack,
          name: error.name,
        });

        // Check if it's a Prisma error
        if (error.code && error.code.startsWith('P')) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: `Database error: ${error.message || "Unknown database error"}. Code: ${error.code}`,
          });
        }

        // Return a more user-friendly error message
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Failed to activate driver: ${error.message || "Unknown error"}`,
        });
      }
    }),

  // Reject driver profile: set status REJECTED, log reason, send email (same mail provision as driverjobs-be)
  rejectDriver: protectedProcedureWithAuthHeader
    .input(rejectDriverSchema)
    .mutation(async ({ input }) => {
      const { userId, rejection_message } = input;

      const user = await prisma.user.findFirst({
        where: {
          userId,
          isCompany: false,
          driver: { isNot: null },
        },
        select: {
          userId: true,
          email: true,
          firstName: true,
          lastName: true,
          deletedAt: true,
        },
      });

      if (!user) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Driver not found",
        });
      }

      if (user.deletedAt) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Driver has been deleted",
        });
      }

      await prisma.$transaction([
        prisma.user.update({
          where: { userId },
          data: { status: "REJECTED" },
        }),
        prisma.profileRejectionLog.create({
          data: {
            profileId: userId,
            type: "DRIVER",
            rejectionMessage: rejection_message || null,
          },
        }),
      ]);

      const updated = await prisma.user.findUnique({
        where: { userId },
      });

      let emailSent = false;
      let emailError: string | null = null;

      if (user.email) {
        try {
          const firstName = user.firstName || user.lastName || "there";
          const html = getProfileRejectedEmailHtml({
            firstName,
            rejectionMessage: rejection_message || undefined,
            profileType: "DRIVER",
          });
          await sendEmail(
            [user.email],
            getProfileRejectedEmailSubject(),
            undefined,
            html
          );
          emailSent = true;
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : String(err);
          emailError = `Error sending rejection email: ${message}`;
          console.error("[ERROR] Rejection email for driver:", userId, err);
        }
      } else {
        emailError = "Driver has no email address";
      }

      return {
        success: true,
        user: updated,
        emailSent,
        emailError: emailError ?? undefined,
      };
    }),
});


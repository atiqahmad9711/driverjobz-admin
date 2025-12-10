import { z } from "zod";
import { router, protectedProcedureWithAuthHeader } from "../trpc";
import prisma from "@/util/prismaClient";
import { TRPCError } from "@trpc/server";
import { hash } from "bcryptjs";

// Schema for sending OTP
const sendOtpSchema = z.object({
  email: z.string().email(),
});

// Schema for verifying OTP and changing password
const changePasswordSchema = z.object({
  email: z.string().email(),
  otp: z.string().length(6),
  newPassword: z.string().min(6),
});

export const adminRouter = router({
  // API14: Send OTP for password change
  sendPasswordChangeOtp: protectedProcedureWithAuthHeader
    .input(sendOtpSchema)
    .mutation(async ({ input, ctx }) => {
      const { email } = input;

      // Verify user exists and is admin
      const user = await prisma.user.findFirst({
        where: {
          email,
          roles: {
            some: {
              slug: "admin",
            },
          },
        },
      });

      if (!user) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Admin user not found",
        });
      }

      // Generate 6-digit OTP
      const otp = Math.floor(100000 + Math.random() * 900000).toString();

      // Store OTP in user record (using emailVerificationCode field)
      await prisma.user.update({
        where: { userId: user.userId },
        data: {
          emailVerificationCode: otp,
          emailCodeGeneratedAt: new Date(),
        },
      });

      // TODO: Send email with OTP
      // await sendEmail(user.email, "Password Change OTP", `Your OTP is: ${otp}`);

      return {
        success: true,
        message: "OTP sent to email",
        // In development, return OTP for testing
        ...(process.env.NODE_ENV === "development" && { otp }),
      };
    }),

  // API14: Verify OTP and change password
  changePassword: protectedProcedureWithAuthHeader
    .input(changePasswordSchema)
    .mutation(async ({ input }) => {
      const { email, otp, newPassword } = input;

      // Verify user exists and is admin
      const user = await prisma.user.findFirst({
        where: {
          email,
          roles: {
            some: {
              slug: "admin",
            },
          },
        },
      });

      if (!user) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Admin user not found",
        });
      }

      // Verify OTP
      if (user.emailVerificationCode !== otp) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Invalid OTP",
        });
      }

      // Check if OTP is expired (60 minutes)
      if (user.emailCodeGeneratedAt) {
        const otpAge = Date.now() - user.emailCodeGeneratedAt.getTime();
        const sixtyMinutes = 60 * 60 * 1000;
        if (otpAge > sixtyMinutes) {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "OTP has expired",
          });
        }
      }

      // Hash new password
      const hashedPassword = await hash(newPassword, 10);

      // Update password and clear OTP
      await prisma.user.update({
        where: { userId: user.userId },
        data: {
          password: hashedPassword,
          emailVerificationCode: null,
          emailCodeGeneratedAt: null,
        },
      });

      return {
        success: true,
        message: "Password changed successfully",
      };
    }),
});


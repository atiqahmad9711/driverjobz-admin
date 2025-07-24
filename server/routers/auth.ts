import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, publicProcedure, protectedProcedure } from "../trpc";
import { loginSchema, userWithRolesSchema } from "@/schemas/auth";
import { compare } from "bcryptjs";
import { sign } from "jsonwebtoken";
import prisma from "@/util/prismaClient";
import { config } from "@/config/config";

type UserWithRoles = {
  userId: number;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  roles: string[];
};

export const authRouter = router({
  // Login user
  login: publicProcedure
    .input(loginSchema)
    .mutation(async ({ input, ctx }) => {
      const { email, password } = input;

      // 1. Find user by email with their roles
      const user = await prisma.user.findUnique({
        where: { email },
        include: {
           roles: {
            select: {
              name: true,
              slug: true,
            }
          }
        },
      });

      // 2. Verify user exists and password is correct
      if (!user || !(await compare(password, user.password))) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Invalid email or password",
        });
      }

      // 3. Extract role names
      const roles = user.roles.map(role => role.slug);
      
      // 4. Check if user has admin role
      if (!roles.includes("admin")) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Access denied. Admin role required.",
        });
      }

      // 5. Generate JWT token
      const token = sign(
        { 
          userId: user.userId, 
          roles,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName
        },
        config.be.auth.secret || "your-secret-key",
        { expiresIn: "1d" }
      );

      // 6. Set HTTP-only cookie
      if (ctx.req) {
        // set header
        ctx.resHeaders.set(
          "Set-Cookie",
          `auth-token=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=86400`
        );
      }
      
      

      // 7. Return user data without sensitive information
      return {
        userId: user.userId,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        roles,
      } as UserWithRoles;
    }),
  
  // Get current user session
  me: publicProcedure
    .query(async ({ ctx }) => {
      if (!ctx.user) {
        return null;
      }

      const user = await prisma.user.findUnique({
        where: { userId: ctx.user.userId },
        include: {
          roles: {
            select: {
              name: true,
              slug: true,
            }
          }
        },
      });

      if (!user) {
        return null;
      }

      const roles = user.roles.map(role => role.name);
      
      return {
        userId: user.userId,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        roles,
      } as UserWithRoles;
    }),
  
  // Logout
  logout: publicProcedure.mutation(({ ctx }) => {
    if (ctx.req) {
      ctx.resHeaders.set(
        "Set-Cookie",
        "auth-token=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; HttpOnly; SameSite=Lax"
      );
    }
    return { success: true };
  }),
});

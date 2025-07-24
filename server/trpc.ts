// server/trpc.ts
import { initTRPC, TRPCError } from "@trpc/server";
import { verify } from "jsonwebtoken";
import { IncomingMessage, ServerResponse } from "http";
import type { PrismaClient } from "@prisma/client";
import prisma from "@/util/prismaClient";
import { config } from "@/config/config";

// Define the shape of the user in the context
export type UserContext = {
  userId: number;
  roles: string[];
};

// Extend the context to include the user
export type Context = {
  req?: IncomingMessage;
  res?: ServerResponse;
  user?: UserContext;
  prisma: PrismaClient;
};

// Helper function to get the token from the request
const getToken = (req?: IncomingMessage): string | null => {
  if (!req?.headers.cookie) return null;
  
  const cookies = req.headers.cookie.split(';').reduce((acc, cookie) => {
    const [key, value] = cookie.trim().split('=');
    acc[key] = value;
    return acc;
  }, {} as Record<string, string>);
  
  return cookies['auth-token'] || null;
};

// Create the tRPC instance with context
export const createContext = async ({ req, res }: { req?: IncomingMessage; res?: ServerResponse } = {}): Promise<Context> => {
  const token = getToken(req);
  
  if (!token) {
    return { req, res, prisma: prisma };
  }
  
  try {
    const decoded = verify(token, config.be.auth.secret || 'your-secret-key') as UserContext;
    return {
      req,
      res,
      user: {
        userId: decoded.userId,
        roles: decoded.roles || [],
      },
      prisma: prisma
    };
  } catch (error) {
    console.error('Failed to verify token:', error);
    return { req, res, prisma: prisma };
  }
};

const t = initTRPC.context<Context>().create({
  errorFormatter({ shape, error }) {
    return {
      ...shape,
      // Include stack trace in development
      stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
    };
  },
});

// Base router and procedure helpers
export const router = t.router;
export const publicProcedure = t.procedure;

// Protected procedure (requires authentication)
export const protectedProcedure = t.procedure.use(
  t.middleware(async ({ ctx, next }) => {
    if (!ctx.user) {
      throw new TRPCError({ 
        code: 'UNAUTHORIZED',
        message: 'You must be logged in to access this resource',
      });
    }
    
    // Check for admin role if required
    const isAdmin = ctx.user.roles.includes('ADMIN');
    if (!isAdmin) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'Admin access required',
      });
    }
    
    return next({
      ctx: {
        ...ctx,
        user: ctx.user,
      },
    });
  })
);

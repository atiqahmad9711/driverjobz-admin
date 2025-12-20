// server/trpc.ts
import { initTRPC, TRPCError } from "@trpc/server";
import { verify } from "jsonwebtoken";
import type { PrismaClient } from "@prisma/client";
import prisma from "@/util/prismaClient";
import { config } from "@/config/config";
import { NextRequest } from "next/server";

// Define the shape of the user in the context
export type UserContext = {
  userId: number;
  roles: string[];
};

// Extend the context to include the user
export type Context = {
  req?: NextRequest;
  user?: UserContext;
  prisma: PrismaClient;
  resHeaders: Headers;
};

// Helper function to get the token from the request
const getToken = (req?: NextRequest): string | null => {
  if (!req?.cookies.get('auth-token')) return null;
  
  const cookies = req.cookies.get('auth-token');
  
  return cookies?.value || null;
};

// Helper function to get token from Authorization header (for new APIs)
const getTokenFromAuthHeader = (req?: NextRequest): string | null => {
  if (!req) return null;
  
  // Try both lowercase and capitalized header names
  const authHeader = req.headers.get('authorization') || req.headers.get('Authorization');
  
  if (authHeader) {
    // Support both "Bearer <token>" and just "<token>" formats
    const token = authHeader.startsWith('Bearer ') 
      ? authHeader.substring(7).trim() 
      : authHeader.trim();
    if (token) {
      return token;
    }
  }
  
  return null;
};

// Create the tRPC instance with context
export const createContext = async ({ req }: { req?: NextRequest } = {}): Promise<Context> => {
  const token = getToken(req);
  
  if (!token) {
    return { req, prisma: prisma, resHeaders: new Headers() };
  }
  
  try {
    const decoded = verify(token, config.be.auth.secret || 'your-secret-key') as UserContext;
    return {
      req,
      user: {
        userId: decoded.userId,
        roles: decoded.roles || [],
      },
      prisma: prisma,
      resHeaders: new Headers(),
    };
  } catch (error) {
    console.error('Failed to verify token:', error);
    return { req, prisma: prisma, resHeaders: new Headers() };
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

// Protected procedure (requires Authorization header, not cookies)
export const protectedProcedure = t.procedure.use(
  t.middleware(async ({ ctx, next }) => {
    // ONLY accept token from Authorization header (not cookies)
    const authToken = getTokenFromAuthHeader(ctx.req);
    
    if (!authToken) {
      throw new TRPCError({ 
        code: 'UNAUTHORIZED',
        message: 'You must be logged in to access this resource. Please provide a valid Authorization header.',
      });
    }
    
    let user: UserContext;
    
    try {
      const secret = config.be.auth.secret || 'your-secret-key';
      const decoded = verify(authToken, secret) as any;
      
      // Handle token structure - roles can be array of objects or array of strings
      let roles: string[] = [];
      if (decoded.roles) {
        if (Array.isArray(decoded.roles)) {
          if (decoded.roles.length > 0 && typeof decoded.roles[0] === 'object') {
            // Parallel backend format: extract slugs
            roles = decoded.roles.map((r: { slug?: string; role?: string }) => r.slug || r.role).filter(Boolean);
          } else {
            // Array of strings format (from admin login API)
            roles = decoded.roles;
          }
        }
      }
      
      user = {
        userId: decoded.userId,
        roles: roles,
      };
    } catch (error: any) {
      console.error('Failed to verify token from Authorization header:', error);
      throw new TRPCError({ 
        code: 'UNAUTHORIZED',
        message: `Invalid or expired token: ${error.message || 'Token verification failed'}`,
      });
    }
    
    // Check for admin role
    const isAdmin = user.roles.includes('admin');
    if (!isAdmin) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'Admin access required',
      });
    }
    
    return next({
      ctx: {
        ...ctx,
        user: user,
      },
    });
  })
);

// Protected procedure with Authorization header support (REQUIRES Authorization header, not cookies)
export const protectedProcedureWithAuthHeader = t.procedure.use(
  t.middleware(async ({ ctx, next }) => {
    // ONLY accept token from Authorization header (not cookies)
    const authToken = getTokenFromAuthHeader(ctx.req);
    
    if (!authToken) {
      throw new TRPCError({ 
        code: 'UNAUTHORIZED',
        message: 'You must be logged in to access this resource. Please provide a valid Authorization header.',
      });
    }
    
    let user: UserContext;
    
    try {
      const secret = config.be.auth.secret || 'your-secret-key';
      const decoded = verify(authToken, secret) as any;
      
      // Handle token structure - roles can be array of objects or array of strings
      let roles: string[] = [];
      if (decoded.roles) {
        if (Array.isArray(decoded.roles)) {
          if (decoded.roles.length > 0 && typeof decoded.roles[0] === 'object') {
            // Parallel backend format: extract slugs
            roles = decoded.roles.map((r: { slug?: string; role?: string }) => r.slug || r.role).filter(Boolean);
          } else {
            // Array of strings format (from admin login API)
            roles = decoded.roles;
          }
        }
      }
      
      user = {
        userId: decoded.userId,
        roles: roles,
      };
    } catch (error: any) {
      console.error('Failed to verify token from Authorization header:', error);
      throw new TRPCError({ 
        code: 'UNAUTHORIZED',
        message: `Invalid or expired token: ${error.message || 'Token verification failed'}`,
      });
    }
    
    // Check for admin role
    const isAdmin = user.roles.includes('admin');
    if (!isAdmin) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'Admin access required',
      });
    }
    
    return next({
      ctx: {
        ...ctx,
        user: user,
      },
    });
  })
);


import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email("Please enter a valid email"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export type LoginInput = z.infer<typeof loginSchema>;

export const userWithRolesSchema = z.object({
  userId: z.number(),
  email: z.string().optional().nullable(),
  firstName: z.string().nullable(),
  lastName: z.string().nullable(),
  roles: z.array(z.string()),
});

export type UserWithRoles = z.infer<typeof userWithRolesSchema>;

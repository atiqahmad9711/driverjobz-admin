import { z } from "zod";
import { router, protectedProcedureWithAuthHeader } from "../trpc";
import prisma from "@/util/prismaClient";
import { TRPCError } from "@trpc/server";

// Schema for document review
const documentReviewSchema = z.object({
  multimediaId: z.number(),
  status: z.enum(["APPROVED", "REJECTED"]),
});

// Schema for employer status update
const employerStatusUpdateSchema = z.object({
  userId: z.number(),
  action: z.enum(["BLOCK", "UNBLOCK", "DELETE"]),
});

// Schema for employer activation
const employerActivationSchema = z.object({
  userId: z.number(),
});

export const employerManagementRouter = router({
  // Get employer profiles awaiting activation
  getProfilesAwaitingActivation: protectedProcedureWithAuthHeader
    .input(
      z.object({
        page: z.number().min(1).default(1),
        pageSize: z.number().min(1).max(100).default(10),
      }).optional()
    )
    .query(async ({ input }) => {
      const { page = 1, pageSize = 10 } = input || {};
      const skip = (page - 1) * pageSize;

      const where = {
        isCompany: true,
        status: "PENDING",
        deletedAt: null,
        company: {
          some: {},
        },
      };

      const [profiles, total] = await Promise.all([
        prisma.user.findMany({
          where,
          skip,
          take: pageSize,
          select: {
            userId: true,
            name: true,
            firstName: true,
            lastName: true,
            email: true,
            status: true,
            currentStage: true,
            company: {
              take: 1,
              select: {
                companyId: true,
                name: true,
                legalName: true,
                usDotNumber: true,
                mcNumber: true,
              },
            },
          },
          orderBy: {
            createdAt: "desc",
          },
        }),
        prisma.user.count({ where }),
      ]);

      // Transform response to use name field as fallback for firstName/lastName
      const transformedProfiles = profiles.map((profile) => ({
        ...profile,
        firstName: profile.firstName || (profile.name ? profile.name.split(' ')[0] || null : null),
        lastName: profile.lastName || (profile.name ? profile.name.split(' ').slice(1).join(' ') || null : null),
      }));

      return {
        profiles: transformedProfiles,
        pagination: {
          page,
          pageSize,
          total,
          totalPages: Math.ceil(total / pageSize),
        },
      };
    }),

  // Get employer documents awaiting review
  getDocumentsAwaitingReview: protectedProcedureWithAuthHeader
    .input(
      z.object({
        page: z.number().min(1).default(1),
        pageSize: z.number().min(1).max(100).default(10),
      }).optional()
    )
    .query(async ({ input }) => {
      const { page = 1, pageSize = 10 } = input || {};
      const skip = (page - 1) * pageSize;

      // Get all company_ids from Company table where user has isCompany = true
      const companies = await prisma.company.findMany({
        where: {
          user: {
            isCompany: true,
            deletedAt: null,
          },
          deletedAt: null,
        },
        select: {
          companyId: true,
        },
      });

      const companyIds = companies.map((company) => company.companyId);

      if (companyIds.length === 0) {
        return {
          documents: [],
          pagination: {
            page,
            pageSize,
            total: 0,
            totalPages: 0,
          },
        };
      }

      // Query documents where:
      // 1. entityType is "company" or "COMPANY" (case-insensitive)
      // 2. entityId matches a company_id (not user_id)
      // 3. status is PENDING
      // 4. not deleted
      const where = {
        entityId: {
          in: companyIds,
        },
        entityType: {
          in: ["company", "COMPANY"],
        },
        status: "PENDING",
        deletedAt: null,
      };

      const [documents, total] = await Promise.all([
        prisma.multimedia.findMany({
          where,
          skip,
          take: pageSize,
          orderBy: {
            createdAt: "desc",
          },
        }),
        prisma.multimedia.count({ where }),
      ]);

      return {
        documents,
        pagination: {
          page,
          pageSize,
          total,
          totalPages: Math.ceil(total / pageSize),
        },
      };
    }),

  // API5: Employer listing
  getEmployers: protectedProcedureWithAuthHeader
    .input(
      z.object({
        page: z.number().min(1).default(1),
        pageSize: z.number().min(1).max(100).default(10),
        search: z.string().optional(),
        status: z.enum(["PENDING", "APPROVED", "REJECTED", "BLOCKED"]).optional(),
      }).optional()
    )
    .query(async ({ input }) => {
      const { page = 1, pageSize = 10, search, status } = input || {};
      const skip = (page - 1) * pageSize;

      const where: any = {
        isCompany: true,
        deletedAt: null,
        company: {
          some: {},
        },
      };

      if (status) {
        where.status = status;
      }

      if (search) {
        where.OR = [
          { firstName: { contains: search, mode: "insensitive" } },
          { lastName: { contains: search, mode: "insensitive" } },
          { email: { contains: search, mode: "insensitive" } },
          { company: { some: { name: { contains: search, mode: "insensitive" } } } },
        ];
      }

      const [employers, total] = await Promise.all([
        prisma.user.findMany({
          where,
          skip,
          take: pageSize,
          select: {
            userId: true,
            name: true,
            firstName: true,
            lastName: true,
            email: true,
            status: true,
            currentStage: true,
            company: {
              take: 1,
              select: {
                companyId: true,
                name: true,
                legalName: true,
                usDotNumber: true,
                mcNumber: true,
              },
            },
          },
          orderBy: {
            createdAt: "desc",
          },
        }),
        prisma.user.count({ where }),
      ]);

      // Transform response to use name field as fallback for firstName/lastName
      const transformedEmployers = employers.map((employer) => ({
        ...employer,
        firstName: employer.firstName || (employer.name ? employer.name.split(' ')[0] || null : null),
        lastName: employer.lastName || (employer.name ? employer.name.split(' ').slice(1).join(' ') || null : null),
      }));

      return {
        employers: transformedEmployers,
        pagination: {
          page,
          pageSize,
          total,
          totalPages: Math.ceil(total / pageSize),
        },
      };
    }),

  // API6: Review employer documents (approve/reject)
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

      // Verify the user (entityId is the user_id)
      const user = await prisma.user.findUnique({
        where: { userId: documentExists.entityId },
      });

      if (!user) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: `User with ID ${documentExists.entityId} (entityId) does not exist`,
        });
      }

      // Check if document is for an employer/company
      // Company documents: entityType should be "company" (or "COMPANY") AND isCompany = true
      const entityTypeUpper = documentExists.entityType.toUpperCase();
      const isCompanyEntityType = entityTypeUpper === "COMPANY";
      const isCompanyUser = user.isCompany === true;

      if (!isCompanyEntityType || !isCompanyUser) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Document with ID ${multimediaId} is not a company document. Entity type: ${documentExists.entityType}, User isCompany: ${user.isCompany}`,
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

  // API7: Update employer status (block/unblock/delete)
  updateEmployerStatus: protectedProcedureWithAuthHeader
    .input(employerStatusUpdateSchema)
    .mutation(async ({ input }) => {
      const { userId, action } = input;

      // Verify user is an employer
      const user = await prisma.user.findFirst({
        where: {
          userId,
          isCompany: true,
          company: {
            some: {},
          },
        },
      });

      if (!user) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Employer not found",
        });
      }

      let updated;
      if (action === "BLOCK") {
        updated = await prisma.user.update({
          where: { userId },
          data: { status: "BLOCKED" },
        });
      } else if (action === "UNBLOCK") {
        updated = await prisma.user.update({
          where: { userId },
          data: { status: "APPROVED" },
        });
      } else if (action === "DELETE") {
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

  // API8: Activate employer profile
  activateEmployer: protectedProcedureWithAuthHeader
    .input(employerActivationSchema)
    .mutation(async ({ input }) => {
      const { userId } = input;

      // First check if user exists
      const user = await prisma.user.findUnique({
        where: { userId },
        include: {
          company: true,
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

      // Check if user is a driver (not an employer)
      if (user.isCompany === false) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `User with ID ${userId} is a driver, not an employer`,
        });
      }

      // Check if user has a company record
      if (!user.company || user.company.length === 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `User with ID ${userId} does not have a company profile`,
        });
      }

      // Check if status is PENDING
      if (user.status !== "PENDING") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Employer with ID ${userId} does not have PENDING status. Current status: ${user.status || "null"}`,
        });
      }

      // Change status from PENDING to APPROVED
      const updated = await prisma.user.update({
        where: { userId },
        data: { status: "APPROVED" },
      });

      return {
        success: true,
        user: updated,
      };
    }),
});


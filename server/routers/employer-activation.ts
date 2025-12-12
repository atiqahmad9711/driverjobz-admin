import { z } from "zod";
import { router, protectedProcedureWithAuthHeader } from "../trpc";
import prisma from "@/util/prismaClient";
import { ProfileStatus, DocumentStatus } from "@prisma/client";

export const employerActivationRouter = router({
  // Listing of employer profiles awaiting activation
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

      const where: {
        isCompany: boolean;
        status: ProfileStatus;
        deletedAt: null;
        company: { some: {} };
      } = {
        isCompany: true,
        status: ProfileStatus.PENDING,
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
          include: {
            company: {
              take: 1,
            },
            roles: true,
          },
          orderBy: {
            createdAt: "desc",
          },
        }),
        prisma.user.count({ where }),
      ]);

      return {
        profiles,
        pagination: {
          page,
          pageSize,
          total,
          totalPages: Math.ceil(total / pageSize),
        },
      };
    }),

  // Listing of employer documents awaiting review
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
      const where: {
        entityId: { in: number[] };
        entityType: { in: string[] };
        status: DocumentStatus;
        deletedAt: null;
      } = {
        entityId: {
          in: companyIds,
        },
        entityType: {
          in: ["company", "COMPANY"],
        },
        status: DocumentStatus.PENDING,
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
});


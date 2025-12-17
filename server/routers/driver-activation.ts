import { z } from "zod";
import { router, protectedProcedureWithAuthHeader } from "../trpc";
import prisma from "@/util/prismaClient";
import { ProfileStatus, DocumentStatus } from "@prisma/client";

export const driverActivationRouter = router({
  // Listing of driver profiles awaiting activation
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
        driver: { isNot: null };
      } = {
        isCompany: false,
        status: ProfileStatus.PENDING,
        deletedAt: null,
        driver: {
          isNot: null,
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
            contactNumber: true,
            profilePicture: true,
            city: true,
            state: true,
            street: true,
            zipCode: true,
            isCompany: true,
            currentStep: true,
            currentStage: true,
            status: true,
            driver: {
              select: {
                driverId: true,
                driverCategory: true,
                userId: true,
                employmentType: true,
                workSplitShift: true,
                physicalAbility: true,
              },
            },
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

  // Listing of driver documents awaiting review
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

      // Get all driver_ids from Driver table where user has isCompany = false
      const drivers = await prisma.driver.findMany({
        where: {
          user: {
            isCompany: false,
            deletedAt: null,
          },
        },
        select: {
          driverId: true,
        },
      });

      const driverIds = drivers.map((driver) => driver.driverId);

      if (driverIds.length === 0) {
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
      // 1. entityType is "driver" or "DRIVER" (case-insensitive)
      // 2. entityId matches a driver_id (not user_id)
      // 3. status is PENDING
      // 4. not deleted
      const where: {
        entityId: { in: number[] };
        entityType: { in: string[] };
        status: DocumentStatus;
        deletedAt: null;
      } = {
        entityId: {
          in: driverIds,
        },
        entityType: {
          in: ["driver", "DRIVER"],
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

      // Get driver information for each document
      const entityIds = documents.map((doc) => doc.entityId);
      const driversWithUsers = await prisma.driver.findMany({
        where: {
          driverId: {
            in: entityIds,
          },
        },
        select: {
          driverId: true,
          user: {
            select: {
              firstName: true,
              lastName: true,
              name: true,
              email: true,
            },
          },
        },
      });

      // Create a map of driverId -> driver info
      const driverMap = new Map<number, { name: string | null; email: string | null }>(
        driversWithUsers.map((driver) => [
          driver.driverId,
          {
            name: driver.user.firstName && driver.user.lastName
              ? `${driver.user.firstName} ${driver.user.lastName}`
              : driver.user.name || null,
            email: driver.user.email || null,
          },
        ])
      );

      // Enrich documents with driver name and email
      const enrichedDocuments = documents.map((doc) => ({
        ...doc,
        driverName: driverMap.get(doc.entityId)?.name || null,
        driverEmail: driverMap.get(doc.entityId)?.email || null,
      }));

      return {
        documents: enrichedDocuments,
        pagination: {
          page,
          pageSize,
          total,
          totalPages: Math.ceil(total / pageSize),
        },
      };
    }),
});


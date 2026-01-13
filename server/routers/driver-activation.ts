import { z } from "zod";
import { router, protectedProcedureWithAuthHeader } from "../trpc";
import prisma from "@/util/prismaClient";
import { ProfileStatus, DocumentStatus } from "@prisma/client";
import { s3Client } from "@/util/s3Client";
import { getLang } from "@/util/helper";

export const driverActivationRouter = router({
  // Listing of driver profiles awaiting activation
  getProfilesAwaitingActivation: protectedProcedureWithAuthHeader
    .input(
      z.object({
        page: z.number().min(1).default(1).optional(),
        pageSize: z.number().min(1).max(100).default(10).optional(),
        search: z.string().optional(),
      }).optional()
    )
    .mutation(async ({ input, ctx }) => {
      const { page = 1, pageSize = 10, search } = input || {};
      const trimmedSearch = search?.trim() || undefined;
      const skip = (page - 1) * pageSize;
      const locale = getLang(ctx.req);

      const baseUserConditions = {
        isCompany: false,
        status: ProfileStatus.PENDING,
        deletedAt: null,
      };

      let where: any = {
        user: baseUserConditions,
      };

      if (trimmedSearch) {
        const categoryTranslationWhere: any = {
          name: {
            contains: trimmedSearch,
            mode: 'insensitive',
          },
          locale: locale,
        };
        
        let categoryTranslations = await prisma.transportationCategoryTranslation.findMany({
          where: categoryTranslationWhere,
          select: {
            transportationCategoryId: true,
          },
        });

        if (categoryTranslations.length === 0) {
          categoryTranslations = await prisma.transportationCategoryTranslation.findMany({
            where: {
              name: {
                contains: trimmedSearch,
                mode: 'insensitive',
              },
              locale: {
                in: ['en', 'es'],
              },
            },
            select: {
              transportationCategoryId: true,
            },
          });
        }

        const categoryIds = [...new Set(categoryTranslations.map((translation) => translation.transportationCategoryId))];

        const nameMatchingUsers = await prisma.user.findMany({
          where: {
            ...baseUserConditions,
            OR: [
              { firstName: { contains: trimmedSearch, mode: 'insensitive' } },
              { lastName: { contains: trimmedSearch, mode: 'insensitive' } },
              { name: { contains: trimmedSearch, mode: 'insensitive' } },
            ],
          },
          select: {
            userId: true,
          },
        });

        const nameMatchingUserIds = nameMatchingUsers.map(u => u.userId);
        const orConditions: any[] = [];

        if (categoryIds.length > 0) {
          orConditions.push({
            driverCategory: {
              in: categoryIds,
            },
            user: baseUserConditions,
          });
        }

        if (nameMatchingUserIds.length > 0) {
          orConditions.push({
            userId: {
              in: nameMatchingUserIds,
            },
            user: baseUserConditions,
          });
        }

        if (orConditions.length === 0) {
          return {
            drivers: [],
            total: 0,
            isLast: true,
            page,
            pageSize,
          };
        }

        where = {
          OR: orConditions,
        };
      }

      const [drivers, total] = await Promise.all([
        prisma.driver.findMany({
          where,
          include: {
            user: {
              select: {
                userId: true,
                email: true,
                firstName: true,
                lastName: true,
                name: true,
                state: true,
                city: true,
                status: true,
                currentStage: true,
                currentStep: true,
                createdAt: true,
                updatedAt: true,
                appliedJobs: {
                  select: {
                    jobPostingId: true,
                  },
                },
                connectionRequest: {
                  select: {
                    status: true,
                    id: true,
                    requesterId: true,
                    addresseeId: true,
                  },
                },
                connectionAddressee: {
                  select: {
                    status: true,
                    id: true,
                    requesterId: true,
                    addresseeId: true,
                  },
                },
                savedDrivers: {
                  select: {
                    driverId: true,
                  },
                },
                preHirePackages: {
                  select: {
                    status: true,
                    userId: true,
                    companyUserId: true,
                    preHirePackageId: true,
                  },
                },
              },
            },
            driverSpecialLicense: true,
            driverEmploymentHistory: {
              orderBy: {
                rank: 'asc',
              },
            },
            driverOtherCertifications: {
              orderBy: {
                rank: 'asc',
              },
            },
            category: {
              include: {
                translations: true,
              },
            },
            savedBy: {
              select: {
                userId: true,
              },
            },
            flags: {
              select: {
                userId: true,
                flagMessage: true,
              },
            },
          },
          orderBy: {
            createdAt: "desc",
          },
          skip,
          take: pageSize,
        }),
        prisma.driver.count({ where }),
      ]);

      const mappedDrivers = drivers.map((driver) => {
        const fullName = driver.user.firstName && driver.user.lastName
          ? `${driver.user.firstName} ${driver.user.lastName}`
          : driver.user.name || '';

        return {
          name: fullName,
          employmentArrangement: null, // Would need form values mapper
          state: driver.user.state,
          city: driver.user.city,
          cdlEndorsement: driver.driverLicenseEndorsements || undefined,
          driverLicenseClass: driver.driverLicenseClass || undefined,
          lastUpdatedAt: driver.updatedAt,
          experience: driver.totalExperienceYears || 
                     driver.totalVerifiableRelevantExperience || 
                     driver.totalVerifiableCdlExperience || 
                     driver.totalVerifiableBusDriverExperience || 
                     undefined,
          vehiclePreference: driver.vehiclePreference || undefined,
          availability: driver.availability || undefined,
          routeTypes: driver.routeTypes || undefined,
          preferredRouteType: driver.preferredRouteType || undefined,
          driverCategory: driver.driverCategory || undefined,
          employmentTypeDesc: driver.employmentType || undefined,
          currentStep: driver.user.currentStep,
          currentStage: driver.user.currentStage,
          emergencyVehicleTypes: driver.emergencyVehicleTypes || undefined,
          primaryVehicle: driver.primaryVehicle || undefined,
          category: driver.category?.translations?.[0]?.name || undefined,
          postedDate: driver.createdAt,
          flagged: driver.flags.length > 0,
          saved: driver.savedBy.length > 0,
          driverId: driver.driverId,
          userId: driver.user.userId,
          appliedJobId: driver.user.appliedJobs.map((job) => job.jobPostingId),
          appliedJobCount: driver.user.appliedJobs.length,
          flagMessage: driver.flags.length > 0 ? driver.flags[0].flagMessage : null,
          connectionRequest: driver.user.connectionRequest.length > 0 ? driver.user.connectionRequest[0] : null,
          connectionAddressee: driver.user.connectionAddressee.length > 0 ? driver.user.connectionAddressee[0] : null,
          savedDrivers: driver.user.savedDrivers.length > 0 ? driver.user.savedDrivers[0] : null,
          preHirePackages: driver.user.preHirePackages?.length ? driver.user.preHirePackages[0] : null,
          status: driver.user.status,
        };
      });


      return {
        drivers: mappedDrivers,
        total,
        isLast: total <= pageSize * page,
        page,
        pageSize,
      };
    }),

  // Listing of driver documents awaiting review
  getDocumentsAwaitingReview: protectedProcedureWithAuthHeader
    .input(
      z.object({
        page: z.number().min(1).default(1),
        pageSize: z.number().min(1).max(100).default(10),
        search: z.string().optional(),
      }).optional()
    )
    .mutation(async ({ input }) => {
      const { page = 1, pageSize = 10, search } = input || {};
      const trimmedSearch = search?.trim() || undefined;
      const skip = (page - 1) * pageSize;

      // Build user where clause for driver name filter
      const userWhere: any = {
        isCompany: false,
        deletedAt: null,
      };

      // Filter by driver name (search in firstName, lastName, or name)
      if (trimmedSearch) {
        userWhere.OR = [
          { firstName: { contains: trimmedSearch, mode: 'insensitive' } },
          { lastName: { contains: trimmedSearch, mode: 'insensitive' } },
          { name: { contains: trimmedSearch, mode: 'insensitive' } },
        ];
      }

      // Get all driver_ids from Driver table where user matches the search criteria
      const drivers = await prisma.driver.findMany({
        where: {
          user: userWhere,
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
              userId: true,
              firstName: true,
              lastName: true,
              name: true,
              email: true,
            },
          },
        },
      });

      // Create a map of driverId -> driver info
      const driverMap = new Map<number, { name: string | null; email: string | null; userId: number | null }>(
        driversWithUsers.map((driver) => [
          driver.driverId,
          {
            name: driver.user.firstName && driver.user.lastName
              ? `${driver.user.firstName} ${driver.user.lastName}`
              : driver.user.name || null,
            email: driver.user.email || null,
            userId: driver.user.userId || null,
          },
        ])
      );

      // Enrich documents with driver name, email, and document URL (matching backend serializeDocumentsResponseWithURL)
      const enrichedDocuments = await Promise.all(
        documents.map(async (doc) => {
          const url = await s3Client.generatePresignedDownloadUrl(doc.filePath, true);
          return {
            multimediaId: doc.multimediaId,
            entityId: doc.entityId,
            entityType: doc.entityType,
            entitySlug: doc.entitySlug,
            mimeType: doc.mimeType,
            filename: doc.filename,
            filepath: doc.filePath,
            side: doc.side,
            status: doc.status,
            createdAt: doc.createdAt,
            updatedAt: doc.updatedAt,
            driverName: driverMap.get(doc.entityId)?.name || null,
            driverEmail: driverMap.get(doc.entityId)?.email || null,
            userId: driverMap.get(doc.entityId)?.userId || null,
            url: url || null,
          };
        })
      );

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


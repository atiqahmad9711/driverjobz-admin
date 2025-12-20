import { router, protectedProcedureWithAuthHeader } from "../trpc";
import prisma from "@/util/prismaClient";

export const dashboardRouter = router({
  // Get dashboard quick stats
  getStats: protectedProcedureWithAuthHeader.query(async () => {
    // Get total drivers count stage-wise (excluding soft-deleted)
    const allDrivers = await prisma.user.findMany({
      where: {
        isCompany: false,
        deletedAt: null,
        driver: {
          isNot: null,
        },
      },
      select: {
        currentStage: true,
      },
    });

    const totalDriversByStage = allDrivers.reduce((acc, user) => {
      const stage = user.currentStage ?? 0;
      acc[stage] = (acc[stage] || 0) + 1;
      return acc;
    }, {} as Record<number, number>);

    const totalDrivers = allDrivers.length;

    // Get total employers/companies count stage-wise (excluding soft-deleted)
    const allEmployers = await prisma.user.findMany({
      where: {
        isCompany: true,
        deletedAt: null,
        company: {
          some: {},
        },
      },
      select: {
        currentStage: true,
      },
    });

    const totalEmployersByStage = allEmployers.reduce((acc, user) => {
      const stage = user.currentStage ?? 0;
      acc[stage] = (acc[stage] || 0) + 1;
      return acc;
    }, {} as Record<number, number>);

    const totalCompanies = allEmployers.length;

    // Get flagged profiles count (from FlagDriver and FlagJobPost tables)
    const flaggedDriversCount = await prisma.flagDriver.count({
      where: {
        deletedAt: null,
      },
    });

    const flaggedJobsCount = await prisma.flagJobPost.count({
      where: {
        deletedAt: null,
      },
    });

    const flaggedProfiles = flaggedDriversCount + flaggedJobsCount;

    // Get pending profile approvals count (drivers and employers with status = PENDING)
    const pendingDriverProfiles = await prisma.user.count({
      where: {
        isCompany: false,
        status: 'PENDING',
        deletedAt: null,
        driver: {
          isNot: null,
        },
      },
    });

    const pendingEmployerProfiles = await prisma.user.count({
      where: {
        isCompany: true,
        status: 'PENDING',
        deletedAt: null,
        company: {
          some: {},
        },
      },
    });

    const pendingApprovals = pendingDriverProfiles + pendingEmployerProfiles;

    // Get pending documents count for drivers and employers
    const pendingDriverDocuments = await prisma.multimedia.count({
      where: {
        entityType: 'DRIVER',
        status: 'PENDING',
        deletedAt: null,
      },
    });

    const pendingEmployerDocuments = await prisma.multimedia.count({
      where: {
        entityType: 'COMPANY',
        status: 'PENDING',
        deletedAt: null,
      },
    });

    const pendingDocuments = pendingDriverDocuments + pendingEmployerDocuments;

    return {
      totalDrivers,
      totalDriversByStage,
      totalCompanies,
      totalEmployersByStage,
      flaggedProfiles,
      flaggedDrivers: flaggedDriversCount,
      flaggedJobs: flaggedJobsCount,
      pendingApprovals,
      pendingDriverProfiles,
      pendingEmployerProfiles,
      pendingDocuments,
      pendingDriverDocuments,
      pendingEmployerDocuments,
    };
  }),
});


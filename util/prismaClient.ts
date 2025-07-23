import { config } from '@/config/config';
import { PrismaClient } from '@prisma/client';

console.log(`Database URL: ${config.be.db.url}`);

const prisma = new PrismaClient();

export default prisma;

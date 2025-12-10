# DriverJobz Admin Panel

Admin panel for managing DriverJobz platform - built with Next.js, tRPC, Prisma, and PostgreSQL.

## 🚀 Quick Start

### Quick Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Set up environment variables:**
   Create a `.env` file with:
   ```env
   DATABASE_URL="postgresql://user:password@host:5432/database"
   NEXTAUTH_SECRET="your-secret-key"
   FRONTEND_URL="http://localhost:3000"
   ```

3. **Generate Prisma client:**
   ```bash
   npm run prisma:gen
   ```

5. **Start development server:**
   ```bash
   npm run dev
   ```

6. **Open browser:**
   Navigate to [http://localhost:3000](http://localhost:3000)

## 🛠️ Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run prisma:gen` - Generate Prisma client
- `npm run lint` - Run ESLint

## 🧪 Testing APIs

After starting the server, test the APIs using:

## 🏗️ Tech Stack

- **Framework:** Next.js 15.4.1 (App Router)
- **Language:** TypeScript
- **API:** tRPC 11.4.3
- **Database:** PostgreSQL (Prisma ORM)
- **Authentication:** JWT (HTTP-only cookies)
- **UI:** React 19, Tailwind CSS, Radix UI

## 📝 Learn More

- [Next.js Documentation](https://nextjs.org/docs)
- [tRPC Documentation](https://trpc.io/docs)
- [Prisma Documentation](https://www.prisma.io/docs)
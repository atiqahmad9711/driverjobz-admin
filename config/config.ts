export const config = {
  be: {
    db: {
      url: process.env.DATABASE_URL,
    },
    auth: {
      secret: process.env.NEXTAUTH_SECRET,
    },
    apiUrl: process.env.BACKEND_API_URL,
  },
  fe: {
    url: process.env.FRONTEND_URL,
  },
  // Same email config as driverjobs-be (EMAIL_HOST, EMAIL_PORT, etc.)
  email: {
    service: process.env.EMAIL_SERVICE ?? undefined,
    host: process.env.EMAIL_HOST ?? "",
    port: process.env.EMAIL_PORT ? Number(process.env.EMAIL_PORT) : 587,
    secure: process.env.EMAIL_SECURE === "true",
    email: process.env.EMAIL ?? "",
    user: process.env.EMAIL_USER ?? "",
    password: process.env.EMAIL_PASSWORD ?? "",
  },
};
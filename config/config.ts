export const config = {
    be:{
        db: {
            url: process.env.DATABASE_URL
            
        },
        auth: {
            secret: process.env.NEXTAUTH_SECRET,
        }
    },
    fe:{
        url: process.env.FRONTEND_URL
    }
}
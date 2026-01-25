export const config = {
    be:{
        db: {
            url: process.env.DATABASE_URL
            
        },
        auth: {
            secret: process.env.NEXTAUTH_SECRET,
        },
        apiUrl: process.env.BACKEND_API_URL
        
    },
    fe:{
        url: process.env.FRONTEND_URL
    }
}
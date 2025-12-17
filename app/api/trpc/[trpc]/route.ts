import { type NextRequest } from 'next/server';
import { appRouter } from "@/server/routers/_app";
import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { createContext } from "@/server/trpc";

// CORS headers configuration - matching auth.login behavior
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS, PATCH',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With, Accept, Origin',
  'Access-Control-Allow-Credentials': 'true',
  'Access-Control-Max-Age': '86400',
};

// Handle OPTIONS request for CORS preflight
const handleOptions = () => {
  return new Response(null, {
    status: 204,
    headers: corsHeaders,
  });
};

const handler = async (req: NextRequest) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return handleOptions();
  }

  const ctx = await createContext({ req });
  
  // Add CORS headers to context response headers first
  Object.entries(corsHeaders).forEach(([key, value]) => {
    ctx.resHeaders.set(key, value);
  });

  const response = await fetchRequestHandler({
    endpoint: "/api/trpc",
    req,
    router: appRouter,
    createContext: async () => {
      return ctx;
    },
    onError: ({ error }) => {
      console.error("tRPC error:", error);
    },
    responseMeta() {
      const headersObj = Object.fromEntries(ctx.resHeaders.entries());

      return {
        headers: {
          ...corsHeaders,
          ...headersObj,
        },
      };
    },
  });

  // Create new Headers object with CORS headers
  const responseHeaders = new Headers(response.headers);
  
  // Ensure all CORS headers are set (override any existing ones)
  Object.entries(corsHeaders).forEach(([key, value]) => {
    responseHeaders.set(key, value);
  });

  // Return response with CORS headers, using the original body
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: responseHeaders,
  });
};

export { handler as GET, handler as POST, handleOptions as OPTIONS };

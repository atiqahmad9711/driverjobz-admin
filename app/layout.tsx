import type { Metadata } from "next";
import "./globals.css";
import { AppSidebar } from "@/components/app-sidebar";
import { SiteHeader } from "@/components/site-header";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { TRPCProvider } from "@/providers/trpc-provider";
import { AppLayout } from "@/components/layout/app-layout";
import { Navbar } from "@/components/navbar";

export const metadata: Metadata = {
  title: "DriverJobz Admin",
  description: "Admin panel for DriverJobz",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <TRPCProvider>
          <AppLayout>
            <Navbar />
            <main className="container py-6">
              <SidebarProvider
                style={
                  {
                    "--sidebar-width": "calc(var(--spacing) * 72)",
                    "--header-height": "calc(var(--spacing) * 12)",
                  } as React.CSSProperties
                }
              >
                <AppSidebar variant="inset" />
                <SidebarInset>
                  <SiteHeader />
                  {children}
                </SidebarInset>
              </SidebarProvider>
            </main>
          </AppLayout>
        </TRPCProvider>
      </body>
    </html>
  );
}

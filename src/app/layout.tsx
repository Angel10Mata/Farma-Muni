import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import { ThemeProvider } from "@/components/(base)/theme/TemaProvider";
import EncabezadoApp from "@/components/(base)/layout/EncabezadoApp";
import { createClient } from "@/utils/supabase/server";
import Providers from "@/components/(base)/providers/QueryProviders";
import { UserProvider } from "@/components/(base)/providers/UserProvider";
import { DemoModeProvider } from "@/components/(base)/providers/DemoModeProvider";
import DemoModeBanner from "@/components/(base)/layout/DemoModeBanner";
import OfflineBanner from "@/components/OfflineBanner";
import ObsToastContainer from "@/components/(base)/layout/ObsToastContainer";


const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#000000",
};

export const metadata: Metadata = {
  title: "FarmaMuni",
  description: "Sistema Integral de Gestión - FarmaMuni",
  other: {
    google: "notranslate",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "FarmaMuni",
  },
  icons: {
    icon: "/farmamuni/logo.png",
    apple: "/farmamuni/logo.png",
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const supabase = await createClient();
  let user = null;
  try {
    const { data } = await supabase.auth.getUser();
    user = data.user;
  } catch (error) {
    console.error("Supabase auth error:", error);
  }

  return (
    <html lang="es" suppressHydrationWarning>
      <body
        suppressHydrationWarning
        style={{
          paddingTop: "var(--banner-height, 0px)",
          transition: "padding-top 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
        }}
        className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen bg-background flex flex-col relative`}
      >

        <Providers>
          <ThemeProvider
            attribute="class"
            defaultTheme="dark"
            disableTransitionOnChange
          >
            <UserProvider user={user}>
              <DemoModeProvider>
                <OfflineBanner />
                <DemoModeBanner />
                <EncabezadoApp />
                <main className="flex-1 w-full flex flex-col">
                  {children}
                </main>
                <ObsToastContainer />
              </DemoModeProvider>
            </UserProvider>
          </ThemeProvider>
        </Providers>
        <Script
          src="https://cdn.lordicon.com/lordicon.js"
          strategy="afterInteractive"
        />
      </body>
    </html>
  );
}

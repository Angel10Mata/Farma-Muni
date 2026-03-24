import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/(base)/theme/provider";
import { NavDock } from "@/components/(base)/layout/nav-dock";
import Header from "@/components/(base)/layout/header";
import { createClient } from "@/utils/supabase/server";
import Providers from "@/components/(base)/providers/QueryProviders";
import { UserProvider } from "@/components/(base)/providers/UserProvider";

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
  // Color institucional verde esmeralda para la barra del celular
  themeColor: "#10b981", 
};

export const metadata: Metadata = {
  // Ajustamos los títulos para tu proyecto municipal
  title: "Farma-Muni Control",
  description: "Sistema de gestión para clínicas y farmacias municipales.",
  // Vinculamos el archivo manifest.ts que creamos
  manifest: "/manifest", 
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Farma-Muni",
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    // Estos son los archivos que mencionaba tu captura de WhatsApp
    apple: "/apple-touch-icon.png",
    shortcut: "/favicon.ico",
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <html lang="es" suppressHydrationWarning>
      <body
        suppressHydrationWarning
        className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen bg-background flex flex-col`}
      >
        <Providers>
          <ThemeProvider
            attribute="class"
            // Por defecto iniciará en el tema del sistema (oscuro o claro)
            defaultTheme="system" 
            enableSystem
            disableTransitionOnChange
          >
            <UserProvider user={user}>
              <Header />
              {/* El pb-32 asegura que el NavDock no tape el contenido */}
              <main className="flex-1 w-full pb-32">{children}</main>
              <NavDock />
            </UserProvider>
          </ThemeProvider>
        </Providers>
      </body>
    </html>
  );
}
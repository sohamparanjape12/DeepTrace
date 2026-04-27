import { Plus_Jakarta_Sans, Space_Mono } from "next/font/google";
import { AuthProvider } from "@/lib/auth-context";
import { ThemeProvider } from "@/lib/theme-provider";
import "./globals.css";
import "../styles/notifications.css";


const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-jakarta",
  display: 'swap',
});

const spaceMono = Space_Mono({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-mono",
  display: 'swap',
});

export const metadata = {
  title: "DeepTrace",
  description: "DeepTrace",
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || "https://app.deeptrace.io"),
  icons: {
    icon: "/icon.svg"
  },
  openGraph: {
    title: "DeepTrace",
    description: "DeepTrace",
    url: "https://app.deeptrace.io",
    siteName: "DeepTrace",
    icons: {
      icon: "/icon.svg"
    },
    locale: "en_US",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${jakarta.variable} ${spaceMono.variable} font-sans bg-brand-bg text-brand-text antialiased selection:bg-brand-accent/30`}>
        <AuthProvider>
          <ThemeProvider>
            {children}
          </ThemeProvider>
        </AuthProvider>
      </body>
    </html>
  );
}

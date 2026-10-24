import type { Metadata } from "next";
import { GlobalProvider } from "@/context/GlobalContext";
import { AppShell } from "@/components/AppShell";
import "./globals.css";
import { ThemeProvider } from "@/components/ThemeProvider";
export const metadata: Metadata = { title: "Nolyp · Support Hub", description: "Central de suporte com investigação assistida. MVP demonstrativo com dados fictícios.", icons: { icon: "/favicon.svg" } };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="pt-BR"><body><ThemeProvider><GlobalProvider><AppShell>{children}</AppShell></GlobalProvider></ThemeProvider></body></html>; }

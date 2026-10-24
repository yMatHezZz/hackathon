import { ApproveDashboard } from "@/components/approve/ApproveDashboard";
export default async function RequerentePage({ searchParams }: { searchParams: Promise<{ aba?: string }> }) { return <ApproveDashboard portal="requerente" initialTab={(await searchParams).aba === "protocolados" ? "submitted" : "available"} />; }

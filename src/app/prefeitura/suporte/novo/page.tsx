import { MunicipalSupportForm } from "@/components/approve/MunicipalSupportForm";
export default async function NovoSuportePage({ searchParams }: { searchParams: Promise<{ processo?: string; ia?: string }> }) {
  const params = await searchParams;
  return <MunicipalSupportForm initialProcessId={params.processo} includeAi={params.ia === "1"} />;
}

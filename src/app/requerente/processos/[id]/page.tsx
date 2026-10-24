import { ProcessWorkspace } from "@/components/approve/ProcessWorkspace";
export default async function ProcessPage({ params }: { params: Promise<{ id: string }> }) {
  return <ProcessWorkspace id={(await params).id} />;
}

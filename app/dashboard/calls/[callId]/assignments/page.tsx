import CallAssignmentsClient from "./CallAssignmentsClient";
import type { Id } from "@/convex/_generated/dataModel";

type PageProps = {
  params: Promise<{
    callId: string;
  }>;
};

export default async function CallAssignmentsPage({ params }: PageProps) {
  const { callId } = await params;
  return <CallAssignmentsClient callId={callId as Id<"calls">} />;
}

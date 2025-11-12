import ProposalReviewClient from "./ProposalReviewClient";
import type { Id } from "@/convex/_generated/dataModel";

type PageProps = {
  params: Promise<{
    proposalId: string;
  }>;
};

export default async function ProposalReviewPage({ params }: PageProps) {
  const { proposalId } = await params;
  return <ProposalReviewClient proposalId={proposalId as Id<"proposals">} />;
}

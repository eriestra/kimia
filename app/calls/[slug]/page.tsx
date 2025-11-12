import CallDetailClient from "./CallDetailClient";

type CallDetailPageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export default async function CallDetailPage({ params }: CallDetailPageProps) {
  const { slug } = await params;
  const decodedSlug = decodeURIComponent(slug);
  return <CallDetailClient slug={decodedSlug} />;
}

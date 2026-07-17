import { PublicDisplayLive } from '@/features/queue/public-display-live';

export const dynamic = 'force-dynamic';

export default async function DisplayPage({
  params,
}: PageProps<'/q/[slug]/display'>) {
  const { slug } = await params;
  return <PublicDisplayLive slug={slug} />;
}

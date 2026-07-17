import { InvalidQueue } from '@/components/invalid-queue';
import { productConfig } from '@/config/product';
import { PublicDisplay } from '@/features/queue/public-display';

export default async function DisplayPage({
  params,
}: PageProps<'/q/[slug]/display'>) {
  const { slug } = await params;
  if (slug !== productConfig.demoQueueSlug) return <InvalidQueue />;
  return <PublicDisplay />;
}

import { CustomerLive } from '@/features/queue/customer-live';

export const dynamic = 'force-dynamic';

export default async function CustomerPage({ params }: PageProps<'/q/[slug]'>) {
  const { slug } = await params;

  return (
    <main id="main-content" className="queue-page-shell">
      <CustomerLive slug={slug} />
    </main>
  );
}

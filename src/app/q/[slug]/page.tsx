import { PrototypeHeader } from '@/components/prototype-header';
import { CustomerLive } from '@/features/queue/customer-live';

export const dynamic = 'force-dynamic';

export default async function CustomerPage({ params }: PageProps<'/q/[slug]'>) {
  const { slug } = await params;

  return (
    <main id="main-content" className="prototype-shell">
      <PrototypeHeader
        eyebrow="Customer check-in"
        title="Live customer queue"
      />
      <CustomerLive slug={slug} />
    </main>
  );
}

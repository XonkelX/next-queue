import { PrototypeHeader } from '@/components/prototype-header';
import { StaffLive } from '@/features/queue/staff-live';

export const dynamic = 'force-dynamic';

export default async function StaffPage({
  params,
}: PageProps<'/q/[slug]/staff'>) {
  const { slug } = await params;

  return (
    <main id="main-content" className="prototype-shell">
      <PrototypeHeader eyebrow="Staff queue board" title="Live staff queue" />
      <StaffLive slug={slug} />
    </main>
  );
}

import { StaffLive } from '@/features/queue/staff-live';

export const dynamic = 'force-dynamic';

export default async function StaffPage({
  params,
}: PageProps<'/q/[slug]/staff'>) {
  const { slug } = await params;

  return (
    <main id="main-content" className="queue-page-shell">
      <StaffLive slug={slug} />
    </main>
  );
}

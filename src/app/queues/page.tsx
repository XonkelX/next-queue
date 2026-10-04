import type { Metadata } from 'next';
import { MyQueues } from '@/features/queue/my-queues';
export const metadata: Metadata = {
  title: 'My queues',
  alternates: { canonical: null },
  robots: { index: false, follow: false },
};
export const dynamic = 'force-dynamic';
export default function QueuesPage() {
  return (
    <main id="main-content" className="page-shell workspace-page">
      <p className="eyebrow">Your workspace</p>
      <h1>My queues</h1>
      <p>Pick up where you left off.</p>
      <MyQueues />
    </main>
  );
}

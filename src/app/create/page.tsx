import type { Metadata } from 'next';
import { Eye, ShieldCheck, Wifi } from 'lucide-react';
import { CreateQueuePanel } from '@/features/queue/create-queue-panel';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = {
  title: 'Create your queue',
  alternates: { canonical: '/create' },
  description:
    'Set up a queue for your venue and share its customer, staff, and display views.',
};

export default function CreatePage() {
  return (
    <main id="main-content" className="page-shell create-page">
      <div className="create-intro">
        <p className="eyebrow">Start your service</p>
        <h1>Create your queue.</h1>
        <p className="lede">
          Name your venue to start. Share the customer link when you are ready.
        </p>
      </div>
      <CreateQueuePanel />
      <aside className="create-note" aria-label="Using your queue">
        <div className="create-proof">
          <Wifi aria-hidden="true" />
          <span>
            <strong>One live queue</strong>Customer, staff, and display stay
            synchronized.
          </span>
        </div>
        <div className="create-proof">
          <ShieldCheck aria-hidden="true" />
          <span>
            <strong>Keep access private</strong>Share the customer link
            publicly. Give the staff code only to your team.
          </span>
        </div>
        <div className="create-proof">
          <Eye aria-hidden="true" />
          <span>
            <strong>Keep your links</strong>Bookmark the staff board and open
            the display on your venue screen.
          </span>
        </div>
      </aside>
    </main>
  );
}

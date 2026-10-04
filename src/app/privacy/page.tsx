import type { Metadata } from 'next';
import Link from 'next/link';
import { SiteFooter } from '@/components/site-footer';

export const metadata: Metadata = {
  title: 'Privacy',
  alternates: { canonical: '/privacy' },
};
export default function PrivacyPage() {
  return (
    <>
      <main id="main-content" className="workspace-page legal-copy">
        <p className="eyebrow">Your information</p>
        <h1>Privacy at Next.</h1>
        <p>
          Next uses a browser session to connect you to your ticket or staff
          board. You do not need to provide an email address or phone number.
        </p>
        <h2>What is stored</h2>
        <p>
          We store an anonymous user identifier, queue and ticket details,
          timestamps, and service actions. A first name is optional. Session
          credentials are stored in your browser to keep your access active.
          Hosting and database providers may also process connection
          information, such as IP addresses, in their operational logs.
        </p>
        <h2>Who can see it</h2>
        <p>
          Anyone with a queue link can see its name, status and ticket numbers.
          Your optional name is visible to you and authorized staff. It is not
          shown on the public display or to other guests. Queue links should
          only be shared where you intend the queue to be accessible.
        </p>
        <h2>Staff access</h2>
        <p>
          Staff codes give control of a queue. Share them privately. The queue
          creator can replace the code and revoke other staff access from the
          original browser session. Clearing browser data removes local access;
          a saved staff code can restore staff access, but not the original
          creator identity or a customer ticket.
        </p>
        <h2>Storage and retention</h2>
        <p>
          Next uses Supabase for authentication, database storage and live
          updates, and Vercel for hosting. Queue history currently has no
          automatic deletion period. Closing a queue does not delete its
          records. Avoid entering sensitive information in a queue name or
          optional first name.
        </p>
        <p>
          <Link href="/">Back to Next</Link>
        </p>
      </main>
      <SiteFooter />
    </>
  );
}

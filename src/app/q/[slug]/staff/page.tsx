import { InvalidQueue } from '@/components/invalid-queue';
import { PrototypeHeader } from '@/components/prototype-header';
import { productConfig } from '@/config/product';
import { StaffPrototype } from '@/features/queue/staff-prototype';

export default async function StaffPage({
  params,
}: PageProps<'/q/[slug]/staff'>) {
  const { slug } = await params;
  if (slug !== productConfig.demoQueueSlug) return <InvalidQueue />;

  return (
    <main id="main-content" className="prototype-shell">
      <PrototypeHeader
        eyebrow="Staff queue board"
        title={productConfig.demoQueueName}
      />
      <StaffPrototype />
    </main>
  );
}

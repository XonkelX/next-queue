import { InvalidQueue } from '@/components/invalid-queue';
import { PrototypeHeader } from '@/components/prototype-header';
import { productConfig } from '@/config/product';
import { CustomerPrototype } from '@/features/queue/customer-prototype';

export default async function CustomerPage({ params }: PageProps<'/q/[slug]'>) {
  const { slug } = await params;
  if (slug !== productConfig.demoQueueSlug) return <InvalidQueue />;

  return (
    <main id="main-content" className="prototype-shell">
      <PrototypeHeader
        eyebrow="Customer check-in"
        title={productConfig.demoQueueName}
      />
      <CustomerPrototype />
    </main>
  );
}

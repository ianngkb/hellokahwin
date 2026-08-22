import type { Metadata } from 'next';
import { requireAdminSection } from '@/lib/auth/admin';
import { ConsoleBreadcrumb } from '@/components/console/console-breadcrumb';
import { PageHeader } from '@/components/layout/page-header';
import { CreateBlockForm } from './create-block-form';

export const metadata: Metadata = {
  title: 'New Dynamic Block - Admin',
};

export default async function CreateDynamicBlockPage() {
  await requireAdminSection('inspire');

  return (
    <div className="mx-auto max-w-xl">
      <PageHeader
        breadcrumb={
          <ConsoleBreadcrumb
            items={[
              { label: 'Admin' },
              { label: 'Inspire', href: '/admin/inspire' },
              { label: 'Dynamic blocks', href: '/admin/inspire/dynamic-blocks' },
              { label: 'New block' },
            ]}
          />
        }
        title="New dynamic block"
        description="Blocks start as drafts — you add content, targeting rules and publish from the editor."
      />
      <CreateBlockForm />
    </div>
  );
}

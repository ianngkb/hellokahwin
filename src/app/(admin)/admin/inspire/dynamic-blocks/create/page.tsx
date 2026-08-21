import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeftIcon } from 'lucide-react';
import { requireAdminSection } from '@/lib/auth/admin';
import { Button } from '@/components/ui/button';
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
          <Button asChild variant="ghost" size="sm" className="-ml-2">
            <Link href="/admin/inspire/dynamic-blocks">
              <ArrowLeftIcon className="mr-1 size-4" />
              Back to Dynamic Blocks
            </Link>
          </Button>
        }
        title="New Dynamic Block"
        description="Blocks start as drafts — you add content, targeting rules and publish from the editor."
      />
      <CreateBlockForm />
    </div>
  );
}

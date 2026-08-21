'use client';

import { GridIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PhotoGallery } from './photo-gallery';
import type { GalleryImage } from './article-renderer';

interface MobilePhotoBarProps {
  galleryImages: GalleryImage[];
}

export function MobilePhotoBar({ galleryImages }: MobilePhotoBarProps) {
  if (galleryImages.length === 0) return null;

  return (
    <PhotoGallery
      images={galleryImages}
      trigger={
        <div className="bg-background fixed inset-x-0 bottom-0 z-40 border-t p-3 lg:hidden">
          <Button variant="quiet" className="w-full gap-2" asChild>
            <span>
              <GridIcon className="size-4" />
              Lihat Semua Foto ({galleryImages.length})
            </span>
          </Button>
        </div>
      }
    />
  );
}

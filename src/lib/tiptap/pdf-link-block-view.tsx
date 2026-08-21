'use client';

import type { NodeViewProps } from '@tiptap/react';
import { PdfLinkView } from './pdf-link-shared-view';

export function PdfLinkBlockNodeView(props: NodeViewProps) {
  return <PdfLinkView inline={false} {...props} />;
}

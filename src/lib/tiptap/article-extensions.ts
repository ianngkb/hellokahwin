import { StarterKit, TiptapLink, TiptapUnderline } from 'novel';
import Table from '@tiptap/extension-table';
import TableRow from '@tiptap/extension-table-row';
import TableHeader from '@tiptap/extension-table-header';
import TableCell from '@tiptap/extension-table-cell';
import { CustomImage } from './custom-image';
import { GalleryBlock } from './gallery-block';
import { SectionBlock } from './section-block';
import { FigureBlock } from './figure-block';
import { CtaButtonBlock } from './cta-button-block';
import { PdfLinkBlock } from './pdf-link-block';
import { PdfLinkInline } from './pdf-link-inline';

// Shared article-writer extension set — the full node/mark vocabulary of
// `articles.content`. Used by the article editor and the dynamic-block editor
// so blocks support everything articles do. Editor-specific extras (slash
// commands, drag handle, dynamicBlockEmbed) are appended by each consumer.
export function createArticleBaseExtensions() {
  return [
    StarterKit,
    CustomImage,
    GalleryBlock as unknown as typeof StarterKit,
    SectionBlock as unknown as typeof StarterKit,
    FigureBlock as unknown as typeof StarterKit,
    CtaButtonBlock as unknown as typeof StarterKit,
    PdfLinkBlock as unknown as typeof StarterKit,
    PdfLinkInline as unknown as typeof StarterKit,
    Table.configure({ resizable: true }),
    TableRow,
    TableHeader,
    TableCell,
    TiptapLink.configure({ openOnClick: false, defaultProtocol: 'https' }),
    TiptapUnderline,
  ];
}

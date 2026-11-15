import { MessageCircle } from 'lucide-react';

/**
 * Prominent WhatsApp share — this audience is WhatsApp-native, so sharing sits
 * near the top of the article rather than buried in a share sheet (Mobbin
 * research, article-page recommendations). Pure link, no JS: wa.me pre-fills
 * the message with title + URL.
 *
 * Styled as the same outlined pill as the category chips rather than WhatsApp
 * green, so it sits in the article sidebar like the rest of the layout; the
 * label already says where the share goes.
 */
export function WhatsAppShare({ title, url }: { title: string; url: string }) {
  const text = encodeURIComponent(`${title}\n${url}`);
  return (
    <a
      href={`https://wa.me/?text=${text}`}
      target="_blank"
      rel="noopener noreferrer"
      className="text-foreground hover:bg-foreground hover:text-background hover:border-foreground inline-flex min-h-10 items-center gap-2 rounded-full border px-4 py-1.5 text-xs font-medium tracking-wider uppercase transition-colors"
      style={{ fontFamily: 'var(--font-geist)' }}
    >
      <MessageCircle className="size-4" aria-hidden />
      WhatsApp
    </a>
  );
}

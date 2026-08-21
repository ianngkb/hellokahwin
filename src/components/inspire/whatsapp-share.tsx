import { MessageCircle } from 'lucide-react';

/**
 * Prominent WhatsApp share — this audience is WhatsApp-native, so sharing sits
 * near the top of the article rather than buried in a share sheet (Mobbin
 * research, article-page recommendations). Pure link, no JS: wa.me pre-fills
 * the message with title + URL.
 */
export function WhatsAppShare({ title, url }: { title: string; url: string }) {
  const text = encodeURIComponent(`${title}\n${url}`);
  return (
    <a
      href={`https://wa.me/?text=${text}`}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex min-h-[44px] items-center gap-2 rounded-full bg-[#25D366] px-5 text-sm font-semibold text-white transition-opacity hover:opacity-90"
    >
      <MessageCircle className="size-4" aria-hidden />
      Kongsi di WhatsApp
    </a>
  );
}

import { MessageCircle } from 'lucide-react';

/**
 * Prominent WhatsApp share — this audience is WhatsApp-native, so sharing sits
 * near the top of the article rather than buried in a share sheet (Mobbin
 * research, article-page recommendations). Pure link, no JS: wa.me pre-fills
 * the message with title + URL.
 *
 * Styled as the system's ink button rather than WhatsApp green: the public
 * surface is monotone, and the label already says where the share goes.
 */
export function WhatsAppShare({ title, url }: { title: string; url: string }) {
  const text = encodeURIComponent(`${title}\n${url}`);
  return (
    <a
      href={`https://wa.me/?text=${text}`}
      target="_blank"
      rel="noopener noreferrer"
      className="hk-btn"
    >
      <MessageCircle className="size-4" aria-hidden />
      WhatsApp
    </a>
  );
}

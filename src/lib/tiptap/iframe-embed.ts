import { Node, mergeAttributes } from '@tiptap/core';

// Hosts an embed iframe may point at. Mirrors (and must stay in sync with) the
// sanitizer allowlist in src/components/inspire/article-renderer.tsx — the
// node gates what can be STORED, the sanitizer gates what can be RENDERED, and
// both must agree or an embed silently disappears at one of the two layers.
const ALLOWED_EMBED_HOSTS = new Set([
  'www.youtube.com',
  'youtube.com',
  'player.vimeo.com',
  'vimeo.com',
  'www.instagram.com',
  'instagram.com',
]);

export function isAllowedEmbedSrc(src: unknown): src is string {
  if (typeof src !== 'string' || !src) return false;
  try {
    const url = new URL(src);
    return url.protocol === 'https:' && ALLOWED_EMBED_HOSTS.has(url.hostname);
  } catch {
    return false;
  }
}

/**
 * What an editor pasted into the Embed dialog → the iframe src to store, or
 * `null` when it is not something the article may embed.
 *
 * Editors paste the address they see in the browser bar, not the embed URL,
 * so the common shapes are translated:
 *   - youtube.com/watch?v=ID, youtu.be/ID, youtube.com/shorts/ID
 *       → https://www.youtube.com/embed/ID
 *   - vimeo.com/ID → https://player.vimeo.com/video/ID
 *   - instagram.com/p/CODE/ or /reel/CODE/ → https://www.instagram.com/p/CODE/embed
 *     (Instagram's no-JS embed page; the renderer's sanitizer allows it)
 * An address already in embed form is kept when its host is allowed.
 * Anything else — another host, http:, junk — is refused, never stored.
 */
export function toEmbedSrc(raw: string): string | null {
  const input = raw.trim();
  if (!input) return null;
  let url: URL;
  try {
    url = new URL(/^[a-z][a-z0-9+.-]*:\/\//i.test(input) ? input : `https://${input}`);
  } catch {
    return null;
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') return null;
  const host = url.hostname.toLowerCase().replace(/^m\./, 'www.');
  const parts = url.pathname.split('/').filter(Boolean);
  const id = (value: string | null | undefined) =>
    value && /^[A-Za-z0-9_-]+$/.test(value) ? value : null;

  if (host === 'youtu.be') {
    const v = id(parts[0]);
    return v ? `https://www.youtube.com/embed/${v}` : null;
  }
  if (host === 'youtube.com' || host === 'www.youtube.com') {
    if (parts[0] === 'embed') {
      const v = id(parts[1]);
      return v ? `https://www.youtube.com/embed/${v}` : null;
    }
    if (parts[0] === 'shorts' || parts[0] === 'live') {
      const v = id(parts[1]);
      return v ? `https://www.youtube.com/embed/${v}` : null;
    }
    const v = id(url.searchParams.get('v'));
    return v ? `https://www.youtube.com/embed/${v}` : null;
  }
  if (host === 'player.vimeo.com') {
    const v = parts[0] === 'video' ? id(parts[1]) : null;
    return v && /^\d+$/.test(v) ? `https://player.vimeo.com/video/${v}` : null;
  }
  if (host === 'vimeo.com' || host === 'www.vimeo.com') {
    const v = parts.find((p) => /^\d+$/.test(p));
    return v ? `https://player.vimeo.com/video/${v}` : null;
  }
  if (host === 'instagram.com' || host === 'www.instagram.com') {
    const kind = parts[0];
    const code = id(parts[1]);
    if ((kind === 'p' || kind === 'reel' || kind === 'tv') && code) {
      return `https://www.instagram.com/${kind}/${code}/embed`;
    }
    return null;
  }
  return null;
}

/**
 * Block-level embed iframe (Instagram post/reel, YouTube, Vimeo).
 *
 * Exists because `articles.content` previously had NO node capable of holding
 * an iframe: `generateJSON` dropped them on import and `generateHTML` could
 * never emit one, which made the sanitizer's iframe allowlist unreachable for
 * editor-authored content. Editorial roundups now embed a vendor's own
 * Instagram post instead of rehosting photography — this node is what carries
 * that through save → store → render.
 *
 * Atom node, no NodeView: the editor shows the live embed via this same
 * renderHTML. An src outside the allowlist renders as an empty paragraph
 * rather than an iframe — never a foreign frame.
 */
export const IframeEmbed = Node.create({
  name: 'iframeEmbed',
  group: 'block',
  atom: true,
  draggable: true,

  addAttributes() {
    return {
      src: { default: '' },
      width: { default: 540 },
      height: { default: 640 },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'iframe[src]',
        getAttrs: (element) => {
          const el = element as HTMLElement;
          const src = el.getAttribute('src') ?? '';
          if (!isAllowedEmbedSrc(src)) return false;
          return {
            src,
            width: Number(el.getAttribute('width')) || 540,
            height: Number(el.getAttribute('height')) || 640,
          };
        },
      },
    ];
  },

  renderHTML({ node }) {
    if (!isAllowedEmbedSrc(node.attrs.src)) return ['p', {}];
    return [
      'iframe',
      mergeAttributes({
        src: node.attrs.src,
        width: node.attrs.width,
        height: node.attrs.height,
        frameborder: '0',
        scrolling: 'no',
        allowfullscreen: 'true',
        loading: 'lazy',
      }),
    ];
  },
});

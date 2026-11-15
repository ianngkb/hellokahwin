import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import type { Node as PMNode, Mark } from '@tiptap/pm/model';
import { applyLinkRelPolicy } from './link-rel';

/**
 * Editor twin of the connector's link policy. With Tiptap's default
 * `target/rel` removed (LINK_HTML_ATTRIBUTES), a link that did NOT come from
 * the link dialog — an autolinked URL, a pasted link — would otherwise be saved
 * with no rel/target at all. This gives such NEW external links the same
 * default the connector uses (`applyLinkRelPolicy`: new tab + noopener
 * noreferrer, followed).
 *
 * It never touches:
 *   - dialog writes: `setLink`/`unsetLink` carry `preventAutolink`, so an
 *     editor's explicit choice (incl. a same-tab followed external link) stands;
 *   - internal links (policy leaves them as written);
 *   - a link that already existed before this transaction with the same href
 *     (typing inside an existing link must not re-decide its rel).
 */
const key = new PluginKey('linkRelPolicy');

function linkMark(node: PMNode): Mark | undefined {
  return node.marks.find((m) => m.type.name === 'link');
}

export const LinkRelPolicy = Extension.create({
  name: 'linkRelPolicy',
  addProseMirrorPlugins() {
    return [
      new Plugin({
        key,
        appendTransaction(transactions, oldState, newState) {
          const relevant = transactions.filter(
            (t) => t.docChanged && !t.getMeta('preventAutolink') && !t.getMeta(key),
          );
          if (!relevant.length) return null;
          const linkType = newState.schema.marks.link;
          if (!linkType) return null;

          // Changed ranges in the NEW doc, across every relevant transaction.
          const ranges: Array<[number, number]> = [];
          for (const t of relevant) {
            t.mapping.maps.forEach((map, i) => {
              map.forEach((_oldStart, _oldEnd, newStart, newEnd) => {
                const rest = t.mapping.slice(i + 1);
                ranges.push([rest.map(newStart, -1), rest.map(newEnd, 1)]);
              });
            });
          }
          if (!ranges.length) return null;

          const tr = newState.tr;
          const size = newState.doc.content.size;
          const oldSize = oldState.doc.content.size;
          for (const [from, to] of ranges) {
            newState.doc.nodesBetween(Math.max(0, from), Math.min(size, to), (node, pos) => {
              if (!node.isText) return;
              const mark = linkMark(node);
              if (!mark || mark.attrs.rel || mark.attrs.target) return;
              const next = applyLinkRelPolicy(mark.attrs);
              if (next === mark.attrs) return;
              // Existed before with the same href? Then it is not new — leave it.
              let existed = false;
              for (const t of relevant) {
                const back = t.mapping.invert().map(pos);
                const a = Math.max(0, Math.min(oldSize, back));
                const b = Math.max(a, Math.min(oldSize, back + node.nodeSize));
                oldState.doc.nodesBetween(a, b, (n) => {
                  const m = n.isText ? linkMark(n) : undefined;
                  if (m && m.attrs.href === mark.attrs.href) existed = true;
                });
              }
              if (existed) return;
              tr.removeMark(pos, pos + node.nodeSize, linkType);
              tr.addMark(pos, pos + node.nodeSize, linkType.create(next));
            });
          }
          if (!tr.docChanged) return null;
          return tr.setMeta(key, true);
        },
      }),
    ];
  },
});

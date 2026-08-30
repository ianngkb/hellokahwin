// Normalise an image URL/key fragment scraped out of live HTML to the stem
// `inspire/<article>/<uploadStamp>-<name>` that identifies one uploaded asset.
//
// Two things have to be stripped, and both bit once:
//  - a trailing backslash, because the RSC flight payload embeds the URL inside
//    a JSON string and the scrape catches the closing `\"`;
//  - the variant filename (`high.webp`, `crop-16x9-og.webp`, `original.jpg`) or,
//    on the original object, the extension.
export function normStem(s) {
  const p = String(s).replace(/\\+$/, '').split('/');
  const l = p[p.length - 1];
  if (/^(high|low|original|crop-)/.test(l)) p.pop();
  else p[p.length - 1] = l.replace(/\.[a-z0-9]+$/i, '');
  return p.join('/');
}

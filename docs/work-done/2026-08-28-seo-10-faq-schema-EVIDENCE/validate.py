"""Validate every shipped FAQPage against the schema.org spec AND against the
page it describes, from the live HTML captured in ./html.

Two independent checks per question, because a spec-shaped block that quotes
text the reader cannot see is exactly the false pass this item was warned about:

  1. spec shape -- FAQPage.mainEntity[] -> Question(name, acceptedAnswer ->
     Answer(text)), per https://schema.org/FAQPage and Google's FAQPage
     structured-data reference.
  2. parity with the page -- every `name` and every `acceptedAnswer.text` must
     appear verbatim in the article body's visible text, and the set of names
     must equal the rendered question headings in order.

Block boundaries count as whitespace when flattening the page: the emitter
joins an answer's paragraphs with one space, and `</p><p>` carries no character
of its own.
"""
import json, io, os, re, html as H

after = json.load(io.open('after.json', encoding='utf-8'))

def visible_text(body):
    a = body.find('<article'); z = body.find('</article>', a)
    seg = re.sub(r'<nav\b.*?</nav>', '', body[a:z], flags=re.S)
    seg = re.sub(r'</(p|h[1-6]|li|div|figcaption|blockquote)>', ' ', seg)
    return re.sub(r'\s+', ' ', H.unescape(re.sub(r'<[^>]*>', '', seg)))

def norm(s):
    return re.sub(r'\s+', ' ', s).strip()

report = []
for r in after['rows']:
    slug = r['url'].rsplit('/', 1)[-1]
    body = io.open('html/' + slug + '.html', encoding='utf-8').read()
    faq = r['faqPage']
    row = {'slug': slug, 'url': r['url'], 'faqPage': bool(faq), 'questions': 0, 'errors': []}
    if faq:
        page = visible_text(body)
        if faq.get('@context') != 'https://schema.org': row['errors'].append('@context')
        if faq.get('@type') != 'FAQPage': row['errors'].append('@type')
        me = faq.get('mainEntity')
        if not isinstance(me, list) or not me:
            row['errors'].append('mainEntity not a non-empty array')
        else:
            row['questions'] = len(me)
            for i, q in enumerate(me):
                if q.get('@type') != 'Question': row['errors'].append(f'q{i} @type')
                if not isinstance(q.get('name'), str) or not q['name'].strip():
                    row['errors'].append(f'q{i} name')
                elif norm(q['name']) not in page:
                    row['errors'].append(f'q{i} name NOT VISIBLE on page')
                aa = q.get('acceptedAnswer')
                if not isinstance(aa, dict) or aa.get('@type') != 'Answer':
                    row['errors'].append(f'q{i} acceptedAnswer @type')
                elif not isinstance(aa.get('text'), str) or not aa['text'].strip():
                    row['errors'].append(f'q{i} acceptedAnswer.text')
                elif norm(aa['text']) not in page:
                    row['errors'].append(f'q{i} answer NOT VISIBLE on page')
            if [q.get('name') for q in me] != r['renderedQuestions']:
                row['errors'].append('question set != rendered question headings')
    report.append(row)

ok = [r for r in report if r['faqPage'] and not r['errors']]
bad = [r for r in report if r['errors']]
none = [r for r in report if not r['faqPage']]
io.open('validation.json', 'w', encoding='utf-8').write(json.dumps(report, ensure_ascii=False, indent=1))
print('valid FAQPage, every question and answer visible on the page:', len(ok), '/', len(report))
print('FAQPage with errors:', len(bad), [(r['slug'], r['errors']) for r in bad])
print('no FAQPage (article carries no Soalan lazim block):', [r['slug'] for r in none])
print('questions asserted in total:', sum(r['questions'] for r in report))

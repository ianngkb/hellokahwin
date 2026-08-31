# SEO-13 — how to draft a `Soalan lazim` block

You are writing a real, reader-facing Q&A section that will be **appended to the
live article body** and shown on the page. It is not schema filler. It is
published editorial content that also happens to make the page eligible for
`FAQPage` structured data.

## The one rule that can kill this item

**EVERY ANSWER MUST BE SUPPORTED BY TEXT THAT IS ALREADY IN THE ARTICLE BODY
YOU WERE GIVEN.** Do not add a fact, a figure, a ruling, a price, a date, a
statute, a venue name or a capacity that is not already in that file. You are
surfacing what the article says as a question the reader actually types — you
are not researching a new article.

If you cannot write the minimum number of questions from the body alone, say so
and write fewer. **Fewer questions is a correct outcome. An invented one is a
structured-data violation and it fails the whole item.**

Do not write a question whose honest answer is "the article does not say".

## House pattern (taken from the 47 articles that already carry one)

```
## Soalan lazim
### Apakah maksud walimatul urus dalam bahasa Melayu?
<one paragraph>
### Wajibkah menghadiri majlis walimatul urus?
<one paragraph>
```

- **3 to 5 questions.** Never fewer than 3 unless the body genuinely cannot
  support 3 — the emitter's floor is 2, and below 2 nothing is emitted at all.
- **One paragraph per answer, roughly 35–75 words.** Answer in the first
  sentence, then qualify. No bullet lists, no sub-headings inside an answer.
- **Every question ends in `?`.** The emitter keys on that character; a question
  without it is silently dropped.
- Questions are phrased the way a Malaysian reader searches — `Berapa…`,
  `Bolehkah…`, `Apa beza…`, `Bila…`, `Perlukah…`, `Siapa…`, `Adakah…`.
- Do not repeat a question the article already answers under its own H2 in the
  same words. Pick the things a reader still has to hunt for in the body.
- Malay (Malaysia), warm and plain, correct adat and religious terminology.
  Never machine-translation Malay. No "Dalam dunia yang serba pantas ini".
- Where the body attributes a fact to a source (a jabatan, an enakmen, a
  vendor's published price), carry that attribution into the answer in short
  form — "mengikut JAINJ", "seksyen 7 Enakmen Selangor 2003".
- Prices, rates and years: quote them exactly as the body has them, including
  the year stamp. Never round, never update, never guess a newer figure.

## Output

Write ONE file per article, to the output directory you are given, named
`<slug>.json`, exactly this shape:

```json
{
  "slug": "rukun-nikah",
  "headingLevel": 2,
  "entries": [
    {
      "question": "Bolehkah nikah tanpa wali?",
      "answer": "Tidak. Wali ialah rukun ketiga …",
      "support": "the line(s) in the body file this answer is drawn from, quoted or closely paraphrased, with enough words that a reviewer can find it"
    }
  ]
}
```

- `headingLevel` is the level the `Soalan lazim` heading must take: **look at the
  body file you were given.** If its section headings are `##`, use `2`. If the
  whole article is written in `###` (the mas-kahwin cluster does this), use `3`.
  Questions sit exactly one level deeper. Getting this wrong means the emitter
  finds the block and emits zero questions.
- `support` is not published. It is how the reviewer checks you did not invent
  anything, and an entry without a usable `support` will be cut.

## What "not applicable" looks like

If, after reading the body, the article genuinely has no question-and-answer
surface — it is a narrative wedding feature, a photo essay, a vendor credit list
— write `<slug>.json` as:

```json
{ "slug": "...", "notApplicable": "one line saying why" }
```

That is a legitimate, expected answer. Say it rather than padding.

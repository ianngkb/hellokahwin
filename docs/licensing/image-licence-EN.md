# Image permission template (English)

**Owner:** managing-editor · **Date:** 24 Ogos 2026
**Malay version:** `lesen-imej-BM.md`, the primary. Most recipients are Malaysian
wedding vendors and photographers, and the Malay letter is the one to send unless
you know otherwise.

Two templates. **A** for images we have not published. **B** for images already on
the site with no written licence, the ten Real Wedding studios.

Replace every `{...}` before sending.

> **Nothing has been sent to anyone.** Contacting real people is the owner's
> decision. This document is waiting on it.

---

## A. The ordinary request

**Subject:** Permission to use {subject} photographs on HelloKahwin

---

Dear {Name},

I'm {my name}, from HelloKahwin. We publish Malay-language wedding guides at
hellokahwin.com: mas kahwin rates by state, how hantaran is arranged, how a
marriage is registered, that sort of thing.

I'd like to ask permission to use {number} photographs by {studio name}. They're
listed below.

**The photographs**

| File | What's in it |
|---|---|
| `{filename}` | {short description} |
| `{filename}` | {short description} |

**What we're asking for**

- To publish them on hellokahwin.com, in the article *{article title}*.
- To publish them on HelloKahwin's own social accounts, with the same credit.
- To resize and crop them so they fit the page layout and a phone screen. We
  don't edit what's in the picture.

**What we're not asking for**

- Ownership. The copyright stays with {studio name}.
- Exclusivity. You can use and license these images to anyone else.
- Any right to sell them, pass them to a third party, or sub-license them.
- Any right to use them in paid advertising. If that comes up, we'll ask again.
- Any right to hand them over for training an AI model.

**Credit**

Every photograph carries a credit underneath it, worded however you want it
worded. If you don't specify, we write `Kredit: {studio name}`. The name links to
your website or Instagram, and the link is one search engines follow.

**Withdrawing**

You can withdraw this at any time. Send one email to {email address} and the
photographs come down within five working days. You don't have to give a reason.

**If you're happy with this**

Reply with one line: *"I agree to the scope above."* That's enough. If there's
anything you'd like changed or taken out, tell us. A narrow permission we can
rely on is worth more to us than a broad one.

Thank you for your time.

{my name}
HelloKahwin · hellokahwin.com
{email} · {phone}

---

## B. Photographs already published

For the ten Real Wedding studios. Their work is already on the site and there is
no written licence for any of it.

**Don't merge this with template A.** The two situations are different, and
dressing up an overdue request as a fresh one is a small lie that comes apart on
the second email.

**Subject:** {studio name} photographs on HelloKahwin: we need to put this right

---

Dear {Name},

I'm writing about something that should have been dealt with earlier.

HelloKahwin took over a website and its image library. That library contains
{number} photographs by {studio name}, from {couple}'s wedding at {venue}. They
were credited to {studio name} on the old site, and that credit is still there.

When we went through the records, we found no letter, email or agreement showing
that {studio name} ever gave written permission. A credit is not a licence. So
where those photographs stand isn't clear, and we'd rather not pretend otherwise.

We want to sort it out now rather than wait for someone to ask.

**Three options, and all three are fine by us:**

1. **Take them down.** Say the word and all {number} come off the site within
   five working days. No questions, no negotiation.
2. **Leave them up, with written permission.** The scope is below, the same
   thing we offer any photographer today.
3. **Leave some up.** Pick the ones you're happy with. The rest come down.

**The scope, if you pick 2 or 3**

- To publish the photographs you name on hellokahwin.com and on HelloKahwin's own
  social accounts.
- To resize and crop them for the page layout and for phone screens. What's in
  the picture isn't edited.
- A credit under each photograph, worded as you specify, linking to your website
  or Instagram, with a link search engines follow.
- Copyright stays with {studio name}. Non-exclusive. Not sold, not passed to
  third parties, not sub-licensed, not used in paid advertising without asking
  again, and never handed over for training an AI model.
- Withdrawable at any time by one email. Five working days for us to take them
  down.

**About the couple in the photographs**

If you know that {couple} agreed to their wedding photographs being published,
tell us. If not, we'll ask them separately. Your permission alone isn't enough
for photographs of identifiable people, and we don't want to put you in the
position of answering for them.

This request is late, and that's our mistake rather than yours. The first option
above is a real option, not one we're hoping you won't take.

{my name}
HelloKahwin · hellokahwin.com
{email} · {phone}

---

## Once a reply arrives

One row in `docs/asset-register/asset-register.csv` per photograph:
`license_class` `V`, `licensor_name` the licensor's legal name, `skop_lesen` as
agreed, and `bukti_lesen` pointing at the reply.

**Keep the reply.** It's the only evidence there is, and the 682-image library
exists because nobody kept one.

A refusal gets recorded too: `status_guna` becomes `ditarik-balik`, and
`log_takedown` carries the date and what was said.

# Pre-fix production fixtures — 31 August 2026

Captured by the CEO at the start of Sprint 04, **before any UI item shipped**.

## Why these exist

**UI-06's definition of done requires proving the regression gate FAILS against a
known-bad input.** The known-bad input is production as it stands on 31 Aug 2026:

- the homepage `.s-row` cards rendering their headline in a **44px** column
- the nav measuring **1970px** inside a 1920px viewport

Once UI-01 and UI-02 ship, that state is gone. An agent asked to prove a gate
against a defect that no longer exists has three bad options — fabricate the
result, temporarily revert production, or narrow its own DoD. **The third is
explicitly forbidden and the second is dangerous**, so the hazard is removed here
instead: the broken state is preserved as a file.

## Contents

| File | Captured from |
|---|---|
| `homepage.html` | `https://hellokahwin.com/` — 12 broken `.s-row` cards |
| `article.html` | `https://hellokahwin.com/artikel/idea-dan-nasihat/garden-wedding` — the CORRECT 3-child variant, first cell `01` |
| `category.html` | `https://hellokahwin.com/artikel/hantaran-mas-kahwin` — zero images |

`article.html` is the **negative control**: the same component rendering
correctly. A gate that flags the homepage must NOT flag this file, or it is
matching on the wrong thing.

## Note on rendering

These are server HTML. The 44px column is a **computed layout value** and only
appears once CSS is applied at >=1024px — so a gate must load these in a real
browser at a real width, not grep them. That is the point of the defect: it is
invisible to every structural check we own.

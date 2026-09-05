# Reference Teardown Ritual

Taste-by-example. When the user names 2–3 sites they admire (or asks for a
style direction), tear each one down into this folder as
`references/<site-slug>.md` using the template below, then cite the teardowns
— not generic skill data — as the basis for design choices.

## Rules

- Teardowns are **observations, not clones**. Steal structure, rhythm, and
  motion ideas; never copy branding, copy, or imagery.
- Every teardown must end with "What we adopt / What we reject" mapped to
  this project's MASTER.md tokens. Anything unmappable is rejected.
- Re-teardown when the user says "this feels off" — that sentence means the
  reference set is wrong, not the implementation.

## Teardown Template

```markdown
# Teardown: <Site name> (<url>)

**Admired for:** <one line — what caught the user's eye>

## Observations
- Layout: <hero structure, section rhythm, grid behavior>
- Type: <scale, pairing, personality>
- Color: <palette roles mapped to OUR tokens where possible>
- Motion: <transitions, scroll effects, timing values>
- Details: <micro-interactions, spacing habits, distinctive touches>

## What we adopt
- <pattern> → maps to <our token/component>

## What we reject (and why)
- <pattern> → conflicts with <MASTER rule / brand voice>
```

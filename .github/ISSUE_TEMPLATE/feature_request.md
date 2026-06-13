---
name: Feature request
about: Suggest a new domain, GSPL feature, or improvement while upholding the invariants
title: ''
labels: enhancement
assignees: ''
---

**Is your feature request related to a problem? Please describe.**
A clear description of what the problem is. E.g., "I want to generate signed, deterministic simulation artifacts for ..."

**Describe the solution you'd like**
A clear description of what you want to happen. Include how it preserves determinism, 9-strata quality, and sovereignty.

**Describe alternatives you've considered**
Other approaches, including existing workarounds.

**Additional context**
Any other context, example seeds/intents, or links to related discussions/roadmap items.

**Impact on invariants**
- Determinism: How will same-seed reproducibility be maintained?
- Quality: Will a new QualityContract be needed?
- Sovereignty: How does this support federation / signatures / local-first?

**Suggested acceptance criteria**
- [ ] New generator + -contract.ts
- [ ] Added to golden corpus + harness
- [ ] Documentation + examples updated
- [ ] Nightly CI passes reproducibility for new domain

We prioritize contributions that strengthen the core spine (determinism, sovereignty, quality).

---
name: Evidence precision decisions
description: Rationale for exact margin transport and the distinction between parser limits and business limits
---

Do not replace exact margin comparisons with floating-point tolerances.

**Why:** Repeated review simulations showed that conversion before validation could round an above-threshold database decimal into a verified near miss. Later fixed-point-to-Number conversion also collapsed unequal large client/server margins. Both equality and threshold decisions need exact values.

**How to apply:** Preserve source decimal strings through transport and exact integers through comparisons; treat numeric compatibility as interpretation of an already-received number, not recovery of the original decimal.

Parser magnitude, exponent, and length caps were chosen as conservative computational resource limits, not as user-approved business limits.

**Why:** The hardening request specified bounded parsing but did not specify the financial domain's maximum event margin.

**How to apply:** Keep domain-specific business limits separate when connecting actual records or settlement rules. Passing isolated engine tests does not establish payment authorization or live database integration.
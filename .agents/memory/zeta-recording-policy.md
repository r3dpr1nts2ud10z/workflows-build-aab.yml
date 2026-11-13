---
name: ZETA recording policy
description: User-selected reliability tradeoff for simulation telemetry and latency measurements
---

Preserve successful CSV persistence as a prerequisite for simulated order registration. Do not replace it with deferred, drop-on-full telemetry merely to exclude storage time from latency measurements.

**Why:** On 2026-10-01, after being told that deferred logging could register simulated orders without recorded snapshots and make latency results incomparable, the user explicitly chose persistence first.

**How to apply:** When adapting new engine snippets or optimizing profiling, preserve this ordering and label the existing intervals as including CSV-write time. A change to lossy or post-registration recording requires a new explicit user decision.
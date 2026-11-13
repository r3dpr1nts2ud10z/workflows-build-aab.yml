---
name: Video artifact tsconfig gap
description: video-js scaffolds fail typecheck without DOM lib entries
---

Rule: after `createArtifact` for a video-js artifact, add `"lib": ["es2022", "dom", "dom.iterable"]` to the artifact's `tsconfig.json` compilerOptions before running typecheck.

**Why:** The scaffold's tsconfig inherits a base without DOM libs, so `window`/`document` references in the scaffold's own `src/lib/video/hooks.ts` and `main.tsx` fail `tsc --noEmit` (TS2304/TS2584). Hit on heartbreak-short and again on fox-settlement.

**How to apply:** Any new video-js artifact, fix immediately after creation or at first typecheck failure.

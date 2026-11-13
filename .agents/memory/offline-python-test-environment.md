---
name: Offline Python test environment
description: Isolation and library-selection constraints for offline execution tests in this workspace.
---

For offline order-tracker tests that spawn subprocesses, enforce network denial across fork and exec, not only by patching the parent Python socket module. Keep credentials out of the test environment and use temporary journals.

**Why:** A subprocess starts a fresh interpreter and does not inherit Python monkeypatches; exchange-related tests must not unexpectedly reach the network.

**How to apply:** Install and verify an inherited kernel network filter before launching pytest; fail closed if isolation cannot be established.

Do not assume the first matching shared library in the Nix store matches the active Python architecture.

**Why:** The workspace's store contains mixed-architecture libseccomp builds; a valid-looking library path produced ELFCLASS32 under 64-bit Python.

**How to apply:** Verify a compatible library can be loaded before starting the guarded test process. This is an environment selection issue, not a reason to run unguarded or modify the application.
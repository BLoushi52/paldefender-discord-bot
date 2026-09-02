# Changelog

This project follows [Semantic Versioning](https://semver.org/).

## [Unreleased]

## [1.0.0] - 2026-09-02

- Added all 27 documented PalDefender REST API endpoint mappings.
- Added a required single-guild boundary plus Discord administrator, validated user-ID, and role-ID authorization.
- Added guild-only command deployment with automatic stale global-command cleanup.
- Added ephemeral, mention-safe responses and bounded JSON attachments for large results.
- Added configurable branding, activity, copyright footer, and support URL.
- Added reliable Windows Task Scheduler process management, controlled credential rotation, secured backups, and rollback on setup failure.
- Added Windows Task Scheduler and hardened Linux systemd deployment support.
- Added validation against remote API exposure, insecure remote HTTP, invalid IDs, oversized responses, and token reuse.
- Added bodyless POST contract coverage and tests for authorization, deployment scope, interaction handling, doctor checks, and response safety.
- Added CI coverage thresholds, timeouts, concurrency controls, and immutable action pins.

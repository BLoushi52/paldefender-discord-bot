# Contributing

Thanks for helping improve the project.

## Development setup

1. Fork and clone the repository.
2. Install Node.js 22 or newer (Node.js 24 LTS is recommended).
3. Run `npm ci`.
4. Run `npm run validate` before submitting changes.

Never use production Discord or PalDefender tokens in tests. Tests must use fakes and must not call a live game server.

## Pull requests

- Keep each pull request focused on one change.
- Add or update tests for changed behavior.
- Update documentation and `.env.example` for configuration changes.
- Preserve ephemeral replies and authorization checks for administrative commands.
- Preserve the single-installation boundary: one required Discord guild and one PalDefender server per process.
- Do not weaken the loopback-only API default or log command payloads containing player data.
- Keep global command cleanup in the deployment path; this project does not support a shared multi-guild bot.
- Explain any PalDefender endpoint or permission changes and link to the upstream documentation.

## Adding an endpoint

1. Add the slash-command definition and handler in `src/commands.js`.
2. Map the exact HTTP method, path casing, query names, and JSON body.
3. Add its PalDefender permission to `examples/DiscordBot.example.json` and the Windows installer when required.
4. Add an endpoint-contract test in `test/commands.test.js`.
5. Update `docs/COMMANDS.md`.

By contributing, you agree that your contribution is licensed under the MIT License.

# PalDefender Discord Bot

An open-source, self-hosted Discord slash-command bridge for the [PalDefender REST API](https://github.com/Ultimeit/PalDefender/tree/main/docs/en/RESTAPI). Run one copy on the same host as one Palworld dedicated server and control it from one Discord server without exposing PalDefender's REST port publicly.

This is not a centrally hosted public bot. Every server owner creates a separate Discord application, installs it into their own Discord server, and runs their own isolated bot process and PalDefender token.

## Highlights

- Covers all 27 live endpoints verified against PalDefender v1.8.3.
- Provides `/server`, `/player`, `/moderation`, `/give`, `/technology`, and `/guild` command groups.
- Keeps every response ephemeral; large results are private JSON attachments.
- Requires the configured Discord server plus Administrator permission or an explicit user/role allowlist.
- Uses an independent PalDefender bearer token and refuses token reuse.
- Registers guild-only commands, clears stale global commands, and rejects every other Discord server.
- Defaults to `http://127.0.0.1:17993`; remote API access requires explicit opt-ins and HTTPS by default.
- Limits API responses and Discord attachments to protect memory and upload reliability.
- Supports Windows Task Scheduler and Linux systemd.
- Provides configurable brand, activity, copyright footer, and support link.

## Security first

Never post or commit a Discord bot token, PalDefender bearer token, `.env` file, player IP address, or unredacted administrative response.

Use two different secrets:

```text
Discord bot token  !=  PalDefender REST token
```

Keep PalDefender bound to loopback when the bot and game server share a host. No inbound firewall rule is needed for port `17993`; the bot only needs outbound access to Discord over port `443`.

Use a Discord application dedicated to this installation. `npm run deploy-commands` deliberately removes global commands from that application before installing commands in the configured guild.

If a secret has ever appeared in chat, a screenshot, a commit, or a public log, rotate it rather than deleting only the visible copy. See [SECURITY.md](SECURITY.md).

## Requirements

- Palworld dedicated server with PalDefender installed
- PalDefender REST API enabled
- Node.js 22 or newer; Node.js 24 LTS is recommended
- A dedicated Discord application installed to exactly one Discord server
- Windows Server or a systemd-based Linux distribution

## Quick start

### Windows Server

1. Download the latest release ZIP and extract it, for example to `C:\PalDefenderBot`. If no release is listed yet, use **Code → Download ZIP** on GitHub.
2. Install Node.js 24 LTS.
3. Create and install a Discord application as described in [the Windows guide](docs/WINDOWS.md).
4. Open **Windows PowerShell as Administrator** in the project folder.
5. Run:

```powershell
Set-ExecutionPolicy -Scope Process Bypass
.\deploy\configure-windows.ps1
```

The script asks for IDs and branding, generates a unique PalDefender token, hides the Discord token while entered, securely backs up files it replaces, validates the project, removes stale global commands, registers guild commands, and installs a startup task. Re-running it stops the old bot first and restores the previous credentials and task state if configuration fails. Restart Palworld afterward, then use `/server status` in Discord.

Full instructions and start/stop commands: [Windows deployment](docs/WINDOWS.md).

### Linux

```sh
cp .env.example .env
npm ci --omit=dev
npm run validate
npm run deploy-commands
npm run doctor
npm start
```

After the foreground test, install the provided systemd unit. See [Linux deployment](docs/LINUX.md).

## Discord commands

| Group | Subcommands |
|---|---|
| `/server` | `status`, `broadcast`, `alert`, `reload` |
| `/player` | `list`, `info`, `items`, `pals`, `techs`, `progression`, `message` |
| `/moderation` | `kick`, `ban`, `ban-ip`, `unban`, `unban-ip`, `ban-list` |
| `/give` | `item`, `pal`, `pal-template`, `pal-egg`, `progression` |
| `/technology` | `learn`, `forget` |
| `/guild` | `list`, `info`, `delete-base` |

`/guild delete-base` is destructive and requires `confirm: DELETE`. See [command reference](docs/COMMANDS.md) for input formats and endpoint mappings.

## Configuration

Copy `.env.example` to `.env` and supply your own credentials and Discord IDs. The most important settings are:

```dotenv
DISCORD_TOKEN=replace_with_your_bot_token
DISCORD_CLIENT_ID=replace_with_your_application_id
DISCORD_GUILD_ID=replace_with_your_discord_server_id

BOT_BRAND_NAME=Palworld Admin
BOT_ACTIVITY_TEXT=Managing Palworld
BOT_COPYRIGHT_TEXT=
BOT_SUPPORT_URL=

PALDEFENDER_BASE_URL=http://127.0.0.1:17993
PALDEFENDER_TOKEN=replace_with_a_different_paldefender_token
PALDEFENDER_MAX_RESPONSE_BYTES=7340032
```

See [configuration reference](docs/CONFIGURATION.md) for every variable and authorization behavior. The actual Discord username and avatar are managed in the Discord Developer Portal.

## Useful commands

```sh
npm run deploy-commands  # clear global commands and register/update this guild
npm run doctor           # validate config and call PalDefender /version
npm run validate         # syntax checks plus tests
npm start                # run in the foreground
```

## Project documentation

- [Windows deployment and Task Scheduler controls](docs/WINDOWS.md)
- [Linux deployment and systemd controls](docs/LINUX.md)
- [Configuration and authorization](docs/CONFIGURATION.md)
- [Commands and endpoint mapping](docs/COMMANDS.md)
- [Architecture and security boundaries](docs/ARCHITECTURE.md)
- [Publishing the repository and creating releases](docs/PUBLISHING.md)
- [Contributing](CONTRIBUTING.md)
- [Security policy](SECURITY.md)
- [Support](SUPPORT.md)
- [Changelog](CHANGELOG.md)

## Development

```sh
npm ci
npm run validate
```

Tests use mocked HTTP requests and do not require Discord or a live Palworld server. CI validates security boundaries and coverage on Node.js 22 and 24 and parses the Windows PowerShell scripts.

## Disclaimer

This is an unofficial community project and is not affiliated with, endorsed by, or supported by Pocketpair, PalDefender, Discord, or ZAP-Hosting. Product names and trademarks belong to their respective owners. Use destructive administrative commands only after verifying the target and maintaining server backups.

## License

[MIT](LICENSE)

# PalDefender Discord Bot

An open-source Discord slash-command bridge for the [PalDefender REST API](https://github.com/Ultimeit/PalDefender/tree/main/docs/en/RESTAPI). Run it on the same host as a Palworld dedicated server to administer the game from Discord without exposing PalDefender's REST port publicly.

## Highlights

- Covers all 27 live endpoints documented at the time of the v1.0.0 release.
- Provides `/server`, `/player`, `/moderation`, `/give`, `/technology`, and `/guild` command groups.
- Keeps every response ephemeral; large results are private JSON attachments.
- Requires Discord Administrator permission or an explicit user/role allowlist.
- Uses an independent PalDefender bearer token and refuses token reuse.
- Defaults to `http://127.0.0.1:17993` and rejects remote API URLs unless explicitly enabled.
- Supports Windows Task Scheduler and Linux systemd.
- Provides configurable brand, activity, copyright footer, and support link.

## Security first

Never post or commit a Discord bot token, PalDefender bearer token, `.env` file, player IP address, or unredacted administrative response.

Use two different secrets:

```text
Discord bot token  !=  PalDefender REST token
```

Keep PalDefender bound to loopback when the bot and game server share a host. No inbound firewall rule is needed for port `17993`; the bot only needs outbound access to Discord over port `443`.

If a secret has ever appeared in chat, a screenshot, a commit, or a public log, rotate it rather than deleting only the visible copy. See [SECURITY.md](SECURITY.md).

## Requirements

- Palworld dedicated server with PalDefender installed
- PalDefender REST API enabled
- Node.js 22 or newer; Node.js 24 LTS is recommended
- A Discord application installed to a Discord server
- Windows Server or a systemd-based Linux distribution

## Quick start

### Windows Server

1. Download a release ZIP and extract it, for example to `C:\PalDefenderBot`.
2. Install Node.js 24 LTS.
3. Create and install a Discord application as described in [the Windows guide](docs/WINDOWS.md).
4. Open **Windows PowerShell as Administrator** in the project folder.
5. Run:

```powershell
Set-ExecutionPolicy -Scope Process Bypass
.\deploy\configure-windows.ps1
```

The script asks for IDs and branding, generates a unique PalDefender token, hides the Discord token while entered, backs up files it replaces, validates the project, registers slash commands, and installs a startup task. Restart Palworld afterward, then use `/server status` in Discord.

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
```

See [configuration reference](docs/CONFIGURATION.md) for every variable and authorization behavior. The actual Discord username and avatar are managed in the Discord Developer Portal.

## Useful commands

```sh
npm run deploy-commands  # register/update Discord slash commands
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

Tests use mocked HTTP requests and do not require Discord or a live Palworld server. CI validates Node.js 22 and 24 and parses the Windows PowerShell installer.

## Disclaimer

This is an unofficial community project and is not affiliated with, endorsed by, or supported by Pocketpair, PalDefender, Discord, or ZAP-Hosting. Product names and trademarks belong to their respective owners. Use destructive administrative commands only after verifying the target and maintaining server backups.

## License

[MIT](LICENSE)

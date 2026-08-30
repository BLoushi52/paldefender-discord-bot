# Configuration

The bot reads configuration from `.env` in the project directory. Copy `.env.example` to `.env`; never commit `.env`.

## Variables

| Variable | Required | Default | Description |
|---|---:|---|---|
| `DISCORD_TOKEN` | Yes | — | Discord bot token from the Developer Portal. |
| `DISCORD_CLIENT_ID` | Yes | — | 17–20 digit Discord Application ID. |
| `DISCORD_GUILD_ID` | No | Global | Discord server ID. Recommended because guild command changes appear immediately. |
| `DISCORD_ALLOWED_USER_IDS` | No | Empty | Comma-separated Discord user IDs allowed to run commands. |
| `DISCORD_ALLOWED_ROLE_IDS` | No | Empty | Comma-separated Discord role IDs allowed to run commands. |
| `PALDEFENDER_BASE_URL` | No | `http://127.0.0.1:17993` | PalDefender REST origin; no path, credentials, query, or fragment. |
| `PALDEFENDER_TOKEN` | Yes | — | Dedicated PalDefender bearer token. Must differ from `DISCORD_TOKEN`. |
| `PALDEFENDER_TIMEOUT_MS` | No | `7000` | Client timeout from 1000 to 30000 milliseconds. |
| `PALDEFENDER_ALLOW_REMOTE` | No | `false` | Allows a non-loopback API hostname. Prefer HTTPS and a trusted private network. |
| `BOT_BRAND_NAME` | No | `Palworld Admin` | Header shown in replies and startup logs; maximum 80 characters. |
| `BOT_ACTIVITY_TEXT` | No | `Managing Palworld` | Discord `Watching` activity; maximum 128 characters. |
| `BOT_COPYRIGHT_TEXT` | No | Empty | Optional small response footer; maximum 200 characters. |
| `BOT_SUPPORT_URL` | No | Empty | Optional credential-free HTTP(S) footer link. |

Values may be wrapped in double quotes. Do not put comments at the end of secret lines.

## Discord authorization

A command is allowed when the interaction is in a Discord server and at least one condition is true:

- The member has Discord's `Administrator` permission.
- Their user ID appears in `DISCORD_ALLOWED_USER_IDS`.
- One of their roles appears in `DISCORD_ALLOWED_ROLE_IDS`.

Commands are registered with Administrator-only default permissions as an additional layer. To let an allowlisted non-administrator role see them, a server administrator must also grant that role access under **Server Settings → Integrations → the bot → Commands**.

All command replies are ephemeral. Audit logs record timestamp, Discord user ID, guild ID, command name, outcome, and timing—but not command options, REST payloads, tokens, or API responses.

## Command scope

When `DISCORD_GUILD_ID` is set, `npm run deploy-commands` updates only that server and changes normally appear immediately. When blank, commands are global and propagation can take longer.

Changing `.env` values requires restarting the bot. Changing command definitions requires running `npm run deploy-commands` again.

## Branding example

```dotenv
BOT_BRAND_NAME="Example Community Admin"
BOT_ACTIVITY_TEXT="Example Palworld"
BOT_COPYRIGHT_TEXT="© 2026 Example Community"
BOT_SUPPORT_URL="https://discord.gg/example"
```

The bot's actual username, avatar, and application description are configured in the Discord Developer Portal, not `.env`.

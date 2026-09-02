# Configuration

The bot reads configuration from `.env` in the project directory. Copy `.env.example` to `.env`; never commit `.env`.

## Variables

| Variable | Required | Default | Description |
|---|---:|---|---|
| `DISCORD_TOKEN` | Yes | — | Discord bot token from the Developer Portal. |
| `DISCORD_CLIENT_ID` | Yes | — | 17–20 digit Discord Application ID. |
| `DISCORD_GUILD_ID` | Yes | — | The only Discord server this installation accepts commands from. |
| `DISCORD_ALLOWED_USER_IDS` | No | Empty | Comma-separated Discord user IDs allowed to run commands. |
| `DISCORD_ALLOWED_ROLE_IDS` | No | Empty | Comma-separated Discord role IDs allowed to run commands. |
| `PALDEFENDER_BASE_URL` | No | `http://127.0.0.1:17993` | PalDefender REST origin; no path, credentials, query, or fragment. |
| `PALDEFENDER_TOKEN` | Yes | — | Dedicated PalDefender bearer token. Must differ from `DISCORD_TOKEN`. |
| `PALDEFENDER_TIMEOUT_MS` | No | `7000` | Client timeout from 1000 to 30000 milliseconds. |
| `PALDEFENDER_MAX_RESPONSE_BYTES` | No | `7340032` | Maximum API response size from 1024 bytes through 7 MiB. |
| `PALDEFENDER_ALLOW_REMOTE` | No | `false` | Allows a non-loopback API hostname. Remote URLs require HTTPS by default. |
| `PALDEFENDER_ALLOW_INSECURE_REMOTE` | No | `false` | Dangerous second opt-in for plain HTTP on a remote host. |
| `BOT_BRAND_NAME` | No | `Palworld Admin` | Header shown in replies and startup logs; maximum 80 characters. |
| `BOT_ACTIVITY_TEXT` | No | `Managing Palworld` | Discord `Watching` activity; maximum 128 characters. |
| `BOT_COPYRIGHT_TEXT` | No | Empty | Optional small response footer; maximum 200 characters. |
| `BOT_SUPPORT_URL` | No | Empty | Optional credential-free HTTP(S) footer link. |

Values may be wrapped in double quotes. Do not put comments at the end of secret lines.

## Discord authorization

A command is allowed only when the interaction comes from `DISCORD_GUILD_ID` and at least one additional condition is true:

- The member has Discord's `Administrator` permission.
- Their user ID appears in `DISCORD_ALLOWED_USER_IDS`.
- One of their roles appears in `DISCORD_ALLOWED_ROLE_IDS`.

Commands are registered with Administrator-only default permissions as an additional layer. To let an allowlisted non-administrator role see them, a server administrator must also grant that role access under **Server Settings → Integrations → the bot → Commands**.

Administrators and allowlisted users from every other Discord server are rejected. All command replies are ephemeral and disable Discord mentions. Audit logs record timestamp, Discord user ID, guild ID, command name, outcome, and timing—but not command options, REST payloads, tokens, API error messages, or API responses.

## Command scope

Every installation is intentionally single-guild. `npm run deploy-commands` first removes global commands from the dedicated Discord application, then updates only `DISCORD_GUILD_ID`; guild command changes normally appear immediately. Discord may briefly cache a removed global command, but the runtime guild check still rejects it outside the configured server. Do not reuse the application for unrelated global commands.

Changing `.env` values requires restarting the bot. Changing command definitions requires running `npm run deploy-commands` again.

## Remote API exception

The intended same-host setup uses `http://127.0.0.1:17993` and requires no PalDefender firewall opening. If the bot and PalDefender are intentionally on different trusted hosts, set an `https://` origin and `PALDEFENDER_ALLOW_REMOTE=true`. Plain remote HTTP also requires `PALDEFENDER_ALLOW_INSECURE_REMOTE=true` because it sends the bearer token without transport encryption; avoid that configuration whenever possible.

`PALDEFENDER_BASE_URL` must contain only the origin, such as `https://palworld.internal:17993`, with no path, credentials, query, or fragment.

## Branding example

```dotenv
BOT_BRAND_NAME="Example Community Admin"
BOT_ACTIVITY_TEXT="Example Palworld"
BOT_COPYRIGHT_TEXT="© 2026 Example Community"
BOT_SUPPORT_URL="https://discord.gg/example"
```

The bot's actual username, avatar, and application description are configured in the Discord Developer Portal, not `.env`.

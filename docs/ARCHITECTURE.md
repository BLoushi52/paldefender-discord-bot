# Architecture

The project is single-tenant by design. Every operator runs an isolated copy for exactly one Discord guild and one PalDefender server; there is no shared bot account, control plane, database, or hosted service.

```text
Authorized user in the configured Discord guild
    │ slash command over Discord
    ▼
Discord Gateway (outbound TLS/WebSocket, port 443)
    │
    ▼
Node.js bot on the game host
    ├─ Discord authorization check
    ├─ input validation
    ├─ ephemeral response formatting
    └─ bearer-authenticated HTTP request
         │ loopback by default
         ▼
PalDefender REST API at 127.0.0.1:17993
         │
         ▼
Palworld server
```

## Trust boundaries

- Discord authenticates the bot with `DISCORD_TOKEN`.
- The bot independently authenticates to PalDefender with `PALDEFENDER_TOKEN`.
- `DISCORD_GUILD_ID` is a mandatory boundary; other guilds are rejected even when their member is an administrator.
- Discord Administrator permission and optional validated user/role allowlists protect invocation inside that guild.
- PalDefender token permissions restrict the API operations that can succeed.
- Loopback binding prevents direct internet access to PalDefender.
- API response and Discord attachment limits bound memory and upload size.

## Request lifecycle

1. Discord sends a slash-command interaction through the Gateway connection.
2. The bot rejects DMs, other Discord guilds, and unauthorized members.
3. It acknowledges the interaction ephemerally before Discord's deadline.
4. The command handler validates inputs and constructs an exact REST request.
5. The API client adds the bearer token, enforces a timeout, and parses the response.
6. Small responses are displayed as JSON; bounded large responses are attached as private JSON files.
7. The bot records a metadata-only audit event without options or response bodies.

No inbound HTTP listener, public interaction URL, database, reverse proxy, or central bot service is required.

# Architecture

```text
Discord user
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
- Discord permissions and allowlists protect command invocation.
- PalDefender token permissions restrict the API operations that can succeed.
- Loopback binding prevents direct internet access to PalDefender.

## Request lifecycle

1. Discord sends a slash-command interaction through the Gateway connection.
2. The bot rejects DMs and unauthorized members.
3. It acknowledges the interaction ephemerally before Discord's deadline.
4. The command handler validates inputs and constructs an exact REST request.
5. The API client adds the bearer token, enforces a timeout, and parses the response.
6. Small responses are displayed as JSON; large responses are attached as JSON files.
7. The bot records a metadata-only audit event without options or response bodies.

No inbound HTTP listener, public interaction URL, database, or reverse proxy is required.

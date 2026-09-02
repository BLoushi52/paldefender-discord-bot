# Security policy

## Supported versions

Before the first tagged release, security fixes are applied to `main`. After releases begin, only the newest tagged release and current `main` are supported.

## Reporting a vulnerability

Do not open a public issue for vulnerabilities, leaked tokens, private player data, or working exploits.

Use the repository's **Security → Report a vulnerability** form (GitHub Private Vulnerability Reporting). Repository owners should enable this under **Settings → Security → Code security and analysis** before making the repository public.

Include the affected version, impact, reproduction steps, and any suggested mitigation. Remove Discord tokens, PalDefender bearer tokens, player IP addresses, and other personal data from screenshots and logs.

## If a token is exposed

1. Reset the Discord bot token in the Discord Developer Portal.
2. Replace the affected PalDefender token file with a newly generated, different token.
3. Update `.env` on the host.
4. Restart Palworld/PalDefender and the bot.
5. Remove the secret from Git history if it was committed. Rotating it is still mandatory.

The bot refuses to start when `DISCORD_TOKEN` and `PALDEFENDER_TOKEN` are identical.

## Deployment boundary

This project is self-hosted and single-guild. Each operator must use a dedicated Discord application, a required `DISCORD_GUILD_ID`, and an independent PalDefender token. Do not offer one installation as a shared public multi-server bot. Keep PalDefender on loopback; remote HTTP requires a deliberately separate insecure opt-in because bearer tokens would otherwise cross the network without encryption.

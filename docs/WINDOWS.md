# Windows Server deployment

These steps apply to Windows Server 2022/2025 and a VPS where the user has Administrator access.

## 1. Install prerequisites

Install the Windows x64 MSI for Node.js 24 LTS from [nodejs.org](https://nodejs.org/en/download). Reopen PowerShell and verify:

```powershell
node --version
npm --version
```

## 2. Create a Discord application

1. Create an application in the [Discord Developer Portal](https://discord.com/developers/applications).
2. Copy the **Application ID** from **General Information**.
3. Open **Bot**, generate a token, and store it privately. Privileged intents are not required.
4. Under **Installation**, enable **Guild Install** and add the `applications.commands` and `bot` scopes.
5. Install the application in the target Discord server.
6. Enable Discord Developer Mode and copy the server ID.

The bot does not need an Interaction Endpoint URL because it receives commands over Discord's Gateway connection.

## 3. Extract and configure

Extract the release to a stable path such as:

```text
C:\PalDefenderBot
```

Open **Windows PowerShell as Administrator**:

```powershell
Set-Location "C:\PalDefenderBot"
Set-ExecutionPolicy -Scope Process Bypass
.\deploy\configure-windows.ps1
```

The installer will:

- Ask for the Discord Application ID and server ID.
- Ask for optional branding and support information.
- Find or ask for the `PalDefender\RESTAPI` directory.
- Back up and enable `RESTConfig.json` when needed.
- Generate a unique 96-character PalDefender token.
- Back up only its own previous `Tokens\DiscordBot.json`, if present.
- Prompt invisibly for the Discord token.
- Back up an existing `.env`, write a new one, and restrict it to Administrators and SYSTEM.
- Install dependencies, run validation, and register slash commands.
- Create and start a Scheduled Task named `PalDefender Discord Bot`.

The installer never places your Discord token into PalDefender and never prints either secret.

Restart the Palworld server after the installer completes so PalDefender loads its new token. Then run `/server status` in Discord.

## Scheduled Task controls

A Scheduled Task is Windows' background-process manager. It starts the bot at VPS startup, runs it without an open console, and restarts it after failures.

Open PowerShell as Administrator in the project directory and use:

```powershell
.\deploy\manage-windows-task.ps1 -Action Status
.\deploy\manage-windows-task.ps1 -Action Stop
.\deploy\manage-windows-task.ps1 -Action Start
.\deploy\manage-windows-task.ps1 -Action Restart
.\deploy\manage-windows-task.ps1 -Action Disable
.\deploy\manage-windows-task.ps1 -Action Enable
```

`Stop` leaves automatic startup enabled for the next reboot. `Disable` stops the bot and prevents automatic startup. `Remove` permanently removes only the Scheduled Task:

```powershell
.\deploy\manage-windows-task.ps1 -Action Remove
```

You can also press `Windows + R`, run `taskschd.msc`, open **Task Scheduler Library**, and manage **PalDefender Discord Bot** visually.

## Logs

The launcher writes metadata-only logs to:

```text
C:\PalDefenderBot\logs\bot.log
```

View the last lines:

```powershell
Get-Content "C:\PalDefenderBot\logs\bot.log" -Tail 50
```

At startup, a log larger than 10 MiB is rotated to `bot.previous.log`.

## Manual setup

If the interactive installer is unsuitable:

```powershell
Copy-Item .env.example .env
notepad .env
npm ci --omit=dev
npm run validate
npm run deploy-commands
npm run doctor
npm start
```

Create `PalDefender\RESTAPI\Tokens\DiscordBot.json` from `examples\DiscordBot.example.json`, replacing its placeholder with a strong random token that differs from the Discord token. Restart Palworld after creating it.

## Updating

1. Stop the bot.
2. Back up `.env`.
3. Replace the project files with the new release (do not replace `.env`).
4. Run `npm ci --omit=dev` and `npm run validate`.
5. Run `npm run deploy-commands` if command definitions changed.
6. Start the bot and run `/server status`.

## Troubleshooting

```powershell
Test-NetConnection 127.0.0.1 -Port 17993
Test-NetConnection discord.com -Port 443
npm run doctor
.\deploy\manage-windows-task.ps1 -Action Status
```

- `INVALID_TOKEN`: PalDefender did not load the token in `.env`; verify `DiscordBot.json` and restart Palworld.
- `MISSING_PERMISSION`: add the named permission to the PalDefender token file, then restart/reload PalDefender.
- `CONNECTION_FAILED`: verify the game server and REST API are running on the same host/network namespace.
- No slash commands: verify the bot was installed with `applications.commands`, then run `npm run deploy-commands`.

Never post `.env` or unredacted logs in a public issue.

# Linux deployment

## 1. Create the PalDefender token

Enable the REST API in `Win64/PalDefender/RESTAPI/RESTConfig.json` and keep it on loopback/private networking. Create a token file from `examples/DiscordBot.example.json` in:

```text
Win64/PalDefender/RESTAPI/Tokens/DiscordBot.json
```

Generate a token:

```sh
openssl rand -hex 48
```

Replace the placeholder in the JSON file and restart Palworld. Do not reuse the Discord token.

## 2. Install the bot

Install Node.js 22 or newer, then place the repository at `/opt/paldefender-discord-bot`:

```sh
cd /opt/paldefender-discord-bot
cp .env.example .env
chmod 600 .env
```

Edit `.env`, then install and validate:

```sh
npm ci --omit=dev
npm run validate
npm run deploy-commands
npm run doctor
```

## 3. Install the systemd service

The included service expects a system user named `palbot`, the project at `/opt/paldefender-discord-bot`, and Node at `/usr/bin/node`:

```sh
sudo useradd --system --home /opt/paldefender-discord-bot --shell /usr/sbin/nologin palbot
sudo chown -R palbot:palbot /opt/paldefender-discord-bot
sudo chmod 600 /opt/paldefender-discord-bot/.env
sudo cp deploy/paldefender-discord-bot.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now paldefender-discord-bot
```

If `command -v node` does not return `/usr/bin/node`, edit `ExecStart` in the service file before enabling it.

## Controls and logs

```sh
sudo systemctl status paldefender-discord-bot
sudo systemctl stop paldefender-discord-bot
sudo systemctl start paldefender-discord-bot
sudo systemctl restart paldefender-discord-bot
sudo systemctl disable --now paldefender-discord-bot
sudo journalctl -u paldefender-discord-bot -f
```

Run `/server status` in Discord after starting the service.

## Updating

```sh
sudo systemctl stop paldefender-discord-bot
# Replace source files while preserving .env
npm ci --omit=dev
npm run validate
npm run deploy-commands
sudo systemctl start paldefender-discord-bot
```

The host needs outbound port `443` for Discord. Do not expose PalDefender port `17993` publicly.

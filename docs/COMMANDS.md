# Command reference

## Endpoint mapping

| Discord command | HTTP endpoint | PalDefender permission |
|---|---|---|
| `/server status` | `GET /v1/pdapi/version` | `REST.Version.Read` |
| `/server broadcast` | `POST /v1/pdapi/Broadcast` | `REST.Messages.Broadcast` |
| `/server alert` | `POST /v1/pdapi/Alert` | `REST.Messages.Alert` |
| `/server reload` | `POST /v1/pdapi/ReloadConfig` | `REST.Reload.Config` |
| `/player list` | `GET /v1/pdapi/players` | `REST.Players.Read` |
| `/player info` | `GET /v1/pdapi/player/{player}` | `REST.Player.Read` |
| `/player items` | `GET /v1/pdapi/items/{player}` | `REST.Items.Read` |
| `/player pals` | `GET /v1/pdapi/pals/{player}` | `REST.Pals.Read` |
| `/player techs` | `GET /v1/pdapi/techs/{player}` | `REST.Techs.Read` |
| `/player progression` | `GET /v1/pdapi/progression/{player}` | `REST.Progression.Read` |
| `/player message` | `POST /v1/pdapi/SendPlayerMessage` | One matching `REST.Messages.Send.*` permission |
| `/moderation kick` | `POST /v1/pdapi/kick/{player}` | `REST.Punishments.Kick` |
| `/moderation ban` | `POST /v1/pdapi/ban/{player}` | `REST.Punishments.Ban` |
| `/moderation ban-ip` | `POST /v1/pdapi/banip/{ip}` | `REST.Punishments.BanIP` |
| `/moderation unban` | `POST /v1/pdapi/unban/{user_id}` | `REST.Punishments.Unban` |
| `/moderation unban-ip` | `POST /v1/pdapi/unbanip/{ip}` | `REST.Punishments.UnbanIP` |
| `/moderation ban-list` | `GET /v1/pdapi/banlist` | `REST.Banlist.Read` |
| `/give item` | `POST /v1/pdapi/give/items/{player}` | `REST.Items.Give` |
| `/give pal` | `POST /v1/pdapi/give/pals/{player}` | `REST.Pals.Give` |
| `/give pal-template` | `POST /v1/pdapi/give/paltemplate/{player}` | `REST.PalTemplates.Give` |
| `/give pal-egg` | `POST /v1/pdapi/give/paleggs/{player}` | `REST.PalEggs.Give` |
| `/give progression` | `POST /v1/pdapi/give/progression/{player}` | `REST.Progression.Give` |
| `/technology learn` | `POST /v1/pdapi/learntech/{player}` | `REST.Techs.Learn` |
| `/technology forget` | `POST /v1/pdapi/forgettech/{player}` | `REST.Techs.Forget` |
| `/guild list` | `GET /v1/pdapi/guilds` | `REST.Guilds.Read` |
| `/guild info` | `GET /v1/pdapi/guild/{guild_id}` | `REST.Guild.Read` |
| `/guild delete-base` | `POST /v1/pdapi/deletebase/{base_camp_id}` | `REST.Base.Delete` |

## Input notes

- `player` accepts a PalDefender-supported UserId (Steam, GDK, or PS5) or PlayerUID.
- `/player message targets` accepts one identifier or comma-separated identifiers.
- `/technology learn|forget technology` accepts one TechID, comma-separated TechIDs, or `All`. `All` cannot be combined with an ID.
- Item, Pal, egg, and technology inputs use internal IDs rather than display names.
- `/give pal-egg` requires exactly one of `pal_id` or `template`.
- `/give progression` requires at least one grant. A relic type and relic amount must be supplied together.
- `/guild delete-base` permanently deletes a base and requires the exact confirmation `DELETE`. Verify the camp ID using `/guild info` and maintain backups.

The upstream API is the source of truth: [PalDefender REST API documentation](https://github.com/Ultimeit/PalDefender/tree/main/docs/en/RESTAPI).

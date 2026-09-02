# Publishing this repository on GitHub

## 1. Create the repository

Create a new public GitHub repository. Do not initialize it with a README, `.gitignore`, or license because those files are already included here.

Suggested settings:

- Repository name: `paldefender-discord-bot`
- Description: `Discord slash-command bridge for the PalDefender Palworld REST API`
- Topics: `discord-bot`, `palworld`, `paldefender`, `slash-commands`, `nodejs`

## 2. Push the project

Extract the prepared project, open a terminal in its root, and replace `YOUR_ACCOUNT` below:

```sh
git init -b main
git add .
git commit -m "Initial public release"
git remote add origin https://github.com/YOUR_ACCOUNT/paldefender-discord-bot.git
git push -u origin main
```

Check `git status` before committing. `.env`, `node_modules`, logs, archives, and editor folders must not appear.

## 3. Enable repository protections

Under GitHub repository settings:

1. Enable **Private vulnerability reporting**.
2. Enable **Dependency graph**, **Dependabot alerts**, **Dependabot security updates**, and **secret scanning** where available.
3. Enable GitHub Discussions if you want a place for setup support.
4. Add a pull-request rule for `main` requiring these exact checks: `Node.js 22`, `Node.js 24`, `PowerShell syntax`, and `analyze`.
5. Require branches to be up to date and conversations to be resolved. Require one approving review for a team repository; a solo maintainer can use zero approvals to avoid locking themselves out.
6. Disable force pushes and branch deletion for `main`.

No repository Actions secrets are required. The workflows never contact Discord or a live PalDefender server.

## 4. Create the first release

The `Release` workflow runs for version tags and requires the tag to match `package.json`. Merge all release changes into protected `main` and confirm the required checks before creating a tag.

For version `1.0.0`:

```sh
git tag -a v1.0.0 -m "v1.0.0"
git push origin v1.0.0
```

GitHub Actions validates the project, creates a deployment ZIP, and publishes a GitHub Release with generated notes. For future releases, update `package.json`, `package-lock.json`, and `CHANGELOG.md` before creating the tag.

Workflow actions are pinned to immutable commits with readable version comments. Dependabot should remain enabled so those pins receive update pull requests.

## 5. Post-publication check

- Confirm all Actions workflows pass.
- Download the release ZIP and confirm it contains `.env.example` but not `.env` or `node_modules`.
- Confirm the Security tab permits private reports.
- Confirm issue and pull-request templates appear.
- Test installation with a non-production Discord application and game server.
- Confirm `npm run deploy-commands` removed global commands and installed commands only in the configured guild.

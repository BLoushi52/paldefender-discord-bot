[CmdletBinding()]
param(
    [string]$DiscordClientId,
    [string]$DiscordGuildId,
    [string]$PalDefenderRestDirectory,
    [string]$BrandName,
    [string]$ActivityText,
    [string]$CopyrightText,
    [string]$SupportUrl
)

$ErrorActionPreference = "Stop"

function Write-Utf8WithoutBom {
    param(
        [Parameter(Mandatory = $true)][string]$Path,
        [Parameter(Mandatory = $true)][string]$Content
    )

    $encoding = New-Object System.Text.UTF8Encoding($false)
    [System.IO.File]::WriteAllText($Path, $Content, $encoding)
}

function Assert-Administrator {
    $identity = [Security.Principal.WindowsIdentity]::GetCurrent()
    $principal = New-Object Security.Principal.WindowsPrincipal($identity)
    if (-not $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
        throw "Run Windows PowerShell as Administrator, then run this script again."
    }
}

function Find-PalDefenderRestDirectory {
    $processes = Get-CimInstance Win32_Process | Where-Object {
        $_.Name -like "PalServer*.exe" -or $_.Name -eq "PalServer-Win64-Test-Cmd.exe"
    }

    foreach ($process in $processes) {
        if (-not $process.ExecutablePath) { continue }
        $candidate = Join-Path (Split-Path $process.ExecutablePath -Parent) "PalDefender\RESTAPI"
        if (Test-Path (Join-Path $candidate "RESTConfig.json")) {
            return $candidate
        }
    }

    return $null
}

function New-RandomHexToken {
    $rng = [System.Security.Cryptography.RandomNumberGenerator]::Create()
    try {
        $bytes = New-Object byte[] 48
        $rng.GetBytes($bytes)
        return -join ($bytes | ForEach-Object { $_.ToString("x2") })
    }
    finally {
        $rng.Dispose()
    }
}

function ConvertTo-DotEnvValue {
    param([AllowEmptyString()][string]$Value)

    if ($null -eq $Value) { $Value = "" }
    $escaped = $Value.Replace("\", "\\").Replace('"', '\"')
    $escaped = $escaped.Replace("`r", '\r').Replace("`n", '\n')
    return '"' + $escaped + '"'
}

function Assert-DiscordId {
    param(
        [Parameter(Mandatory = $true)][string]$Value,
        [Parameter(Mandatory = $true)][string]$Label
    )

    if ($Value -notmatch '^\d{17,20}$') {
        throw "$Label must be a 17-20 digit Discord ID."
    }
}

Assert-Administrator

$projectRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"

if (-not $DiscordClientId) {
    $DiscordClientId = (Read-Host "Discord Application ID").Trim()
}
if (-not $DiscordGuildId) {
    $DiscordGuildId = (Read-Host "Discord server (guild) ID").Trim()
}
Assert-DiscordId -Value $DiscordClientId -Label "Discord Application ID"
Assert-DiscordId -Value $DiscordGuildId -Label "Discord server ID"

if (-not $BrandName) {
    $BrandName = (Read-Host "Bot brand name [Palworld Admin]").Trim()
    if (-not $BrandName) { $BrandName = "Palworld Admin" }
}
if (-not $ActivityText) {
    $ActivityText = (Read-Host "Discord activity text [Managing Palworld]").Trim()
    if (-not $ActivityText) { $ActivityText = "Managing Palworld" }
}
if (-not $PSBoundParameters.ContainsKey("CopyrightText")) {
    $CopyrightText = (Read-Host "Copyright/footer text (optional)").Trim()
}
if (-not $PSBoundParameters.ContainsKey("SupportUrl")) {
    $SupportUrl = (Read-Host "Support website or Discord invite URL (optional)").Trim()
}

if ($BrandName.Length -gt 80) { throw "Brand name must be 80 characters or fewer." }
if ($ActivityText.Length -gt 128) { throw "Activity text must be 128 characters or fewer." }
if ($CopyrightText.Length -gt 200) { throw "Copyright text must be 200 characters or fewer." }
if ($SupportUrl) {
    $parsedSupportUrl = $null
    if (-not [Uri]::TryCreate($SupportUrl, [UriKind]::Absolute, [ref]$parsedSupportUrl) -or
        $parsedSupportUrl.Scheme -notin @("http", "https") -or
        -not [string]::IsNullOrEmpty($parsedSupportUrl.UserInfo)) {
        throw "Support URL must be a credential-free http:// or https:// URL."
    }
}

if (-not $PalDefenderRestDirectory) {
    $PalDefenderRestDirectory = Find-PalDefenderRestDirectory
}

if (-not $PalDefenderRestDirectory) {
    $PalDefenderRestDirectory = Read-Host "Full path to PalDefender\RESTAPI"
}

$PalDefenderRestDirectory = [System.IO.Path]::GetFullPath($PalDefenderRestDirectory.Trim('"'))
$restConfigPath = Join-Path $PalDefenderRestDirectory "RESTConfig.json"
if (-not (Test-Path $restConfigPath)) {
    throw "RESTConfig.json was not found at: $restConfigPath"
}

$restConfig = Get-Content $restConfigPath -Raw | ConvertFrom-Json
if ($restConfig.Enabled -ne $true) {
    $restConfigBackup = "$restConfigPath.$timestamp.bak"
    Copy-Item $restConfigPath $restConfigBackup
    if ($restConfig.PSObject.Properties.Name -contains "Enabled") {
        $restConfig.Enabled = $true
    }
    else {
        $restConfig | Add-Member -NotePropertyName Enabled -NotePropertyValue $true
    }
    Write-Utf8WithoutBom -Path $restConfigPath -Content ($restConfig | ConvertTo-Json -Depth 100)
    Write-Host "Enabled PalDefender REST API. Backup: $restConfigBackup"
}
else {
    Write-Host "PalDefender REST API is already enabled."
}

$permissions = @(
    "REST.Version.Read",
    "REST.Messages.Broadcast",
    "REST.Messages.Alert",
    "REST.Reload.Config",
    "REST.Players.Read",
    "REST.Player.Read",
    "REST.Items.Read",
    "REST.Pals.Read",
    "REST.Techs.Read",
    "REST.Progression.Read",
    "REST.Messages.Send.PlayerChat",
    "REST.Messages.Send.GlobalChat",
    "REST.Messages.Send.GuildChat",
    "REST.Messages.Send.Log.Normal",
    "REST.Messages.Send.Log.Important",
    "REST.Messages.Send.Log.VeryImportant",
    "REST.Punishments.Kick",
    "REST.Punishments.Ban",
    "REST.Punishments.BanIP",
    "REST.Punishments.Unban",
    "REST.Punishments.UnbanIP",
    "REST.Banlist.Read",
    "REST.Items.Give",
    "REST.Pals.Give",
    "REST.PalTemplates.Give",
    "REST.PalEggs.Give",
    "REST.Progression.Give",
    "REST.Techs.Learn",
    "REST.Techs.Forget",
    "REST.Guilds.Read",
    "REST.Guild.Read",
    "REST.Base.Delete"
)

$palDefenderToken = New-RandomHexToken
$tokensDirectory = Join-Path $PalDefenderRestDirectory "Tokens"
New-Item -ItemType Directory -Path $tokensDirectory -Force | Out-Null

$tokenPath = Join-Path $tokensDirectory "DiscordBot.json"
if (Test-Path $tokenPath) {
    $revokedBackup = Join-Path $tokensDirectory "DiscordBot.json.revoked-$timestamp.bak"
    Move-Item $tokenPath $revokedBackup
    Write-Host "Deactivated the previous DiscordBot token file: $revokedBackup"
}

$tokenDocument = [ordered]@{
    Name = "DiscordBot"
    Token = $palDefenderToken
    Permissions = $permissions
}
Write-Utf8WithoutBom -Path $tokenPath -Content ($tokenDocument | ConvertTo-Json -Depth 10)
Write-Host "Created a separate PalDefender service token: $tokenPath"

$secureDiscordToken = Read-Host "Paste the Discord bot token (input is hidden)" -AsSecureString
$bstr = [IntPtr]::Zero
$discordToken = $null
try {
    $bstr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secureDiscordToken)
    $discordToken = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($bstr)
    if ([string]::IsNullOrWhiteSpace($discordToken)) {
        throw "The Discord token cannot be empty."
    }

    $envLines = @(
        "DISCORD_TOKEN=$(ConvertTo-DotEnvValue $discordToken)",
        "DISCORD_CLIENT_ID=$(ConvertTo-DotEnvValue $DiscordClientId)",
        "DISCORD_GUILD_ID=$(ConvertTo-DotEnvValue $DiscordGuildId)",
        "BOT_BRAND_NAME=$(ConvertTo-DotEnvValue $BrandName)",
        "BOT_ACTIVITY_TEXT=$(ConvertTo-DotEnvValue $ActivityText)",
        "BOT_COPYRIGHT_TEXT=$(ConvertTo-DotEnvValue $CopyrightText)",
        "BOT_SUPPORT_URL=$(ConvertTo-DotEnvValue $SupportUrl)",
        'PALDEFENDER_BASE_URL="http://127.0.0.1:17993"',
        "PALDEFENDER_TOKEN=$(ConvertTo-DotEnvValue $palDefenderToken)",
        'PALDEFENDER_TIMEOUT_MS="7000"',
        'DISCORD_ALLOWED_USER_IDS=""',
        'DISCORD_ALLOWED_ROLE_IDS=""',
        'PALDEFENDER_ALLOW_REMOTE="false"'
    )
    $envContent = $envLines -join "`r`n"

    $envPath = Join-Path $projectRoot ".env"
    if (Test-Path $envPath) {
        $envBackup = "$envPath.$timestamp.bak"
        Copy-Item $envPath $envBackup
        Write-Host "Backed up the existing .env file: $envBackup"
    }
    Write-Utf8WithoutBom -Path $envPath -Content $envContent
}
finally {
    if ($bstr -ne [IntPtr]::Zero) {
        [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr)
    }
    $discordToken = $null
    $secureDiscordToken = $null
}

& icacls.exe (Join-Path $projectRoot ".env") /inheritance:r | Out-Null
& icacls.exe (Join-Path $projectRoot ".env") /grant:r "*S-1-5-32-544:(F)" "*S-1-5-18:(F)" | Out-Null
if ($LASTEXITCODE -ne 0) {
    throw "Failed to secure .env permissions with icacls."
}
Write-Host "Created and secured: $(Join-Path $projectRoot '.env')"

$npm = Get-Command npm.cmd -ErrorAction Stop
Push-Location $projectRoot
try {
    & $npm.Source ci --omit=dev
    if ($LASTEXITCODE -ne 0) { throw "npm ci failed." }

    & $npm.Source run check
    if ($LASTEXITCODE -ne 0) { throw "Bot validation failed." }

    & $npm.Source test
    if ($LASTEXITCODE -ne 0) { throw "Bot tests failed." }

    & $npm.Source run deploy-commands
    if ($LASTEXITCODE -ne 0) { throw "Discord slash-command deployment failed." }
}
finally {
    Pop-Location
}

$taskName = "PalDefender Discord Bot"
$launcherPath = Join-Path $projectRoot "deploy\start-bot.cmd"
$taskArgument = '/d /c ""{0}""' -f $launcherPath
$action = New-ScheduledTaskAction `
    -Execute (Join-Path $env:SystemRoot "System32\cmd.exe") `
    -Argument $taskArgument `
    -WorkingDirectory $projectRoot
$trigger = New-ScheduledTaskTrigger -AtStartup
$principal = New-ScheduledTaskPrincipal `
    -UserId "SYSTEM" `
    -LogonType ServiceAccount `
    -RunLevel Highest
$settings = New-ScheduledTaskSettingsSet `
    -RestartCount 999 `
    -RestartInterval (New-TimeSpan -Minutes 1) `
    -StartWhenAvailable `
    -ExecutionTimeLimit ([TimeSpan]::Zero) `
    -MultipleInstances IgnoreNew

Register-ScheduledTask `
    -TaskName $taskName `
    -Description "Discord bridge for the local PalDefender REST API" `
    -Action $action `
    -Trigger $trigger `
    -Principal $principal `
    -Settings $settings `
    -Force | Out-Null
Start-ScheduledTask -TaskName $taskName

Write-Host ""
Write-Host "Configuration completed successfully." -ForegroundColor Green
Write-Host "Discord application ID: $DiscordClientId"
Write-Host "Discord server ID:      $DiscordGuildId"
Write-Host "Bot brand name:         $BrandName"
Write-Host "Scheduled task:         $taskName"
Write-Warning "Restart the Palworld server now so it loads the new PalDefender token."
Write-Host "After the restart, use /server status in Discord."
Write-Host "Bot log: $projectRoot\logs\bot.log"

[CmdletBinding()]
param(
    [string]$DiscordClientId,
    [string]$DiscordGuildId,
    [string]$PalDefenderRestDirectory,
    [string]$BrandName,
    [string]$ActivityText,
    [string]$CopyrightText,
    [string]$SupportUrl,
    [string]$TaskName = "PalDefender Discord Bot"
)

$ErrorActionPreference = "Stop"

function Write-Utf8WithoutBom {
    param(
        [Parameter(Mandatory = $true)][string]$Path,
        [Parameter(Mandatory = $true)][string]$Content
    )

    $encoding = New-Object System.Text.UTF8Encoding($false)
    $directory = Split-Path $Path -Parent
    $temporaryPath = Join-Path $directory ".$([System.IO.Path]::GetFileName($Path)).$PID.tmp"
    try {
        [System.IO.File]::WriteAllText($temporaryPath, $Content, $encoding)
        Move-Item -Path $temporaryPath -Destination $Path -Force
    }
    finally {
        Remove-Item $temporaryPath -Force -ErrorAction SilentlyContinue
    }
}

function Protect-AdminFile {
    param([Parameter(Mandatory = $true)][string]$Path)

    & icacls.exe $Path /inheritance:r /grant:r "*S-1-5-32-544:(F)" "*S-1-5-18:(F)" | Out-Null
    if ($LASTEXITCODE -ne 0) {
        throw "Failed to secure file permissions: $Path"
    }
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

$secureDiscordToken = Read-Host "Paste the Discord bot token (input is hidden)" -AsSecureString
$bstr = [IntPtr]::Zero
$discordToken = $null
$envContent = $null
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
        'PALDEFENDER_TOKEN=__PALDEFENDER_TOKEN__',
        'PALDEFENDER_TIMEOUT_MS="7000"',
        'PALDEFENDER_MAX_RESPONSE_BYTES="7340032"',
        'DISCORD_ALLOWED_USER_IDS=""',
        'DISCORD_ALLOWED_ROLE_IDS=""',
        'PALDEFENDER_ALLOW_REMOTE="false"',
        'PALDEFENDER_ALLOW_INSECURE_REMOTE="false"'
    )
    $envContent = $envLines -join "`r`n"
}
finally {
    if ($bstr -ne [IntPtr]::Zero) {
        [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr)
    }
    $discordToken = $null
    $secureDiscordToken = $null
}

$palDefenderToken = New-RandomHexToken
$envContent = $envContent.Replace("__PALDEFENDER_TOKEN__", (ConvertTo-DotEnvValue $palDefenderToken))
$tokensDirectory = Join-Path $PalDefenderRestDirectory "Tokens"
New-Item -ItemType Directory -Path $tokensDirectory -Force | Out-Null

$tokenPath = Join-Path $tokensDirectory "DiscordBot.json"
$envPath = Join-Path $projectRoot ".env"
$tokenBackup = $null
$envBackup = $null
$hadToken = Test-Path $tokenPath
$hadEnv = Test-Path $envPath
$tokenMutationStarted = $false
$envMutationStarted = $false
$existingTask = Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue
$existingTaskWasRunning = ($null -ne $existingTask) -and $existingTask.State -eq "Running"
$existingTaskWasDisabled = ($null -ne $existingTask) -and $existingTask.State -eq "Disabled"

try {
    Write-Host "Stopping any existing '$TaskName' instance before rotating credentials."
    & (Join-Path $projectRoot "deploy\manage-windows-task.ps1") -Action Stop -TaskName $TaskName

    if ($hadToken) {
        $tokenBackup = Join-Path $tokensDirectory "DiscordBot.json.revoked-$timestamp.bak"
        Move-Item $tokenPath $tokenBackup
        $tokenMutationStarted = $true
        Write-Host "Deactivated the previous DiscordBot token file: $tokenBackup"
    }
    else {
        $tokenMutationStarted = $true
    }

    $tokenDocument = [ordered]@{
        Name = "DiscordBot"
        Token = $palDefenderToken
        Permissions = $permissions
    }
    Write-Utf8WithoutBom -Path $tokenPath -Content ($tokenDocument | ConvertTo-Json -Depth 10)
    Write-Host "Created a separate PalDefender service token: $tokenPath"

    if ($hadEnv) {
        $envBackup = "$envPath.$timestamp.bak"
        Copy-Item $envPath $envBackup
        Protect-AdminFile -Path $envBackup
        Write-Host "Backed up and secured the existing .env file: $envBackup"
    }
    $envMutationStarted = $true
    Write-Utf8WithoutBom -Path $envPath -Content $envContent
    Protect-AdminFile -Path $envPath
    Write-Host "Created and secured: $envPath"

    $npm = Get-Command npm.cmd -ErrorAction Stop
    Push-Location $projectRoot
    try {
        & $npm.Source ci --omit=dev
        if ($LASTEXITCODE -ne 0) { throw "npm ci failed." }

        & $npm.Source run validate
        if ($LASTEXITCODE -ne 0) { throw "Bot validation failed." }

        & $npm.Source run deploy-commands
        if ($LASTEXITCODE -ne 0) { throw "Discord slash-command deployment failed." }
    }
    finally {
        Pop-Location
    }

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
        -TaskName $TaskName `
        -Description "Discord bridge for one local PalDefender server and one Discord guild" `
        -Action $action `
        -Trigger $trigger `
        -Principal $principal `
        -Settings $settings `
        -Force | Out-Null
    Start-ScheduledTask -TaskName $TaskName
    Start-Sleep -Seconds 2
    if ((Get-ScheduledTask -TaskName $TaskName).State -ne "Running") {
        throw "The scheduled task did not remain running. Check logs\bot.log."
    }

}
catch {
    $configurationError = $_
    Write-Warning "Configuration failed. Restoring the previous credentials and task state."

    try {
        & (Join-Path $projectRoot "deploy\manage-windows-task.ps1") -Action Stop -TaskName $TaskName
    }
    catch {
        Write-Warning "Rollback could not stop the failed bot instance: $($_.Exception.Message)"
    }

    try {
        if ($tokenMutationStarted) {
            Remove-Item $tokenPath -Force -ErrorAction SilentlyContinue
            if ($tokenBackup -and (Test-Path $tokenBackup)) {
                Move-Item $tokenBackup $tokenPath -Force
            }
        }
    }
    catch {
        Write-Warning "Rollback could not restore the previous PalDefender token: $($_.Exception.Message)"
    }

    try {
        if ($envMutationStarted) {
            if ($hadEnv -and $envBackup -and (Test-Path $envBackup)) {
                Copy-Item $envBackup $envPath -Force
                Protect-AdminFile -Path $envPath
            }
            elseif (-not $hadEnv) {
                Remove-Item $envPath -Force -ErrorAction SilentlyContinue
            }
        }
    }
    catch {
        Write-Warning "Rollback could not restore the previous .env file: $($_.Exception.Message)"
    }

    try {
        if ($null -eq $existingTask) {
            Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false -ErrorAction SilentlyContinue
        }
        elseif ($existingTaskWasDisabled) {
            Disable-ScheduledTask -TaskName $TaskName | Out-Null
        }
        elseif ($existingTaskWasRunning) {
            Enable-ScheduledTask -TaskName $TaskName | Out-Null
            Start-ScheduledTask -TaskName $TaskName
        }
    }
    catch {
        Write-Warning "Rollback could not restore the previous task state: $($_.Exception.Message)"
    }

    throw $configurationError
}

if ($tokenBackup) {
    try {
        Protect-AdminFile -Path $tokenBackup
    }
    catch {
        Write-Warning "The revoked token backup could not be restricted. Delete it manually: $tokenBackup"
    }
}

Write-Host ""
Write-Host "Configuration completed successfully." -ForegroundColor Green
Write-Host "Discord application ID: $DiscordClientId"
Write-Host "Discord server ID:      $DiscordGuildId"
Write-Host "Bot brand name:         $BrandName"
Write-Host "Scheduled task:         $TaskName"
Write-Warning "Restart the Palworld server now so it loads the new PalDefender token."
Write-Host "After the restart, use /server status in Discord."
Write-Host "Bot log: $projectRoot\logs\bot.log"

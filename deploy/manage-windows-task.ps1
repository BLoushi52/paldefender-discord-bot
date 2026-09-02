[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)]
    [ValidateSet("Start", "Stop", "Restart", "Status", "Enable", "Disable", "Remove")]
    [string]$Action,

    [string]$TaskName = "PalDefender Discord Bot"
)

$ErrorActionPreference = "Stop"
$projectRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$entryPoint = Join-Path $projectRoot "src\index.js"
$launcherPath = Join-Path $projectRoot "deploy\start-bot.cmd"

function Get-BotProcesses {
    $processes = @(Get-CimInstance Win32_Process)
    $launcherProcessIds = @($processes | Where-Object {
        $_.Name -eq "cmd.exe" -and
        $_.CommandLine -and
        $_.CommandLine.IndexOf($launcherPath, [StringComparison]::OrdinalIgnoreCase) -ge 0
    } | Select-Object -ExpandProperty ProcessId)

    return @($processes | Where-Object {
        if ($_.Name -ne "node.exe" -or -not $_.CommandLine) {
            $false
        }
        else {
            $absoluteEntryPoint = $_.CommandLine.IndexOf($entryPoint, [StringComparison]::OrdinalIgnoreCase) -ge 0
            $legacyLauncherChild = $launcherProcessIds -contains $_.ParentProcessId
            $absoluteEntryPoint -or $legacyLauncherChild
        }
    })
}

function Stop-BotProcess {
    $knownProcesses = @(Get-BotProcesses)
    Stop-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue

    for ($attempt = 0; $attempt -lt 10; $attempt++) {
        $remaining = @($knownProcesses | Where-Object { Get-Process -Id $_.ProcessId -ErrorAction SilentlyContinue })
        if ($remaining.Count -eq 0) { break }
        Start-Sleep -Milliseconds 250
    }

    $remainingProcesses = @($knownProcesses + @(Get-BotProcesses) | Sort-Object ProcessId -Unique)
    $remainingProcesses | ForEach-Object {
        if (Get-Process -Id $_.ProcessId -ErrorAction SilentlyContinue) {
            Stop-Process -Id $_.ProcessId -Force
        }
    }
}

switch ($Action) {
    "Start" {
        Enable-ScheduledTask -TaskName $TaskName | Out-Null
        Start-ScheduledTask -TaskName $TaskName
    }
    "Stop" {
        Stop-BotProcess
    }
    "Restart" {
        Stop-BotProcess
        Start-Sleep -Seconds 1
        Enable-ScheduledTask -TaskName $TaskName | Out-Null
        Start-ScheduledTask -TaskName $TaskName
    }
    "Status" {
        Get-ScheduledTask -TaskName $TaskName | Select-Object TaskName, State
        Get-ScheduledTaskInfo -TaskName $TaskName |
            Select-Object LastRunTime, LastTaskResult, NextRunTime, NumberOfMissedRuns
        $botProcesses = @(Get-BotProcesses)
        if ($botProcesses.Count -gt 0) {
            $botProcesses | Select-Object ProcessId, ParentProcessId, CommandLine
        }
        else {
            Write-Host "Bot process: not running"
        }
        $logPath = Join-Path $projectRoot "logs\bot.log"
        if (Test-Path $logPath) {
            Write-Host ""
            Write-Host "Last 20 log lines:"
            Get-Content $logPath -Tail 20
        }
    }
    "Enable" {
        Enable-ScheduledTask -TaskName $TaskName | Out-Null
    }
    "Disable" {
        Stop-BotProcess
        Disable-ScheduledTask -TaskName $TaskName | Out-Null
    }
    "Remove" {
        Stop-BotProcess
        Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false
    }
}

if ($Action -ne "Status") {
    Write-Host "$Action completed for scheduled task '$TaskName'."
}

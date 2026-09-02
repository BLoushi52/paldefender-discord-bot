'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const projectRoot = path.resolve(__dirname, '..');
const configure = fs.readFileSync(path.join(projectRoot, 'deploy', 'configure-windows.ps1'), 'utf8');
const manage = fs.readFileSync(path.join(projectRoot, 'deploy', 'manage-windows-task.ps1'), 'utf8');
const launcher = fs.readFileSync(path.join(projectRoot, 'deploy', 'start-bot.cmd'), 'utf8');
const exampleToken = JSON.parse(
  fs.readFileSync(path.join(projectRoot, 'examples', 'DiscordBot.example.json'), 'utf8'),
);

test('Windows launcher and manager identify the bot through its absolute entry point', () => {
  assert.match(launcher, /"%NODE_EXE%" "%PROJECT_ROOT%\\src\\index\.js"/);
  assert.match(manage, /\$entryPoint = Join-Path \$projectRoot "src\\index\.js"/);
  assert.match(manage, /Stop-ScheduledTask/);
  assert.match(manage, /Stop-Process -Id \$_\.ProcessId -Force/);
});

test('Windows configuration stops the prior instance before credential rotation and includes rollback', () => {
  const stopPosition = configure.indexOf('Stopping any existing');
  const tokenWritePosition = configure.indexOf('Write-Utf8WithoutBom -Path $tokenPath');
  assert.ok(stopPosition >= 0 && stopPosition < tokenWritePosition);
  assert.match(configure, /Restoring the previous credentials and task state/);
  assert.match(configure, /Protect-AdminFile -Path \$envBackup/);
  assert.match(configure, /PALDEFENDER_ALLOW_INSECURE_REMOTE="false"/);
});

test('Windows installer and manual token example grant the same PalDefender permissions', () => {
  const configuredPermissions = [...configure.matchAll(/"(REST\.[A-Za-z.*]+)"/g)]
    .map((match) => match[1]);
  assert.deepEqual(configuredPermissions, exampleToken.Permissions);
});

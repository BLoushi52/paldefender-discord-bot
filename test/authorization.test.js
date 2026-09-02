'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const { PermissionFlagsBits } = require('discord.js');
const { isAuthorized, memberRoleIds } = require('../src/authorization');

const guildId = '234567890123456789';
const allowedUserId = '345678901234567890';
const allowedRoleId = '456789012345678901';
const config = {
  discordGuildId: guildId,
  allowedUserIds: new Set([allowedUserId]),
  allowedRoleIds: new Set([allowedRoleId]),
};

function interaction({
  activeGuildId = guildId,
  administrator = false,
  userId = '567890123456789012',
  roles = [],
  inGuild = true,
} = {}) {
  return {
    guildId: activeGuildId,
    user: { id: userId },
    member: { roles },
    inGuild: () => inGuild,
    memberPermissions: {
      has: (permission) => permission === PermissionFlagsBits.Administrator && administrator,
    },
  };
}

test('rejects DMs and every interaction outside the configured guild', () => {
  assert.equal(isAuthorized(interaction({ inGuild: false, administrator: true }), config), false);
  assert.equal(isAuthorized(interaction({
    activeGuildId: '678901234567890123',
    administrator: true,
  }), config), false);
  assert.equal(isAuthorized(interaction({
    activeGuildId: '678901234567890123',
    userId: allowedUserId,
  }), config), false);
});

test('allows administrators, allowlisted users, and allowlisted roles only in the configured guild', () => {
  assert.equal(isAuthorized(interaction({ administrator: true }), config), true);
  assert.equal(isAuthorized(interaction({ userId: allowedUserId }), config), true);
  assert.equal(isAuthorized(interaction({ roles: [allowedRoleId] }), config), true);
  assert.equal(isAuthorized(interaction(), config), false);
});

test('extracts role IDs from Discord collections and API arrays', () => {
  assert.deepEqual(memberRoleIds({ roles: [allowedRoleId] }), [allowedRoleId]);
  assert.deepEqual(memberRoleIds({ roles: { cache: new Map([[allowedRoleId, {}]]) } }), [allowedRoleId]);
  assert.deepEqual(memberRoleIds(null), []);
});

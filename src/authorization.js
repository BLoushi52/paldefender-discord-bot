'use strict';

const { PermissionFlagsBits } = require('discord.js');

function memberRoleIds(member) {
  if (!member?.roles) return [];
  if (member.roles.cache) return [...member.roles.cache.keys()];
  if (Array.isArray(member.roles)) return member.roles;
  return [];
}

function isAuthorized(interaction, config) {
  if (!interaction.inGuild()) return false;

  if (interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) return true;
  if (config.allowedUserIds.has(interaction.user.id)) return true;

  const roles = memberRoleIds(interaction.member);
  return roles.some((roleId) => config.allowedRoleIds.has(roleId));
}

module.exports = { isAuthorized, memberRoleIds };

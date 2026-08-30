'use strict';

const {
  InteractionContextType,
  PermissionFlagsBits,
  SlashCommandBuilder,
} = require('discord.js');

const API = '/v1/pdapi';
const MAX_GRANT = 2_147_483_647;

class UserInputError extends Error {
  constructor(message) {
    super(message);
    this.name = 'UserInputError';
  }
}

function command(name, description) {
  return new SlashCommandBuilder()
    .setName(name)
    .setDescription(description)
    .setContexts(InteractionContextType.Guild)
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator);
}

function playerOption(option, description = 'Steam/GDK/PS5 UserId or PlayerUID') {
  return option
    .setName('player')
    .setDescription(description)
    .setRequired(true)
    .setMinLength(1)
    .setMaxLength(200);
}

function reasonOption(option) {
  return option
    .setName('reason')
    .setDescription('Optional audit/moderation reason')
    .setRequired(false)
    .setMaxLength(1000);
}

const serverCommand = command('server', 'Server status, messages, and PalDefender configuration')
  .addSubcommand((sub) => sub.setName('status').setDescription('Check REST API health and version'))
  .addSubcommand((sub) =>
    sub
      .setName('broadcast')
      .setDescription('Broadcast a chat message in-game')
      .addStringOption((option) =>
        option.setName('message').setDescription('Message to broadcast').setRequired(true).setMaxLength(2000),
      ),
  )
  .addSubcommand((sub) =>
    sub
      .setName('alert')
      .setDescription('Show an in-game alert')
      .addStringOption((option) =>
        option.setName('message').setDescription('Alert text').setRequired(true).setMaxLength(2000),
      ),
  )
  .addSubcommand((sub) =>
    sub.setName('reload').setDescription('Reload the PalDefender configuration'),
  );

const playerCommand = command('player', 'Read player data or send a player message')
  .addSubcommand((sub) => sub.setName('list').setDescription('List known players'))
  .addSubcommand((sub) =>
    sub.setName('info').setDescription('Show one player').addStringOption(playerOption),
  )
  .addSubcommand((sub) =>
    sub.setName('items').setDescription("List a player's items").addStringOption(playerOption),
  )
  .addSubcommand((sub) =>
    sub.setName('pals').setDescription("List a player's Pals").addStringOption(playerOption),
  )
  .addSubcommand((sub) =>
    sub.setName('techs').setDescription("List a player's technologies").addStringOption(playerOption),
  )
  .addSubcommand((sub) =>
    sub
      .setName('progression')
      .setDescription("Show a player's progression")
      .addStringOption(playerOption),
  )
  .addSubcommand((sub) =>
    sub
      .setName('message')
      .setDescription('Send an in-game message to one or more players')
      .addStringOption((option) =>
        option
          .setName('targets')
          .setDescription('One UserId/PlayerUID, or several separated by commas')
          .setRequired(true)
          .setMaxLength(4000),
      )
      .addStringOption((option) =>
        option
          .setName('send_type')
          .setDescription('How the message is shown in-game')
          .setRequired(true)
          .addChoices(
            { name: 'Player chat', value: 'PlayerChat' },
            { name: 'Global chat', value: 'PlayerGlobalChat' },
            { name: 'Guild chat', value: 'PlayerGuildChat' },
            { name: 'Normal log', value: 'PlayerLogNormal' },
            { name: 'Important log', value: 'PlayerLogImportant' },
            { name: 'Very important log', value: 'PlayerLogVeryImportant' },
          ),
      )
      .addStringOption((option) =>
        option.setName('message').setDescription('Message text').setRequired(true).setMaxLength(2000),
      ),
  );

const moderationCommand = command('moderation', 'Kick, ban, unban, and inspect bans')
  .addSubcommand((sub) =>
    sub
      .setName('kick')
      .setDescription('Kick an online player')
      .addStringOption(playerOption)
      .addStringOption(reasonOption),
  )
  .addSubcommand((sub) =>
    sub
      .setName('ban')
      .setDescription('Ban a player identifier')
      .addStringOption(playerOption)
      .addStringOption(reasonOption)
      .addBooleanOption((option) =>
        option
          .setName('ban_resolved_ip')
          .setDescription("Also ban the player's resolved IP")
          .setRequired(false),
      ),
  )
  .addSubcommand((sub) =>
    sub
      .setName('ban-ip')
      .setDescription('Ban an IP address')
      .addStringOption((option) =>
        option.setName('ip').setDescription('IP address').setRequired(true).setMaxLength(64),
      )
      .addStringOption(reasonOption)
      .addStringOption((option) =>
        option
          .setName('user_id')
          .setDescription('Optional UserId to associate with this IP ban')
          .setRequired(false)
          .setMaxLength(200),
      ),
  )
  .addSubcommand((sub) =>
    sub
      .setName('unban')
      .setDescription('Unban a user ID')
      .addStringOption((option) =>
        option.setName('user_id').setDescription('UserId to unban').setRequired(true).setMaxLength(200),
      )
      .addStringOption(reasonOption),
  )
  .addSubcommand((sub) =>
    sub
      .setName('unban-ip')
      .setDescription('Unban an IP address')
      .addStringOption((option) =>
        option.setName('ip').setDescription('IP address to unban').setRequired(true).setMaxLength(64),
      )
      .addStringOption(reasonOption),
  )
  .addSubcommand((sub) =>
    sub
      .setName('ban-list')
      .setDescription('Search PalDefender ban records')
      .addBooleanOption((option) =>
        option.setName('active').setDescription('Filter active/inactive state').setRequired(false),
      )
      .addStringOption((option) =>
        option.setName('entry_type').setDescription('Filter entry type').setRequired(false).setMaxLength(100),
      )
      .addStringOption((option) =>
        option.setName('user_id').setDescription('Filter user ID').setRequired(false).setMaxLength(200),
      )
      .addStringOption((option) =>
        option.setName('ip').setDescription('Filter IP address').setRequired(false).setMaxLength(64),
      )
      .addStringOption((option) =>
        option.setName('issuer_type').setDescription('Filter issuer type').setRequired(false).setMaxLength(100),
      )
      .addStringOption((option) =>
        option.setName('issuer_name').setDescription('Filter issuer name').setRequired(false).setMaxLength(200),
      )
      .addStringOption((option) =>
        option.setName('issuer_ip').setDescription('Filter issuer IP').setRequired(false).setMaxLength(64),
      )
      .addStringOption((option) =>
        option.setName('reason').setDescription('Filter reason text').setRequired(false).setMaxLength(1000),
      )
      .addStringOption((option) =>
        option.setName('query').setDescription('General text search').setRequired(false).setMaxLength(1000),
      ),
  );

const relicChoices = [
  'CapturePower',
  'HungerReduction',
  'SwimSpeed',
  'FoodDecayReduction',
  'JumpPower',
  'GliderSpeed',
  'ClimbSpeed',
  'StatusAilmentResist',
  'StaminaReduction',
  'SphereHoming',
  'ExpBonus',
  'RainbowPassiveRate',
  'MoveSpeed',
].map((value) => ({ name: value, value }));

const giveCommand = command('give', 'Give items, Pals, eggs, templates, or progression')
  .addSubcommand((sub) =>
    sub
      .setName('item')
      .setDescription('Give one item stack')
      .addStringOption(playerOption)
      .addStringOption((option) =>
        option.setName('item_id').setDescription('PalDefender ItemID').setRequired(true).setMaxLength(200),
      )
      .addIntegerOption((option) =>
        option.setName('count').setDescription('Quantity').setRequired(true).setMinValue(1).setMaxValue(MAX_GRANT),
      ),
  )
  .addSubcommand((sub) =>
    sub
      .setName('pal')
      .setDescription('Give one Pal by ID and level')
      .addStringOption(playerOption)
      .addStringOption((option) =>
        option.setName('pal_id').setDescription('PalDefender PalID').setRequired(true).setMaxLength(200),
      )
      .addIntegerOption((option) =>
        option.setName('level').setDescription('Pal level').setRequired(true).setMinValue(1).setMaxValue(MAX_GRANT),
      ),
  )
  .addSubcommand((sub) =>
    sub
      .setName('pal-template')
      .setDescription('Give one Pal from Pals/Templates')
      .addStringOption(playerOption)
      .addStringOption((option) =>
        option
          .setName('template')
          .setDescription('Template filename, optionally ending in .json')
          .setRequired(true)
          .setMaxLength(255),
      ),
  )
  .addSubcommand((sub) =>
    sub
      .setName('pal-egg')
      .setDescription('Give one Pal egg')
      .addStringOption(playerOption)
      .addStringOption((option) =>
        option.setName('egg_id').setDescription('Egg ItemID').setRequired(true).setMaxLength(200),
      )
      .addStringOption((option) =>
        option.setName('pal_id').setDescription('PalID (do not combine with template)').setRequired(false).setMaxLength(200),
      )
      .addStringOption((option) =>
        option
          .setName('template')
          .setDescription('Pal template (do not combine with pal_id)')
          .setRequired(false)
          .setMaxLength(255),
      )
      .addIntegerOption((option) =>
        option.setName('level').setDescription('Optional egg Pal level').setRequired(false).setMinValue(1).setMaxValue(MAX_GRANT),
      ),
  )
  .addSubcommand((sub) =>
    sub
      .setName('progression')
      .setDescription('Grant one or more progression values')
      .addStringOption(playerOption)
      .addIntegerOption((option) =>
        option.setName('exp').setDescription('EXP to grant').setRequired(false).setMinValue(1).setMaxValue(MAX_GRANT),
      )
      .addIntegerOption((option) =>
        option
          .setName('technology_points')
          .setDescription('Technology points to grant')
          .setRequired(false)
          .setMinValue(1)
          .setMaxValue(MAX_GRANT),
      )
      .addIntegerOption((option) =>
        option
          .setName('ancient_technology_points')
          .setDescription('Ancient technology points to grant')
          .setRequired(false)
          .setMinValue(1)
          .setMaxValue(MAX_GRANT),
      )
      .addStringOption((option) =>
        option
          .setName('relic_type')
          .setDescription('Relic category to grant')
          .setRequired(false)
          .addChoices(...relicChoices),
      )
      .addIntegerOption((option) =>
        option
          .setName('relic_amount')
          .setDescription('Relic amount (requires relic_type)')
          .setRequired(false)
          .setMinValue(1)
          .setMaxValue(MAX_GRANT),
      ),
  );

const technologyCommand = command('technology', 'Learn or forget player technologies')
  .addSubcommand((sub) =>
    sub
      .setName('learn')
      .setDescription('Learn one, several, or all technologies')
      .addStringOption(playerOption)
      .addStringOption((option) =>
        option
          .setName('technology')
          .setDescription('One TechID, comma-separated TechIDs, or All')
          .setRequired(true)
          .setMaxLength(4000),
      ),
  )
  .addSubcommand((sub) =>
    sub
      .setName('forget')
      .setDescription('Forget one, several, or all technologies')
      .addStringOption(playerOption)
      .addStringOption((option) =>
        option
          .setName('technology')
          .setDescription('One TechID, comma-separated TechIDs, or All')
          .setRequired(true)
          .setMaxLength(4000),
      ),
  );

const guildCommand = command('guild', 'Read guild/base data or delete a base')
  .addSubcommand((sub) => sub.setName('list').setDescription('List known guilds'))
  .addSubcommand((sub) =>
    sub
      .setName('info')
      .setDescription('Show one guild and its bases')
      .addStringOption((option) =>
        option.setName('guild_id').setDescription('Guild ID').setRequired(true).setMaxLength(200),
      ),
  )
  .addSubcommand((sub) =>
    sub
      .setName('delete-base')
      .setDescription('Permanently delete a base/camp')
      .addStringOption((option) =>
        option.setName('base_camp_id').setDescription('Base camp GUID').setRequired(true).setMaxLength(100),
      )
      .addStringOption((option) =>
        option
          .setName('confirm')
          .setDescription('Type DELETE to confirm this destructive action')
          .setRequired(true)
          .setMaxLength(20),
      ),
  );

const commandBuilders = [
  serverCommand,
  playerCommand,
  moderationCommand,
  giveCommand,
  technologyCommand,
  guildCommand,
];

const commandData = commandBuilders.map((builder) => builder.toJSON());

function pathValue(value) {
  return encodeURIComponent(value.trim());
}

function compactObject(entries) {
  return Object.fromEntries(entries.filter(([, value]) => value !== null && value !== undefined));
}

function parseTargets(value) {
  const targets = value
    .split(',')
    .map((target) => target.trim())
    .filter(Boolean);
  if (targets.length === 0) throw new UserInputError('Provide at least one player target.');
  return [...new Set(targets)];
}

function parseTechnology(value) {
  const entries = value
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);
  if (entries.length === 0) throw new UserInputError('Provide a TechID or All.');
  if (entries.some((entry) => entry.toLowerCase() === 'all')) {
    if (entries.length !== 1) throw new UserInputError('All cannot be combined with TechIDs.');
    return 'All';
  }
  const unique = [...new Set(entries)];
  return unique.length === 1 ? unique[0] : unique;
}

function result(label, data) {
  return { label, data };
}

async function handleServer(interaction, api) {
  const sub = interaction.options.getSubcommand();
  if (sub === 'status') return result('PalDefender status', await api.get(`${API}/version`));
  if (sub === 'broadcast') {
    return result(
      'Broadcast sent',
      await api.post(`${API}/Broadcast`, { Message: interaction.options.getString('message', true) }),
    );
  }
  if (sub === 'alert') {
    return result(
      'Alert sent',
      await api.post(`${API}/Alert`, { Message: interaction.options.getString('message', true) }),
    );
  }
  if (sub === 'reload') {
    return result('PalDefender configuration reloaded', await api.post(`${API}/ReloadConfig`));
  }
  throw new UserInputError('Unknown server subcommand.');
}

async function handlePlayer(interaction, api) {
  const sub = interaction.options.getSubcommand();
  if (sub === 'list') return result('Known players', await api.get(`${API}/players`));

  if (sub === 'message') {
    const targets = parseTargets(interaction.options.getString('targets', true));
    const body = {
      SendType: interaction.options.getString('send_type', true),
      Message: interaction.options.getString('message', true),
      ...(targets.length === 1 ? { UserID: targets[0] } : { UserIDs: targets }),
    };
    return result('Player message sent', await api.post(`${API}/SendPlayerMessage`, body));
  }

  const player = pathValue(interaction.options.getString('player', true));
  const routes = {
    info: ['player', 'Player'],
    items: ['items', 'Player items'],
    pals: ['pals', 'Player Pals'],
    techs: ['techs', 'Player technologies'],
    progression: ['progression', 'Player progression'],
  };
  const route = routes[sub];
  if (!route) throw new UserInputError('Unknown player subcommand.');
  return result(route[1], await api.get(`${API}/${route[0]}/${player}`));
}

async function handleModeration(interaction, api) {
  const sub = interaction.options.getSubcommand();
  const reason = interaction.options.getString('reason');

  if (sub === 'kick') {
    const player = pathValue(interaction.options.getString('player', true));
    return result('Player kicked', await api.post(`${API}/kick/${player}`, compactObject([['Reason', reason]])));
  }
  if (sub === 'ban') {
    const player = pathValue(interaction.options.getString('player', true));
    const banIp = interaction.options.getBoolean('ban_resolved_ip');
    return result(
      'Player banned',
      await api.post(`${API}/ban/${player}`, compactObject([['Reason', reason], ['IP', banIp]])),
    );
  }
  if (sub === 'ban-ip') {
    const ip = pathValue(interaction.options.getString('ip', true));
    const userId = interaction.options.getString('user_id');
    return result(
      'IP banned',
      await api.post(`${API}/banip/${ip}`, compactObject([['Reason', reason], ['UserId', userId]])),
    );
  }
  if (sub === 'unban') {
    const userId = pathValue(interaction.options.getString('user_id', true));
    return result('User unbanned', await api.post(`${API}/unban/${userId}`, compactObject([['Reason', reason]])));
  }
  if (sub === 'unban-ip') {
    const ip = pathValue(interaction.options.getString('ip', true));
    return result('IP unbanned', await api.post(`${API}/unbanip/${ip}`, compactObject([['Reason', reason]])));
  }
  if (sub === 'ban-list') {
    const query = compactObject([
      ['active', interaction.options.getBoolean('active')],
      ['entryType', interaction.options.getString('entry_type')],
      ['userId', interaction.options.getString('user_id')],
      ['ip', interaction.options.getString('ip')],
      ['issuerType', interaction.options.getString('issuer_type')],
      ['issuerName', interaction.options.getString('issuer_name')],
      ['issuerIP', interaction.options.getString('issuer_ip')],
      ['reason', interaction.options.getString('reason')],
      ['q', interaction.options.getString('query')],
    ]);
    return result('Ban records', await api.get(`${API}/banlist`, query));
  }
  throw new UserInputError('Unknown moderation subcommand.');
}

async function handleGive(interaction, api) {
  const sub = interaction.options.getSubcommand();
  const player = pathValue(interaction.options.getString('player', true));

  if (sub === 'item') {
    const body = {
      Items: [{
        ItemID: interaction.options.getString('item_id', true),
        Count: interaction.options.getInteger('count', true),
      }],
    };
    return result('Item granted', await api.post(`${API}/give/items/${player}`, body));
  }
  if (sub === 'pal') {
    const body = {
      Pals: [{
        PalID: interaction.options.getString('pal_id', true),
        Level: interaction.options.getInteger('level', true),
      }],
    };
    return result('Pal granted', await api.post(`${API}/give/pals/${player}`, body));
  }
  if (sub === 'pal-template') {
    const body = { PalTemplates: [interaction.options.getString('template', true)] };
    return result('Pal template granted', await api.post(`${API}/give/paltemplate/${player}`, body));
  }
  if (sub === 'pal-egg') {
    const palId = interaction.options.getString('pal_id');
    const template = interaction.options.getString('template');
    if ((!palId && !template) || (palId && template)) {
      throw new UserInputError('Choose exactly one of pal_id or template.');
    }
    const egg = compactObject([
      ['EggID', interaction.options.getString('egg_id', true)],
      ['PalID', palId],
      ['PalTemplate', template],
      ['Level', interaction.options.getInteger('level')],
    ]);
    return result('Pal egg granted', await api.post(`${API}/give/paleggs/${player}`, { PalEggs: [egg] }));
  }
  if (sub === 'progression') {
    const exp = interaction.options.getInteger('exp');
    const technologyPoints = interaction.options.getInteger('technology_points');
    const ancientTechnologyPoints = interaction.options.getInteger('ancient_technology_points');
    const relicType = interaction.options.getString('relic_type');
    const relicAmount = interaction.options.getInteger('relic_amount');
    if (Boolean(relicType) !== Boolean(relicAmount)) {
      throw new UserInputError('relic_type and relic_amount must be provided together.');
    }
    const body = compactObject([
      ['EXP', exp],
      ['TechnologyPoints', technologyPoints],
      ['AncientTechnologyPoints', ancientTechnologyPoints],
      ['Relics', relicType ? { [relicType]: relicAmount } : null],
    ]);
    if (Object.keys(body).length === 0) {
      throw new UserInputError('Provide at least one progression value to grant.');
    }
    return result('Progression granted', await api.post(`${API}/give/progression/${player}`, body));
  }
  throw new UserInputError('Unknown give subcommand.');
}

async function handleTechnology(interaction, api) {
  const sub = interaction.options.getSubcommand();
  const player = pathValue(interaction.options.getString('player', true));
  const technology = parseTechnology(interaction.options.getString('technology', true));
  const route = sub === 'learn' ? 'learntech' : sub === 'forget' ? 'forgettech' : null;
  if (!route) throw new UserInputError('Unknown technology subcommand.');
  const label = sub === 'learn' ? 'Technology learned' : 'Technology forgotten';
  return result(label, await api.post(`${API}/${route}/${player}`, { Technology: technology }));
}

async function handleGuild(interaction, api) {
  const sub = interaction.options.getSubcommand();
  if (sub === 'list') return result('Known guilds', await api.get(`${API}/guilds`));
  if (sub === 'info') {
    const guildId = pathValue(interaction.options.getString('guild_id', true));
    return result('Guild details', await api.get(`${API}/guild/${guildId}`));
  }
  if (sub === 'delete-base') {
    if (interaction.options.getString('confirm', true) !== 'DELETE') {
      throw new UserInputError('Base deletion cancelled: confirm must be exactly DELETE.');
    }
    const baseCampId = pathValue(interaction.options.getString('base_camp_id', true));
    return result('Base deleted', await api.post(`${API}/deletebase/${baseCampId}`));
  }
  throw new UserInputError('Unknown guild subcommand.');
}

const handlers = new Map([
  ['server', handleServer],
  ['player', handlePlayer],
  ['moderation', handleModeration],
  ['give', handleGive],
  ['technology', handleTechnology],
  ['guild', handleGuild],
]);

async function executeCommand(interaction, api) {
  const handler = handlers.get(interaction.commandName);
  if (!handler) throw new UserInputError('Unknown command. Redeploy the slash commands and try again.');
  return handler(interaction, api);
}

module.exports = {
  UserInputError,
  commandData,
  executeCommand,
  parseTargets,
  parseTechnology,
};

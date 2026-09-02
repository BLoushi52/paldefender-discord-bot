'use strict';

const { PalDefenderApiError } = require('./api');
const { UserInputError } = require('./commands');
const { MAX_DISCORD_ATTACHMENT_BYTES } = require('./limits');

const INLINE_LIMIT = 1700;

function escapeMarkdown(value) {
  return String(value).replace(/([\\`*_{}\[\]()#+\-.!|>~])/g, '\\$1');
}

function brandHeader(branding, label) {
  return `**${escapeMarkdown(branding.name)} · ${escapeMarkdown(label)}**`;
}

function brandFooter(branding) {
  const items = [];
  if (branding.copyright) items.push(escapeMarkdown(branding.copyright));
  if (branding.supportUrl) items.push(`Support: <${branding.supportUrl}>`);
  return items.length ? `\n\n-# ${items.join(' · ')}` : '';
}

function json(value) {
  if (value === null || value === undefined || value === '') return '{\n  "Success": true\n}';
  if (typeof value === 'string') return JSON.stringify({ Response: value }, null, 2);
  return JSON.stringify(value, null, 2);
}

function safeFilename(label) {
  const slug = label.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  return `${slug || 'paldefender-response'}.json`;
}

function reply(content, files) {
  return {
    content,
    allowedMentions: { parse: [] },
    ...(files ? { files } : {}),
  };
}

function attachment(value, prettyRendered, name) {
  let buffer = Buffer.from(prettyRendered, 'utf8');
  if (buffer.byteLength <= MAX_DISCORD_ATTACHMENT_BYTES) {
    return { attachment: buffer, name };
  }

  const compactRendered = typeof value === 'string'
    ? JSON.stringify({ Response: value })
    : JSON.stringify(value);
  buffer = Buffer.from(compactRendered, 'utf8');
  if (buffer.byteLength <= MAX_DISCORD_ATTACHMENT_BYTES) {
    return { attachment: buffer, name };
  }
  return null;
}

function resultReply({ label, data }, branding) {
  const rendered = json(data);
  const heading = brandHeader(branding, label);
  const footer = brandFooter(branding);
  if (heading.length + rendered.length + footer.length <= INLINE_LIMIT && !rendered.includes('```')) {
    return reply(`${heading}\n\n\`\`\`json\n${rendered}\n\`\`\`${footer}`);
  }

  const file = attachment(data, rendered, safeFilename(label));
  if (!file) {
    return reply(`${heading} — the response exceeded the safe Discord attachment limit.${footer}`);
  }
  return reply(`${heading} — the full response is attached.${footer}`, [file]);
}

function errorReply(error, branding) {
  const prefix = `**${escapeMarkdown(branding.name)} · `;
  const footer = brandFooter(branding);
  if (error instanceof UserInputError) {
    return reply(`${prefix}Command rejected:** ${escapeMarkdown(error.message)}${footer}`);
  }

  if (error instanceof PalDefenderApiError) {
    const status = error.status ? `HTTP ${error.status}` : 'request error';
    const code = error.code ? `, ${error.code}` : '';
    const heading = `${prefix}PalDefender failed (${escapeMarkdown(status)}${escapeMarkdown(code)}):** ${escapeMarkdown(error.message)}`;
    if (error.details === null || error.details === undefined) {
      return reply(`${heading}${footer}`);
    }

    const rendered = json(error.details);
    if (heading.length + rendered.length + footer.length < INLINE_LIMIT && !rendered.includes('```')) {
      return reply(`${heading}\n\n\`\`\`json\n${rendered}\n\`\`\`${footer}`);
    }
    const file = attachment(error.details, rendered, 'paldefender-error.json');
    if (!file) {
      return reply(`${heading}\n\nError details exceeded the safe Discord attachment limit.${footer}`);
    }
    return reply(`${heading}\n\nError details are attached.${footer}`, [file]);
  }

  return reply(`${prefix}Unexpected bot error.** Check the bot log for the audit event.${footer}`);
}

module.exports = { attachment, brandFooter, errorReply, escapeMarkdown, resultReply };

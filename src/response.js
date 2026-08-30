'use strict';

const { PalDefenderApiError } = require('./api');
const { UserInputError } = require('./commands');

const INLINE_LIMIT = 1700;

function escapeMarkdown(value) {
  return String(value).replace(/([\\`*_{}\[\]()#+\-.!|>~])/g, '\\$1');
}

function brandHeader(branding, label) {
  return `**${escapeMarkdown(branding.name)} · ${label}**`;
}

function brandFooter(branding) {
  const items = [];
  if (branding.copyright) items.push(escapeMarkdown(branding.copyright));
  if (branding.supportUrl) items.push(`[Support](${branding.supportUrl})`);
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

function resultReply({ label, data }, branding) {
  const rendered = json(data);
  const heading = brandHeader(branding, label);
  const footer = brandFooter(branding);
  if (heading.length + rendered.length + footer.length <= INLINE_LIMIT && !rendered.includes('```')) {
    return { content: `${heading}\n\n\`\`\`json\n${rendered}\n\`\`\`${footer}` };
  }

  return {
    content: `${heading} — the full response is attached.${footer}`,
    files: [{ attachment: Buffer.from(rendered, 'utf8'), name: safeFilename(label) }],
  };
}

function errorReply(error, branding) {
  const prefix = `**${escapeMarkdown(branding.name)} · `;
  const footer = brandFooter(branding);
  if (error instanceof UserInputError) {
    return { content: `${prefix}Command rejected:** ${error.message}${footer}` };
  }

  if (error instanceof PalDefenderApiError) {
    const status = error.status ? `HTTP ${error.status}` : 'request error';
    const code = error.code ? `, ${error.code}` : '';
    const heading = `${prefix}PalDefender failed (${status}${code}):** ${error.message}`;
    if (error.details === null || error.details === undefined) {
      return { content: `${heading}${footer}` };
    }

    const rendered = json(error.details);
    if (heading.length + rendered.length + footer.length < INLINE_LIMIT && !rendered.includes('```')) {
      return { content: `${heading}\n\n\`\`\`json\n${rendered}\n\`\`\`${footer}` };
    }
    return {
      content: `${heading}\n\nError details are attached.${footer}`,
      files: [{ attachment: Buffer.from(rendered, 'utf8'), name: 'paldefender-error.json' }],
    };
  }

  return {
    content: `${prefix}Unexpected bot error.** Check the bot log for the audit event.${footer}`,
  };
}

module.exports = { brandFooter, errorReply, escapeMarkdown, resultReply };

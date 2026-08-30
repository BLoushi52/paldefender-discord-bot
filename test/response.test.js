'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const { resultReply } = require('../src/response');

test('renders configurable brand, copyright, and support URL', () => {
  const reply = resultReply(
    { label: 'PalDefender status', data: { Version: '1.2.3' } },
    {
      name: 'Friend *Admin*',
      copyright: '© 2026 Friend Community',
      supportUrl: 'https://example.com/help',
    },
  );

  assert.match(reply.content, /Friend \\\*Admin\\\*/);
  assert.match(reply.content, /© 2026 Friend Community/);
  assert.match(reply.content, /\[Support\]\(https:\/\/example\.com\/help\)/);
});

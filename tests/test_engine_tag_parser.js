'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const parser = require('../engine_tag_parser.js');

const spec = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'engine_tag_aliases_v1.json'), 'utf8'));
const cases = [
  ['Серце', '❤', 'heart'],
  ['Книги', '📚', 'study'],
  ['Сукня', '👗', 'new_clothes'],
  ['Таблетка', '💊', 'med'],
  ['Хрест', '⊕', 'plus'],
  ['Гучномовець', '📢', 'advert'],
  ['Зелена печатка', '🟢', 'luck'],
  ['Мішень', '🎯', 'goal'],
  ['Вінаяка', 'Ганеша', 'ganesh'],
  ['Шприц', '💉', 'med'],
];

for (const [verbal, symbolic, token] of cases) {
  assert.deepEqual(parser.parseTagTokens(verbal, spec), [token]);
  assert.deepEqual(parser.parseTagTokens(symbolic, spec), [token]);
}

assert.deepEqual(parser.parseTagTokens('День порожні руки', spec), ['bolt']);
assert.deepEqual(parser.parseTagTokens('Таблетка 💊 Шприц 💉', spec), ['med']);
assert.deepEqual(parser.parseTagTokens('СЕРЦЕ + книги', spec), ['heart', 'study']);

const booleanView = parser.parseTagsObject('Серце, Мішень', spec);
assert.equal(booleanView.heart, true);
assert.equal(booleanView.goal, true);
assert.equal(booleanView.bolt, false);

console.log('engine_tag_parser.js: all assertions passed');

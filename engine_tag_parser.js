/* Post-freeze canonical tag parser for dashboard/validator use.
 *
 * No aliases are duplicated here: callers pass the shared
 * engine_tag_aliases_v1.json object or load it through loadAliasSpec().
 */
(function attachEngineTagParser(root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.EngineTagParser = api;
}(typeof globalThis !== 'undefined' ? globalThis : this, function buildParser() {
  'use strict';

  function normalizeTagText(value) {
    return String(value == null ? '' : value)
      .normalize('NFKC')
      .toLocaleLowerCase('uk-UA')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function assertSpec(spec) {
    if (!spec || typeof spec !== 'object' || !spec.tokens || typeof spec.tokens !== 'object') {
      throw new TypeError("Alias spec must contain a 'tokens' object");
    }
    return spec;
  }

  function parseTagTokens(value, spec) {
    const activeSpec = assertSpec(spec);
    const normalized = normalizeTagText(value);
    if (!normalized) return [];

    const parsed = [];
    for (const [token, config] of Object.entries(activeSpec.tokens)) {
      if (!config || !Array.isArray(config.aliases) || config.aliases.length === 0) {
        throw new TypeError(`Token ${token} has no aliases`);
      }

      const excludes = Array.isArray(config.exclude_if_any) ? config.exclude_if_any : [];
      if (excludes.some((item) => normalized.includes(normalizeTagText(item)))) continue;

      if (config.aliases.some((alias) => normalized.includes(normalizeTagText(alias)))) {
        parsed.push(token);
      }
    }
    return parsed.sort();
  }

  function parseTagsObject(value, spec) {
    const activeSpec = assertSpec(spec);
    const active = new Set(parseTagTokens(value, activeSpec));
    return Object.fromEntries(Object.keys(activeSpec.tokens).map((token) => [token, active.has(token)]));
  }

  async function loadAliasSpec(url = './engine_tag_aliases_v1.json') {
    if (typeof fetch !== 'function') throw new Error('fetch() is unavailable in this runtime');
    const response = await fetch(url, { cache: 'no-store' });
    if (!response.ok) throw new Error(`Alias spec load failed: HTTP ${response.status}`);
    return assertSpec(await response.json());
  }

  return Object.freeze({
    normalizeTagText,
    parseTagTokens,
    parseTagsObject,
    loadAliasSpec,
  });
}));

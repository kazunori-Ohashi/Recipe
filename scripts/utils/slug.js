'use strict';

function slugify(value, fallback = 'recipe') {
  if (!value || typeof value !== 'string') {
    return fallback;
  }
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase() || fallback;
}

module.exports = { slugify };

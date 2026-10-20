import { Game } from '../models/index.js';

export function slugify(text) {
  return String(text)
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60) || 'game';
}

/** A slug that no other game uses yet: `title`, `title-2`, `title-3`, ... */
export async function uniqueGameSlug(title) {
  const base = slugify(title);
  let slug = base;
  for (let n = 2; await Game.exists({ slug }); n += 1) slug = `${base}-${n}`;
  return slug;
}

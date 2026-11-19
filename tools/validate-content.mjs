import { access, readFile, readdir } from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();
const content = path.join(root, 'content/projects');
const dist = path.join(root, 'dist');
const records = (await Promise.all((await readdir(content)).filter(file => file.endsWith('.json'))
  .map(async file => ({ file, value: JSON.parse(await readFile(path.join(content, file), 'utf8')) }))));
const errors = [];
const slugs = new Set();
for (const { file, value } of records) {
  if (!value.slug || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value.slug)) errors.push(`${file}: invalid slug`);
  if (slugs.has(value.slug)) errors.push(`${file}: duplicate slug ${value.slug}`);
  slugs.add(value.slug);
  if (!value.title?.trim()) errors.push(`${file}: missing title`);
  if (!value.category?.trim()) errors.push(`${file}: missing category`);
  if (!value.summary?.trim()) errors.push(`${file}: missing short description`);
  for (const image of [value.cover, ...(value.gallery ?? []).map(item => item.image)].filter(Boolean)) {
    if (/^https?:/i.test(image)) continue;
    const relative = image.split(/[?#]/, 1)[0].replace(/^\//, '').replace(/^\.\.\//, '');
    try { await access(path.join(root, relative)); } catch { errors.push(`${file}: image does not exist: ${image}`); }
  }
  for (const match of String(value.body ?? '').matchAll(/<img\b[^>]*\bsrc="([^"]+)"/gi)) {
    const image = match[1];
    if (/^(?:https?:|data:|\/\/)/i.test(image)) continue;
    const relative = image.split(/[?#]/, 1)[0].replace(/^\.\.\//, '').replace(/^\//, '');
    try { await access(path.join(root, relative)); } catch { errors.push(`${file}: body image does not exist: ${image}`); }
  }
  try { await access(path.join(dist, 'projects', `${value.slug}.html`)); } catch { errors.push(`${file}: generated project page is missing`); }
}
const homepage = await readFile(path.join(dist, 'index.html'), 'utf8').catch(() => '');
if (!homepage) errors.push('generated homepage is missing');
for (const { value } of records.filter(record => record.value.published !== false)) {
  if (!homepage.includes(`projects/${value.slug}.html`)) errors.push(`${value.slug}: missing from homepage directory`);
}
if (errors.length) {
  console.error(errors.join('\n'));
  process.exitCode = 1;
} else {
  console.log(`Validated ${records.length} project records, generated pages, homepage links, and local image paths.`);
}

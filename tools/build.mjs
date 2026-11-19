import { cp, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();
const output = path.join(root, 'dist');
const contentDir = path.join(root, 'content/projects');
const categories = [
  { name: 'Water Features', label: 'Water features', id: 'directory-water' },
  { name: 'Retail & Spatial', label: 'Retail & spatial', id: 'directory-spatial' },
  { name: 'Exhibitions & Experiential', label: 'Exhibitions & experiential', id: 'directory-experiential' },
  { name: 'Product Design', label: 'Product design', id: 'directory-product' },
  { name: 'Digital Tools', label: 'Digital tools', id: 'directory-digital' },
];

const escape = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
const htmlToText = value => String(value ?? '').replace(/<[^>]*>/g, ' ').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();
const siteAsset = (src, pageDepth) => {
  if (!src) return '';
  if (/^(?:https?:|data:|\/\/|#)/i.test(src)) return src;
  const normalized = src.replace(/^\.\.\//, '').replace(/^\//, '');
  return `${pageDepth ? '../' : ''}${normalized}`;
};

function markdownToHtml(source) {
  const lines = String(source ?? '').replace(/\r\n/g, '\n').split('\n');
  const output = [];
  let paragraph = [];
  let list = '';
  const inline = value => value
    .replace(/&(?!(?:#\d+|#x[\da-f]+|[a-z][\da-z]+);)/gi, '&amp;')
    .replace(/!\[([^\]]*)\]\(([^\s)]+)(?:\s+"([^"]*)")?\)/g, (_, alt, url, title) => `<img src="${escape(url)}" alt="${escape(alt)}"${title ? ` title="${escape(title)}"` : ''} loading="lazy">`)
    .replace(/\[([^\]]+)\]\(([^\s)]+)(?:\s+"([^"]*)")?\)/g, (_, label, url, title) => `<a href="${escape(url)}"${title ? ` title="${escape(title)}"` : ''}>${label}</a>`)
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>').replace(/\*([^*]+)\*/g, '<em>$1</em>')
    .replace(/`([^`]+)`/g, '<code>$1</code>');
  const flushParagraph = () => { if (paragraph.length) { output.push(`<p>${inline(paragraph.join(' '))}</p>`); paragraph = []; } };
  const flushList = () => { if (list) { output.push(`</${list}>`); list = ''; } };
  for (const line of lines) {
    if (/^\s*<\w[\s\S]*>\s*$/.test(line) || /^\s*<\//.test(line)) {
      flushParagraph(); flushList(); output.push(line); continue;
    }
    if (!line.trim()) { flushParagraph(); flushList(); continue; }
    const heading = line.match(/^(#{1,6})\s+(.+)$/);
    if (heading) { flushParagraph(); flushList(); const level = heading[1].length; output.push(`<h${level}>${inline(heading[2])}</h${level}>`); continue; }
    const item = line.match(/^\s*[-*+]\s+(.+)$/);
    if (item) { flushParagraph(); if (list !== 'ul') { flushList(); output.push('<ul>'); list = 'ul'; } output.push(`<li>${inline(item[1])}</li>`); continue; }
    const numbered = line.match(/^\s*\d+\.\s+(.+)$/);
    if (numbered) { flushParagraph(); if (list !== 'ol') { flushList(); output.push('<ol>'); list = 'ol'; } output.push(`<li>${inline(numbered[1])}</li>`); continue; }
    flushList();
    // The imported pages use HTML fragments to preserve their hand-authored layouts.
    if (/<(?:figure|section|div|a|img|p|h[1-6]|ul|ol|blockquote)\b/i.test(line)) { flushParagraph(); output.push(line); }
    else paragraph.push(line.trim());
  }
  flushParagraph(); flushList();
  return output.join('\n');
}

function replaceInnerDiv(html, className, replacement) {
  const opening = `<div class="${className}">`;
  const start = html.indexOf(opening);
  if (start < 0) throw new Error(`Could not find ${opening} in index.html`);
  let depth = 0;
  const token = /<div\b[^>]*>|<\/div\s*>/gi;
  token.lastIndex = start;
  let match;
  let end;
  while ((match = token.exec(html))) {
    if (/^<div\b/i.test(match[0])) depth++;
    else if (--depth === 0) { end = token.lastIndex; break; }
  }
  if (!end) throw new Error(`Could not find closing div for ${className}`);
  return html.slice(0, start) + replacement + html.slice(end);
}

const records = (await Promise.all((await readdir(contentDir)).filter(file => file.endsWith('.json'))
  .map(async file => JSON.parse(await readFile(path.join(contentDir, file), 'utf8')))))
  .filter(record => record.published !== false)
  .sort((a, b) => (a.order ?? 999) - (b.order ?? 999) || a.title.localeCompare(b.title));

await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });
await cp(path.join(root, 'assets'), path.join(output, 'assets'), { recursive: true });
await cp(path.join(root, 'admin'), path.join(output, 'admin'), { recursive: true });
await cp(path.join(root, 'style.css'), path.join(output, 'style.css'));
await cp(path.join(root, 'project.css'), path.join(output, 'project.css'));

let index = await readFile(path.join(root, 'index.html'), 'utf8');
const groups = categories.map((category, index) => {
  const projects = records.filter(record => record.category === category.name);
  if (!projects.length) return '';
  return `<section class="directory-group"${index === 0 ? ' id="water-projects"' : ''} aria-labelledby="${category.id}"><div class="directory-group-head"><span>${String(index + 1).padStart(2, '0')}</span><h3 id="${category.id}">${escape(category.label)}</h3></div><ul>${projects.map(project => `<li><a href="projects/${escape(project.slug)}.html">${escape(project.directoryTitle || project.title)} <span>↗</span></a></li>`).join('')}</ul></section>`;
}).join('');
index = replaceInnerDiv(index, 'directory-grid', `<div class="directory-grid">${groups}</div>`);
index = index.replace(/PORTFOLIO DIRECTORY · \d+ PROJECTS/, `PORTFOLIO DIRECTORY · ${records.length} PROJECTS`);
await writeFile(path.join(output, 'index.html'), index);

for (const project of records) {
  const title = escape(project.title);
  const titleLines = (project.titleLines ?? []).map(line => String(line).trim()).filter(Boolean);
  const displayTitle = titleLines.join(' ') === project.title ? titleLines.map(escape).join('<br>') : title;
  const description = escape(project.summary || project.title);
  const coverPath = siteAsset(project.cover, true);
  let body = markdownToHtml(project.body ?? '');
  if (project.cover) {
    const firstImage = /(<img\b[^>]*\bsrc=")[^"]+("[^>]*>)/i;
    if (firstImage.test(body)) body = body.replace(firstImage, `$1${escape(coverPath)}$2`);
    else body = `<figure class="project-media project-hero"><img src="${escape(coverPath)}" alt="${title}" loading="lazy"></figure>${body}`;
  }
  body = body.replace(/\bsrc="\/(assets\/[^\"]+)"/g, 'src="../$1"')
    .replace(/\bhref="\/(assets\/[^\"]+)"/g, 'href="../$1"');
  const addedGallery = (project.gallery ?? []).map(image => `<figure class="project-media"><img src="${escape(siteAsset(image.image, true))}" alt="${escape(image.alt)}" loading="lazy"><figcaption>${image.caption ? `<span>${escape(image.caption)}</span>` : ''}${image.detail ? `<span>${escape(image.detail)}</span>` : ''}</figcaption></figure>`);
  if (addedGallery.length) {
    const next = body.search(/<a class="project-next"/i);
    const addition = `<div class="project-grid project-grid--gallery">${addedGallery.join('')}</div>`;
    body = next < 0 ? `${body}${addition}` : `${body.slice(0, next)}${addition}${body.slice(next)}`;
  }
  const backHref = project.backHref || '../index.html#projects';
  const back = escape(backHref.startsWith('/') ? `../${backHref.slice(1)}` : backHref);
  const tags = (project.tags ?? []).map(tag => `<span>${escape(tag)}</span>`).join('');
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title} — Gerald Onde Ong</title><meta name="description" content="${description}"><link rel="stylesheet" href="../style.css?v=20261112-digital"><link rel="stylesheet" href="../project.css"></head><body class="project-page"><main class="project-shell"><a class="project-back" href="${back}">${escape(project.backLabel || '← BACK TO THE PORTFOLIO DIRECTORY')}</a><div class="project-heading"><p class="project-kicker">${escape(project.kicker || project.category)}</p><h1 class="project-title">${displayTitle}</h1><div class="project-meta">${tags}</div></div><p class="project-lead">${escape(project.summary)}</p>${body}</main></body></html>`;
  await mkdir(path.join(output, 'projects'), { recursive: true });
  await writeFile(path.join(output, 'projects', `${project.slug}.html`), html);
}
console.log(`Built ${records.length} projects into dist/`);

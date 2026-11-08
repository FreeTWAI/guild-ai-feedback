import {readFile, mkdir, writeFile, copyFile} from 'node:fs/promises';
import {resolve, dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';

const actions = ['skills', 'tools', 'work', 'information'];
const text = (value, maximum) => typeof value === 'string' && value.trim().length > 0 && value.length <= maximum && !/[\u0000-\u001f\u007f]/.test(value);
const exact = (value, keys) => value && typeof value === 'object' && !Array.isArray(value) && Object.keys(value).length === keys.length && keys.every(key => Object.hasOwn(value, key));
export function validateWorkspace(value) {
  if (!exact(value, ['schema_version', 'guild_key', 'name', 'repository', 'headline', 'purpose', 'outcome', 'steps'])
    || value.schema_version !== 'freedom.guild-workspace/v1'
    || typeof value.guild_key !== 'string' || !/^guild_[a-z0-9_]{1,80}$/.test(value.guild_key)
    || typeof value.repository !== 'string' || !/^FreeTWAI\/guild-[a-z0-9-]{1,80}$/.test(value.repository)
    || !text(value.name, 120) || !text(value.headline, 160) || !text(value.purpose, 1200) || !text(value.outcome, 200)
    || !Array.isArray(value.steps) || value.steps.length < 2 || value.steps.length > 5
    || value.steps.some(step => !exact(step, ['title', 'detail', 'action']) || !text(step.title, 100) || !text(step.detail, 300) || !actions.includes(step.action))) {
    throw new Error('Invalid workspace.json');
  }
  return value;
}
export const escapeHtml = value => String(value).replace(/[&<>"']/g, char => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[char]));
const href = (workspace, action) => `https://freetwai.com/#guilds/${workspace.guild_key}/${action}`;
export function renderWorkspace(workspace) {
  validateWorkspace(workspace);
  const e = escapeHtml;
  return `<!doctype html>
<html lang="zh-Hant" data-theme="light"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="referrer" content="no-referrer"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'self'; style-src 'self'; img-src 'self'; connect-src 'none'; base-uri 'none'; form-action 'none'">
<title>${e(workspace.name)} · 自由工坊</title><meta name="description" content="${e(workspace.purpose)}"><link rel="stylesheet" href="./style.css"><script src="./site.js" defer></script></head>
<body><main id="workspace"><header class="standalone-header"><a href="https://freetwai.com/" aria-label="自由工坊"><img src="./brand.png" width="132" height="44" alt="自由工坊"></a><span>${e(workspace.name)}</span></header>
<section class="intro"><p class="eyebrow">從想法到成果</p><h1>${e(workspace.headline)}</h1><p class="purpose">${e(workspace.purpose)}</p>
<div class="actions"><a class="button primary" data-action="work" href="${href(workspace, 'work')}">進入工作區 <span aria-hidden="true">↗</span></a><a class="button secondary" data-action="skills" href="${href(workspace, 'skills')}">閱讀技能書</a></div></section>
<ol class="journey" aria-label="公會實作流程">${workspace.steps.map((step, index) => `<li><span class="step-number" aria-hidden="true">0${index + 1}</span><h2>${e(step.title)}</h2><p>${e(step.detail)}</p><a data-action="${step.action}" href="${href(workspace, step.action)}">${({skills: '開啟技能書', tools: '查看可用工具', work: '開啟我的工作', information: '閱讀公會資訊'})[step.action]} <span aria-hidden="true">→</span></a></li>`).join('')}</ol>
<aside class="outcome"><span class="outcome-icon" aria-hidden="true">✦</span><div><p class="eyebrow">這次留下的成果</p><p>${e(workspace.outcome)}</p></div></aside>
<footer class="standalone-footer"><a href="https://github.com/${workspace.repository}">參與編修</a><span id="release"></span></footer></main></body></html>`;
}
export async function build(root = process.cwd(), sourceSha) {
  const workspace = validateWorkspace(JSON.parse(await readFile(resolve(root, 'workspace.json'), 'utf8')));
  const sha = sourceSha ?? execFileSync('git', ['rev-parse', 'HEAD'], {cwd: root, encoding: 'utf8'}).trim();
  if (!/^[a-f0-9]{40}$/.test(sha)) throw new Error('Expected an exact source SHA');
  const output = resolve(root, 'dist');
  await mkdir(output, {recursive: true});
  const serialized = JSON.stringify(workspace).replaceAll('<', '\\u003c').replaceAll('\u2028', '\\u2028').replaceAll('\u2029', '\\u2029');
  await writeFile(resolve(output, 'index.html'), renderWorkspace(workspace));
  await writeFile(resolve(output, 'site.js'), `const workspace = ${serialized};\nconst sourceSha = ${JSON.stringify(sha)};\n` + await readFile(resolve(root, 'src/site.js'), 'utf8'));
  await copyFile(resolve(root, 'src/style.css'), resolve(output, 'style.css'));
  await copyFile(resolve(root, 'brand.png'), resolve(output, 'brand.png'));
  await writeFile(resolve(output, '.nojekyll'), '');
  await writeFile(resolve(output, 'release.json'), JSON.stringify({schema_version: 'freedom.guild-release/v1', guild_key: workspace.guild_key, repository: workspace.repository, source_sha: sha, bridge: 'freedom.guild-launchpad/v1'}) + '\n');
  return output;
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await build(resolve(dirname(fileURLToPath(import.meta.url)), '..'), process.env.GUILD_SOURCE_SHA);
}

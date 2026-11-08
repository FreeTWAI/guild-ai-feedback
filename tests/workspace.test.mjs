import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {validateWorkspace, renderWorkspace} from '../scripts/build.mjs';
const workspace = JSON.parse(await readFile(new URL('../workspace.json', import.meta.url), 'utf8'));

test('workspace renders its real guild, workflow, and platform destinations', () => {
  validateWorkspace(workspace);
  if (process.env.GITHUB_REPOSITORY) assert.equal(workspace.repository, process.env.GITHUB_REPOSITORY);
  const html = renderWorkspace(workspace);
  assert.ok(html.includes(`<title>${workspace.name}`));
  for (const step of workspace.steps) assert.ok(html.includes(`https://freetwai.com/#guilds/${workspace.guild_key}/${step.action}`));
  assert.equal((html.match(/<h1>/g) ?? []).length, 1);
  assert.ok(html.includes("connect-src 'none'"));
});
test('HTML content is escaped and cannot install scripts or links', () => {
  const html = renderWorkspace({...workspace, headline: '<script>alert(1)</script>', outcome: '" onload="run()', steps: workspace.steps.map(step => ({...step, title: '<img src=x onerror=run()>'}))});
  assert.ok(html.includes('&lt;script&gt;')); assert.ok(!html.includes('<script>alert'));
  assert.ok(!html.includes('<img src=x')); assert.ok(html.includes('&quot; onload=&quot;run()'));
});
test('unsupported contracts, arbitrary URLs, commands, private fields, and oversized content fail', () => {
  for (const value of [null, [], {...workspace, schema_version: 'v2'}, {...workspace, token: 'not-a-secret'}, {...workspace, guild_key: '../outside'}, {...workspace, repository: 'attacker/guild-x'}, {...workspace, purpose: 'a'.repeat(1201)}, {...workspace, steps: [{title: 'test', detail: 'test', action: 'https://example.com'}]}, {...workspace, steps: workspace.steps.map(step => ({...step, action: 'join'}))}]) assert.throws(() => validateWorkspace(value));
});

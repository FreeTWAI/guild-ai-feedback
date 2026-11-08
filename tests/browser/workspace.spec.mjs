import {test, expect} from '@playwright/test';
import {readFile} from 'node:fs/promises';
const workspace = JSON.parse(await readFile(new URL('../../workspace.json', import.meta.url), 'utf8'));
for (const theme of ['light', 'night', 'versefolk']) for (const width of [390, 1440]) {
  test(`${theme} ${width}: readable workflow and working destinations`, async ({page}) => {
    const errors = []; page.on('pageerror', error => errors.push(error.message));
    await page.setViewportSize({width, height: 1000}); await page.goto('/');
    await page.evaluate(theme => {document.documentElement.dataset.theme = theme;}, theme);
    await expect(page.getByRole('heading', {level: 1})).toHaveText(workspace.headline);
    await expect(page.getByRole('list', {name: '公會實作流程'}).locator('li')).toHaveCount(workspace.steps.length);
    await expect(page.getByRole('link', {name: '進入工作區'})).toHaveAttribute('href', `https://freetwai.com/#guilds/${workspace.guild_key}/work`);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    const heights = await page.locator('[data-action]:visible').evaluateAll(elements => elements.map(element => element.getBoundingClientRect().height));
    expect(Math.min(...heights)).toBeGreaterThanOrEqual(44);
    expect(errors).toEqual([]);
  });
}

test('sandbox bridge uses the pinned protocol and sends navigation without private data', async ({page}) => {
  const siteUrl = `https://freetwai.github.io/${workspace.repository.split('/')[1]}/`;
  await page.route('https://freetwai.com/__guild-fixture', route => route.fulfill({contentType: 'text/html', body: '<!doctype html><html><body><main></main></body></html>'}));
  await page.route(`${siteUrl}**`, async route => {
    const file = route.request().url().slice(siteUrl.length) || 'index.html';
    const types = {'index.html': 'text/html', 'site.js': 'text/javascript', 'style.css': 'text/css', 'brand.png': 'image/png'};
    if (!Object.hasOwn(types, file)) return route.abort();
    await route.fulfill({contentType: types[file], body: await readFile(new URL(`../../dist/${file}`, import.meta.url)), headers: {'access-control-allow-origin': '*'}});
  });
  await page.goto('https://freetwai.com/__guild-fixture');
  await page.evaluate(({guildKey, siteUrl}) => {
    const channel = 'b5be8af2-2e86-4208-b488-c7c9f1b84512';
    window.messages = [];
    const frame = document.createElement('iframe');
    frame.title = 'workspace'; frame.setAttribute('sandbox', 'allow-scripts');
    window.addEventListener('message', event => {if (event.source === frame.contentWindow && event.origin === 'null') window.messages.push(event.data);});
    frame.onload = () => frame.contentWindow.postMessage({protocol: 'freedom.guild-launchpad/v1', type: 'init', channel, guildKey, theme: 'light', actions: ['work', 'skills', 'tools', 'information']}, '*');
    frame.src = siteUrl; document.querySelector('main').append(frame);
  }, {guildKey: workspace.guild_key, siteUrl});
  await expect.poll(() => page.evaluate(() => window.messages.some(message => message.type === 'ready'))).toBe(true);
  await page.frameLocator('iframe').getByRole('link', {name: '進入工作區'}).click();
  await expect.poll(() => page.evaluate(() => window.messages.filter(message => message.type === 'navigate'))).toEqual([{protocol: 'freedom.guild-launchpad/v1', type: 'navigate', channel: 'b5be8af2-2e86-4208-b488-c7c9f1b84512', guildKey: workspace.guild_key, action: 'work'}]);
  expect(new URL(page.url()).pathname).toBe('/__guild-fixture');
});

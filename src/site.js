'use strict';
(() => {
  const protocol = 'freedom.guild-launchpad/v1';
  const actions = ['work', 'skills', 'tools', 'information'];
  const embedded = window.parent !== window;
  let connection = null;
  let lastHeight = 0;
  function send(message) {
    if (connection) window.parent.postMessage({protocol, channel: connection.channel, guildKey: workspace.guild_key, ...message}, connection.origin);
  }
  function resize() {
    const height = Math.max(240, Math.min(1600, Math.ceil(document.querySelector('main').getBoundingClientRect().height + 32)));
    if (height !== lastHeight) {lastHeight = height; send({type: 'resize', height});}
  }
  if (embedded) {
    document.documentElement.dataset.embedded = 'true';
    // The surrounding platform owns the page h1.
    const heading = document.querySelector('h1');
    const replacement = document.createElement('h2');
    replacement.className = 'headline'; replacement.textContent = heading.textContent; heading.replaceWith(replacement);
    window.addEventListener('message', event => {
      if (event.source !== window.parent || !['https://freetwai.com', 'https://staging.freetwai.com'].includes(event.origin)
        && !/^http:\/\/(?:127\.0\.0\.1|localhost):\d{1,5}$/.test(event.origin)) return;
      const value = event.data;
      if (!value || typeof value !== 'object' || Array.isArray(value) || Object.keys(value).sort().join(',') !== 'actions,channel,guildKey,protocol,theme,type'
        || value.protocol !== protocol || value.type !== 'init' || value.guildKey !== workspace.guild_key
        || typeof value.channel !== 'string' || !/^[a-f0-9-]{36}$/.test(value.channel)
        || !['light', 'night', 'versefolk'].includes(value.theme)
        || !Array.isArray(value.actions) || value.actions.length > 4 || value.actions.some(action => !actions.includes(action))) return;
      connection = {origin: event.origin, channel: value.channel, actions: value.actions};
      document.documentElement.dataset.theme = value.theme;
      document.querySelectorAll('[data-action]').forEach(link => {link.hidden = !value.actions.includes(link.dataset.action);});
      send({type: 'ready'}); lastHeight = 0; resize();
    });
    document.addEventListener('click', event => {
      const link = event.target.closest?.('[data-action]');
      if (!link) return;
      event.preventDefault();
      if (event.isTrusted && connection?.actions.includes(link.dataset.action)) send({type: 'navigate', action: link.dataset.action});
    });
    new ResizeObserver(resize).observe(document.querySelector('main'));
  }
  document.querySelector('#release').textContent = `版本 ${sourceSha.slice(0, 8)}`;
})();

'use strict';

const observe = () => {
  if (location.href.includes('/watch?') === false) {
    return;
  }
  const player = document.querySelector('.html5-video-player');
  if (!player) {
    return;
  }
  if (observe.busy) {
    return;
  }

  const svgns = 'http://www.w3.org/2000/svg';
  const settings = player.querySelector('.ytp-settings-button');

  const oldUI = !!settings.querySelector('svg[height="100%"]');

  const boost = player.querySelector('.ytp-boost-button');
  if (settings && !boost) {
    observe.busy = true;
    chrome.storage.local.get({
      'boost': 2,
      'position': '.ytp-settings-button',
      'button': true
    }, prefs => {
      const msg = `Boost volume NNx (%%)

- Use Shift + Click to adjust boosting level or assign keyboard shortcuts from the extensions manager
- Use Meta + Click or Ctrl + Click to adjust button's position`;
      const boost = Object.assign(settings.cloneNode(true), {
        textContent: '',
        style: '',
        title: msg.replace('NN', prefs.boost).replace('%%', 'disabled')
      });
      boost.classList.replace('ytp-settings-button', 'ytp-boost-button');
      if (prefs.button === false) {
        boost.classList.add('hidden');
      }

      const svg = document.createElementNS(svgns, 'svg');
      if (oldUI) {
        svg.setAttribute('height', '100%');
        svg.style.scale = '50%';
      }
      else {
        svg.setAttribute('height', '24');
      }
      svg.setAttribute('version', '1.1');
      svg.setAttribute('viewBox', '0 0 24 24');

      const rect = document.createElementNS(svgns, 'rect');
      rect.setAttribute('fill-opacity', '0.3');

      const update = v => {
        const wide = v.toString().includes('.');
        text.style['font-size'] = wide ? '10px' : '14px';
        text.textContent = v + 'x';
      };

      rect.setAttribute('width', 24);
      rect.setAttribute('x', 0);
      rect.setAttribute('y', 2);
      rect.setAttribute('rx', 1.5);
      rect.setAttribute('ry', 1.5);
      rect.setAttribute('height', 20);
      rect.setAttribute('id', 'ytp-bv-1');
      const text = document.createElementNS(svgns, 'text');
      text.setAttribute('x', 12);
      text.setAttribute('y', 12);
      text.setAttribute('dominant-baseline', 'middle');
      text.setAttribute('text-anchor', 'middle');
      text.setAttribute('fill', '#d0d0d0');
      update(prefs.boost);

      svg.append(rect, text);
      boost.append(svg);
      const e = player.querySelector(prefs.position);
      if (e) {
        e.insertAdjacentElement('beforebegin', boost);
      }
      else {
        settings.insertAdjacentElement('beforebegin', boost);
      }
      observe.busy = false;

      boost.addEventListener('click', e => {
        e.preventDefault();
        e.stopPropagation();

        if (e.detail && e.detail.method === 'change-boost') {
          prefs.boost = e.detail.boost;
          update(prefs.boost);
        }

        if (e.shiftKey) {
          const v = prompt('Insert the new boosting level from 0 to 4 (e.g. 1.5)', prefs.boost)?.trim();
          const vn = Math.round(parseFloat(v) * 10) / 10;

          if (vn > 0 && vn <= 4) {
            prefs.boost = vn;
            chrome.storage.local.set({
              boost: prefs.boost
            });
            chrome.runtime.sendMessage({
              method: 'adjust_boost',
              boost: prefs.boost
            });
            update(vn);
          }

          return;
        }
        else if (e.metaKey || e.ctrlKey) {
          const position = prompt(
            'Move the button before the following button (e.g. .ytp-time-display)',
            prefs.position
          ) || '.ytp-settings-button';
          if (position) {
            const e = document.querySelector(position);
            if (e) {
              e.insertAdjacentElement('beforebegin', boost);
              chrome.storage.local.set({
                position
              });
            }
          }
          return;
        }
        // toggle on and off
        if (rect.hasAttribute('fill-opacity')) { // disabled
          chrome.runtime.sendMessage({
            method: 'apply_boost'
          }, r => {
            if (r === true || r === 'true') {
              rect.removeAttribute('fill-opacity');
              text.setAttribute('fill', '#000');
              boost.title = msg.replace('NN', prefs.boost).replace('%%', 'enabled');
            }
            else {
              alert('Cannot boost this video: ' + r);
            }
          });
        }
        else { // enable
          chrome.runtime.sendMessage({
            method: 'revoke_boost'
          }, () => {
            rect.setAttribute('fill-opacity', '0.3');
            text.setAttribute('fill', '#d0d0d0');
            boost.title = msg.replace('NN', prefs.boost).replace('%%', 'disabled');
          });
        }
      });
    });
  }
};

addEventListener('yt-navigate-finish', observe);
addEventListener('play', observe, true);

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
  const boost = player.querySelector('.ytp-boost-button');
  if (settings && !boost) {
    observe.busy = true;
    chrome.storage.local.get({
      'boost': 2,
      'position': '.ytp-settings-button'
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

      const svg = document.createElementNS(svgns, 'svg');
      svg.setAttribute('height', '100%');
      svg.setAttribute('version', '1.1');
      svg.setAttribute('viewBox', '0 0 36 36');

      const use = document.createElementNS(svgns, 'use');
      use.setAttribute('class', 'ytp-svg-shadow');
      use.setAttribute('href', '#ytp-bv-1');

      const rect = document.createElementNS(svgns, 'rect');
      rect.setAttribute('fill-opacity', '0.3');

      const update = v => {
        const wide = v.toString().includes('.');
        rect.setAttribute('width', wide ? '24' : '18');
        rect.setAttribute('x', wide ? '6' : '9');
        text.textContent = v + 'x';
      };

      rect.setAttribute('y', '11.5');
      rect.setAttribute('rx', '1.5');
      rect.setAttribute('ry', '1.5');
      rect.setAttribute('height', '13');
      rect.setAttribute('id', 'ytp-bv-1');
      const text = document.createElementNS(svgns, 'text');
      text.setAttribute('x', '18');
      text.setAttribute('y', '18.5');
      text.setAttribute('dominant-baseline', 'middle');
      text.setAttribute('text-anchor', 'middle');
      update(prefs.boost);

      svg.append(use, rect, text);
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
            boost.title = msg.replace('NN', prefs.boost).replace('%%', 'disabled');
          });
        }
      });
    });
  }
};

addEventListener('yt-navigate-finish', observe);
addEventListener('play', observe, true);

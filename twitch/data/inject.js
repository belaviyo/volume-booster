/* global navigation */

const observe = () => {
  const player = document.querySelector('.persistent-player');
  const group = document.querySelector('.player-controls__right-control-group');

  if (!player || !group) {
    return;
  }
  if (observe.busy) {
    return;
  }

  const svgns = 'http://www.w3.org/2000/svg';

  const boost = player.querySelector('.ytp-boost-button');
  if (!boost) {
    observe.busy = true;
    chrome.storage.local.get({
      'boost': 2,
      'button': true
    }, prefs => {
      const msg = `Boost volume NNx (%%)

- Use Shift + Click to adjust boosting level or assign keyboard shortcuts from the extensions manager`;
      const boost = Object.assign(document.createElement('div'), {
        textContent: '',
        style: '',
        title: msg.replace('NN', prefs.boost).replace('%%', 'disabled')
      });
      boost.classList.add('ytp-boost-button');
      if (prefs.button === false) {
        boost.classList.add('hidden');
      }

      const svg = document.createElementNS(svgns, 'svg');
      svg.setAttribute('height', '20');
      svg.setAttribute('version', '1.1');
      svg.setAttribute('viewBox', '0 0 24 20');

      const rect = document.createElementNS(svgns, 'rect');
      rect.setAttribute('fill-opacity', '0.3');

      const update = v => {
        const wide = v.toString().includes('.');
        text.style['font-size'] = wide ? '8px' : '10px';
        text.textContent = v + 'x';
      };

      rect.setAttribute('width', 24);
      rect.setAttribute('x', 0);
      rect.setAttribute('y', 2);
      rect.setAttribute('rx', 1.5);
      rect.setAttribute('ry', 1.5);
      rect.setAttribute('height', 16);
      rect.setAttribute('id', 'ytp-bv-1');
      const text = document.createElementNS(svgns, 'text');
      text.setAttribute('x', 12);
      text.setAttribute('y', 10);
      text.setAttribute('dominant-baseline', 'middle');
      text.setAttribute('text-anchor', 'middle');
      text.setAttribute('fill', '#d0d0d0');
      update(prefs.boost);

      svg.append(rect, text);
      boost.append(svg);

      const settings = group.querySelector('div:has([data-a-target="player-settings-button"])');
      if (settings) {
        settings.insertAdjacentElement('afterend', boost);
      }
      else {
        group.insertAdjacentElement('afterbegin', boost);
      }

      observe.busy = false;

      const applyBoost = () => {
        rect.removeAttribute('fill-opacity');
        text.setAttribute('fill', '#000');
        boost.title = msg.replace('NN', prefs.boost).replace('%%', 'enabled');
      };

      // do we have the booster? Is it boosting?
      chrome.runtime.sendMessage({
        method: 'check_if_boosting'
      }, r => {
        if (r === true) {
          applyBoost();
        }
      });

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

        // toggle on and off
        if (rect.hasAttribute('fill-opacity')) { // disabled
          chrome.runtime.sendMessage({
            method: 'apply_boost'
          }, r => {
            if (r === true || r === 'true') {
              applyBoost();
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

addEventListener('play', observe, true);
// switch from mini-player to full-player
if (typeof navigation !== 'undefined') {
  navigation.addEventListener('navigate', navigateEvent => {
    observe();
  });
}

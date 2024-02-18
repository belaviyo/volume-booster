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
  const settings = document.querySelector('.ytp-settings-button');
  const boost = document.querySelector('.ytp-boost-button');
  if (settings && !boost) {
    observe.busy = true;
    chrome.storage.local.get({
      'boost': 2
    }, prefs => {
      const msg = `Boost volume NNx (%%)

Use Shift + Click to adjust boosting level or assign keyboard shortcuts from the extensions manager`;
      const boost = Object.assign(settings.cloneNode(true), {
        textContent: '',
        style: '',
        title: msg.replace('NN', prefs.boost).replace('%%', 'disabled')
      });
      boost.classList.replace('ytp-settings-button', 'ytp-boost-button');
      const svg = document.createElementNS(svgns, 'svg');
      svg.setAttribute('height', '100%');
      svg.setAttribute('version', '1.1');
      svg.setAttribute('viewBox', '0 0 42 42');
      const text = document.createElementNS(svgns, 'text');
      text.setAttribute('x', '21');
      text.setAttribute('y', '21');
      text.setAttribute('dominant-baseline', 'middle');
      text.setAttribute('text-anchor', 'middle');
      text.setAttribute('font-size', '14px');
      text.textContent = prefs.boost + 'x';

      svg.appendChild(text);
      boost.appendChild(svg);
      settings.parentNode.insertBefore(boost, settings);
      observe.busy = false;

      boost.addEventListener('click', e => {
        e.preventDefault();
        e.stopPropagation();

        if (e.detail && e.detail.method === 'change-boost') {
          prefs.boost = e.detail.boost;
          text.textContent = prefs.boost + 'x';
        }

        if (e.shiftKey) {
          const v = prompt('Insert the new boosting level (2, 3, or 4)', prefs.boost)?.trim();
          if (v === '2' || v === '3' || v === '4') {
            prefs.boost = parseInt(v);
            chrome.storage.local.set({
              boost: prefs.boost
            });
            chrome.runtime.sendMessage({
              method: 'adjust_boost',
              boost: prefs.boost
            });
            text.textContent = v + 'x';
          }

          return;
        }

        if (boost.classList.contains('boosting')) {
          chrome.runtime.sendMessage({
            method: 'revoke_boost'
          }, () => {
            boost.classList.remove('boosting');
            boost.title = msg.replace('NN', prefs.boost).replace('%%', 'disabled');
          });
        }
        else {
          chrome.runtime.sendMessage({
            method: 'apply_boost'
          }, r => {
            if (r === true || r === 'true') {
              boost.classList.add('boosting');
              boost.title = msg.replace('NN', prefs.boost).replace('%%', 'enabled');
            }
            else {
              alert('Cannot boost this video: ' + r);
            }
          });
        }
      });
    });
  }
};

addEventListener('yt-navigate-finish', observe);
addEventListener('play', observe, true);

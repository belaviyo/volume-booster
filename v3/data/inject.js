'use strict';

const observe = () => {
  const svgns = 'http://www.w3.org/2000/svg';
  const settings = document.querySelector('.ytp-settings-button');
  const boost = document.querySelector('.ytp-boost-button');
  if (settings && !boost) {
    chrome.storage.local.get({
      'boost': 2
    }, prefs => {
      const msg = `Boost volume ${prefs.boost}x`;
      const boost = Object.assign(settings.cloneNode(true), {
        textContent: '',
        title: msg + ` (disabled)`
      });
      boost.classList.replace('ytp-settings-button', 'ytp-boost-button');
      const svg = document.createElementNS(svgns, 'svg');
      svg.setAttribute('height', '100%');
      svg.setAttribute('version', '1.1');
      svg.setAttribute('viewBox', '0 0 42 42');
      const text = document.createElementNS(svgns, 'text');
      text.setAttribute('x', '24');
      text.setAttribute('y', '24');
      text.setAttribute('dominant-baseline', 'middle');
      text.setAttribute('text-anchor', 'middle');
      text.setAttribute('font-size', '14px');
      text.textContent = prefs.boost + 'x';

      svg.appendChild(text);
      boost.appendChild(svg);
      settings.parentNode.insertBefore(boost, settings);

      boost.addEventListener('click', () => {
        if (boost.classList.contains('boosting')) {
          chrome.runtime.sendMessage({
            method: 'revoke_boost'
          }, () => {
            boost.classList.remove('boosting');
            boost.title = msg + ' (disabled)';
          });
        }
        else {
          chrome.runtime.sendMessage({
            method: 'apply_boost'
          }, r => {
            if (r === true || r === 'true') {
              boost.classList.add('boosting');
              boost.title = msg + ' (enabled)';
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

window.addEventListener('yt-navigate-finish', () => {
  const e = document.querySelector('.html5-video-player');
  if (e) {
    observe();
  }
});

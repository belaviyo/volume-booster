'use strict';

chrome.runtime.onMessage.addListener((request, sender, response) => {
  const options = {
    target: {
      tabId: sender.tab.id,
      frameIds: [sender.frameId]
    },
    world: 'MAIN'
  };

  if (request.method === 'apply_boost') {
    chrome.storage.local.get({
      boost: 2
    }, prefs => {
      chrome.scripting.executeScript({
        ...options,
        func: value => {
          try {
            const player = [...document.querySelectorAll('.html5-video-player')].sort((a, b) => {
              return b.offsetHeight - a.offsetHeight;
            }).shift();
            const video = player.querySelector('video');
            let context;
            let source;
            if (video.booster) {
              context = video.booster.context;
              source = video.booster;
            }
            else {
              context = new AudioContext();
              source = context.createMediaElementSource(video);
            }
            const preamp = context.createGain();
            preamp.gain.value = value;
            source.connect(preamp);
            preamp.connect(context.destination);
            video.booster = source;
            video.preamp = preamp;

            // Firefox
            if (document.currentScript) {
              document.currentScript.dataset.result = true;
            }
            return true;
          }
          catch (e) {
            console.error(e);
            // Firefox
            if (document.currentScript) {
              document.currentScript.dataset.result = e.message;
            }
            return e.message;
          }
        },
        args: [prefs.boost]
      }).then(a => response(a[0].result));
    });
    return true;
  }
  else if (request.method === 'revoke_boost') {
    chrome.scripting.executeScript({
      ...options,
      func: () => {
        try {
          const player = [...document.querySelectorAll('.html5-video-player')].sort((a, b) => {
            return b.offsetHeight - a.offsetHeight;
          }).shift();
          const video = player.querySelector('video');
          const {booster} = video;
          booster.disconnect();
          booster.connect(booster.context.destination);
          // Firefox
          if (document.currentScript) {
            document.currentScript.dataset.result = true;
          }
          return true;
        }
        catch (e) {
          console.error(e);
          // Firefox
          if (document.currentScript) {
            document.currentScript.dataset.result = e.message;
          }
          return e.message;
        }
      }
    }).then(a => response(a[0].result));

    return true;
  }
  else if (request.method === 'adjust_boost') {
    chrome.scripting.executeScript({
      ...options,
      func: value => {
        try {
          const player = [...document.querySelectorAll('.html5-video-player')].sort((a, b) => {
            return b.offsetHeight - a.offsetHeight;
          }).shift();
          const video = player.querySelector('video');

          if (video.preamp) {
            video.preamp.gain.value = value;
          }
        }
        catch (e) {}
      },
      args: [request.boost]
    });
  }
});

chrome.commands.onCommand.addListener(cmd => chrome.tabs.query({
  active: true,
  lastFocusedWindow: true
}, tabs => {
  if (tabs && tabs[0]) {
    if (cmd === 'boost') {
      chrome.scripting.executeScript({
        target: {
          tabId: tabs[0].id
        },
        func: () => {
          const button = document.querySelector('.ytp-boost-button');
          button.click();
        }
      });
    }
    else {
      const boost = parseInt(cmd.slice(6, 7));
      // update boost value
      chrome.storage.local.set({
        boost
      }, () => chrome.scripting.executeScript({
        target: {
          tabId: tabs[0].id
        },
        func: boost => {
          const button = document.querySelector('.ytp-boost-button');
          button.dispatchEvent(new CustomEvent('click', {
            detail: {
              method: 'change-boost',
              boost
            }
          }));
        },
        args: [boost]
      }));
    }
  }
}));

/* FAQs & Feedback */
{
  const {management, runtime: {onInstalled, setUninstallURL, getManifest}, storage, tabs} = chrome;
  if (navigator.webdriver !== true) {
    const page = getManifest().homepage_url;
    const {name, version} = getManifest();
    onInstalled.addListener(({reason, previousVersion}) => {
      management.getSelf(({installType}) => installType === 'normal' && storage.local.get({
        'faqs': true,
        'last-update': 0
      }, prefs => {
        if (reason === 'install' || (prefs.faqs && reason === 'update')) {
          const doUpdate = (Date.now() - prefs['last-update']) / 1000 / 60 / 60 / 24 > 45;
          if (doUpdate && previousVersion !== version) {
            tabs.query({active: true, lastFocusedWindow: true}, tbs => tabs.create({
              url: page + '&version=' + version + (previousVersion ? '&p=' + previousVersion : '') + '&type=' + reason,
              active: reason === 'install',
              ...(tbs && tbs.length && {index: tbs[0].index + 1})
            }));
            storage.local.set({'last-update': Date.now()});
          }
        }
      }));
    });
    setUninstallURL(page + '&rd=feedback&name=' + encodeURIComponent(name) + '&version=' + version);
  }
}

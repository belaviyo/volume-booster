'use strict';

chrome.runtime.onMessage.addListener((request, sender, response) => {
  if (request.method === 'apply_boost') {
    chrome.storage.local.get({
      boost: 2
    }, prefs => {
      chrome.scripting.executeScript({
        target: {
          tabId: sender.tab.id,
          frameIds: [sender.frameId]
        },
        world: 'MAIN',
        func: value => {
          try {
            const e = document.querySelector('.html5-video-player');
            const video = e.querySelector('video');
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
      target: {
        tabId: sender.tab.id,
        frameIds: [sender.frameId]
      },
      world: 'MAIN',
      func: () => {
        try {
          const e = document.querySelector('.html5-video-player');
          const video = e.querySelector('video');
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
});

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
            tabs.query({active: true, currentWindow: true}, tbs => tabs.create({
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

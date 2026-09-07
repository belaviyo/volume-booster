'use strict';

chrome.action.onClicked.addListener(tab => {
  const href = tab.url || '';
  if (href?.includes('www.youtube.com/watch')) {
    chrome.scripting.executeScript({
      target: {
        tabId: tab.id
      },
      func: () => {
        document.querySelector('.ytp-boost-button').click();
      }
    });
  }
  else {
    chrome.tabs.create({
      url: 'https://www.youtube.com/',
      index: tab.index + 1
    });
  }
});

const icon = (tabId, b) => {
  chrome.action.setIcon({
    tabId,
    path: {
      '16': '/data/icons/' + (b ? '' : 'disabled/') + '16.png',
      '32': '/data/icons/' + (b ? '' : 'disabled/') + '32.png'
    }
  });
};

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
            const player = [...document.querySelectorAll('.html5-video-player')]
              .filter(a => a.offsetHeight)
              .sort((a, b) => b.offsetHeight - a.offsetHeight).shift();
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
              /* The audio of a captured media element only flows through the Web Audio graph.
                 On Gecko, when the element reaches "ended" (e.g. when a looped video restarts),
                 the element's underlying audio stream is torn down and a new one is created on
                 resume, but this MediaElementAudioSourceNode keeps draining the dead stream,
                 which permanently mutes the video until the user seeks manually. To work around
                 that, we reconnect the source node once right after playback resumes. The
                 "playing"/"seeked" listeners do not need to be removed: they are registered with
                 {once: true} so each cleans itself up after a single invocation, and they are
                 only armed transiently (re-armed on every "ended", which cannot fire again
                 before "playing" does), so there is no accumulation across loop cycles. The
                 "ended" listener itself must stay armed for the lifetime of the element because
                 every loop restart needs a fresh kick, even after revoke_boost (the element
                 stays captured either way). Revoke replaces video.boosterKick with the un-routed
                 topology so a post-revoke kick rebinds without boosting. */
              video.addEventListener('ended', () => {
                let done = false;
                const kick = () => {
                  if (done) {
                    return;
                  }
                  done = true;
                  try {
                    video.boosterKick();
                  }
                  catch (e) {}
                };
                video.addEventListener('playing', kick, {once: true});
                video.addEventListener('seeked', kick, {once: true});
              });
            }
            // avoid stacking preamp gain nodes on repeated applies (volume would compound)
            if (video.preamp) {
              try {
                source.disconnect();
                video.preamp.disconnect();
              }
              catch (e) {}
            }
            const preamp = context.createGain();
            preamp.gain.value = value;
            source.connect(preamp);
            preamp.connect(context.destination);
            video.booster = source;
            video.preamp = preamp;
            video.boosterKick = () => {
              source.disconnect();
              source.connect(video.preamp);
              video.preamp.connect(context.destination);
              if (context.state === 'suspended') {
                context.resume().catch(() => {});
              }
            };

            return true;
          }
          catch (e) {
            console.error(e);
            return e.message;
          }
        },
        args: [prefs.boost]
      }).then(a => {
        if (a[0].result === true) {
          icon(sender.tab.id, true);
        }
        response(a[0].result);
      });
    });
    return true;
  }
  else if (request.method === 'revoke_boost') {
    chrome.scripting.executeScript({
      ...options,
      func: () => {
        try {
          const player = [...document.querySelectorAll('.html5-video-player')]
            .filter(a => a.offsetHeight)
            .sort((a, b) => b.offsetHeight - a.offsetHeight).shift();
          const video = player.querySelector('video');
          if (!video.booster) {
            // element was replaced by the player; nothing to revoke
            return true;
          }
          const {booster} = video;
          booster.disconnect();
          if (video.preamp) {
            video.preamp.disconnect();
            video.preamp = null;
          }
          booster.connect(booster.context.destination);
          // the ended-kick (see apply_boost) stays armed; route it around the removed preamp
          video.boosterKick = () => {
            booster.disconnect();
            booster.connect(booster.context.destination);
            if (booster.context.state === 'suspended') {
              booster.context.resume().catch(() => {});
            }
          };
          return true;
        }
        catch (e) {
          return e.message;
        }
      }
    }).then(a => {
      if (a[0].result === true) {
        icon(sender.tab.id, false);
      }
      response(a[0].result);
    });

    return true;
  }
  else if (request.method === 'adjust_boost') {
    chrome.scripting.executeScript({
      ...options,
      func: value => {
        try {
          const player = [...document.querySelectorAll('.html5-video-player')]
            .filter(a => a.offsetHeight)
            .sort((a, b) => b.offsetHeight - a.offsetHeight).shift();
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
    const {homepage_url: page, name, version} = getManifest();
    onInstalled.addListener(({reason, previousVersion}) => {
      management.getSelf(({installType}) => installType === 'normal' && storage.local.get({
        'faqs': true,
        'last-update': 0
      }, prefs => {
        if (reason === 'install' || (prefs.faqs && reason === 'update')) {
          const doUpdate = (Date.now() - prefs['last-update']) / 1000 / 60 / 60 / 24 > 45;
          if (doUpdate && previousVersion !== version) {
            tabs.query({active: true, lastFocusedWindow: true}, tbs => tabs.create({
              url: page + '?version=' + version + (previousVersion ? '&p=' + previousVersion : '') + '&type=' + reason,
              active: reason === 'install',
              ...(tbs && tbs.length && {index: tbs[0].index + 1})
            }));
            storage.local.set({'last-update': Date.now()});
          }
        }
      }));
    });
    setUninstallURL(page + '?rd=feedback&name=' + encodeURIComponent(name) + '&version=' + version);
  }
}

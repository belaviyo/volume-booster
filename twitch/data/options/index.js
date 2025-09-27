chrome.storage.local.get({
  'boost': 2,
  'button': true
}).then(prefs => {
  document.getElementById('boost').value = prefs.boost;
  document.getElementById('button').checked = prefs.button;
});

document.forms[0].onsubmit = async e => {
  e.preventDefault();
  await chrome.storage.local.set({
    'boost': Math.round(document.getElementById('boost').valueAsNumber * 10) / 10,
    'button': document.getElementById('button').checked
  });

  self.toast.textContent = 'Options saved';
  setTimeout(() => {
    self.toast.textContent = '';
  }, 750);
};

// links
for (const a of [...document.querySelectorAll('[data-href]')]) {
  if (a.hasAttribute('href') === false) {
    a.href = chrome.runtime.getManifest().homepage_url + '#' + a.dataset.href;
  }
}

chrome.storage.local.get({
  'boost': 2,
  'position': '.ytp-settings-button',
  'button': true
}, prefs => {
  document.getElementById('boost').value = prefs.boost;
  document.getElementById('position').value = prefs.position;
  document.getElementById('button').checked = prefs.button;
});

document.forms[0].onsubmit = async e => {
  e.preventDefault();
  await chrome.storage.local.set({
    'boost': Math.round(document.getElementById('boost').valueAsNumber * 10) / 10,
    'position': document.getElementById('position').value,
    'button': document.getElementById('button').checked
  });

  self.toast.textContent = 'Options saved';
  setTimeout(() => {
    self.toast.textContent = '';
  }, 750);
};

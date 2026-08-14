const API_URL = resolveApiBaseUrl();
const TRASH_ICON = '<svg class="lucide" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M3 6h18"/><path d="M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M10 11v6"/><path d="M14 11v6"/></svg>';
let trainingStatus;

function formatDateGerman(date) {
  return new Intl.DateTimeFormat('de-DE', { timeZone: 'Europe/Berlin', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(`${date}T12:00:00Z`));
}

async function loadStatus() {
  const response = await fetch(`${API_URL}/training/status`);
  if (!response.ok) throw new Error('Failed to load training status');
  trainingStatus = await response.json();
  document.querySelector('[data-next-date]').textContent = formatDateGerman(trainingStatus.date);
}

async function loadParticipants() {
  const list = document.querySelector('[data-training-list]');
  const noParticipants = document.querySelector('[data-no-participants]');
  if (!list) return;
  const response = await fetch(`${API_URL}/training/participants?date=${encodeURIComponent(trainingStatus.date)}`);
  if (!response.ok) return console.error('Failed to load training participants');
  const { participants } = await response.json();
  if (!participants.length) {
    list.hidden = true;
    if (noParticipants) noParticipants.hidden = false;
    return;
  }

  list.innerHTML = '';
  list.hidden = false;
  if (noParticipants) noParticipants.hidden = true;
  participants.forEach((participant) => {
    const signup = JSON.parse(window.localStorage.getItem('training-signup'));
    const listItem = document.createElement('li');
    listItem.textContent = participant.name;
    if (signup?.id === participant.id) {
      const deleteButton = document.createElement('button');
      deleteButton.setAttribute('class', 'button button--text');
      deleteButton.innerHTML = TRASH_ICON;
      deleteButton.addEventListener('click', () => handleDelete(participant));
      listItem.appendChild(deleteButton);
    }
    list.appendChild(listItem);
  });
}

function setRemovalToken(participant, removalToken) {
  window.localStorage.setItem('training-signup', JSON.stringify({ id: participant.id, date: participant.date, removalToken }));
}

async function handleDelete(participant) {
  const signup = JSON.parse(window.localStorage.getItem('training-signup'));
  if (!signup?.removalToken || signup.id !== participant.id) return;
  const response = await fetch(`${API_URL}/training/participants/${participant.id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${signup.removalToken}` } });
  if (!response.ok) return console.error(`Failed to delete participant ${participant.name}`);
  window.localStorage.removeItem('training-signup');
  loadParticipants();
}

async function sendData(form) {
  const formData = new FormData(form);
  const response = await fetch(`${API_URL}/training/participants`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: formData.get('name'), password: formData.get('password') }),
  });
  const result = await response.json();
  if (!response.ok) return alert(result.message || 'Anmeldung fehlgeschlagen.');
  alert('Du hast dich erfolgreich angemeldet.');
  form.reset();
  setRemovalToken(result.participant, result.removalToken);
  loadParticipants();
}

function initializeForm() {
  const form = document.querySelector('[data-training-form]');
  if (!form) return;
  if (!trainingStatus.signupOpen) {
    form.querySelector('button').disabled = true;
    form.insertAdjacentHTML('beforebegin', '<p><em>Die Anmeldung für das nächste Training öffnet am Samstag.</em></p>');
  }
  form.addEventListener('submit', (event) => { event.preventDefault(); if (trainingStatus.signupOpen) sendData(form); });
}

async function initializeTraining() {
  try {
    await loadStatus();
    await loadParticipants();
    initializeForm();
  } catch (error) {
    console.error(error);
  }
}

initializeTraining();

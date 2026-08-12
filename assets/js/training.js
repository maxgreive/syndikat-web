const API_URL = resolveApiBaseUrl();
const TRAINING_WEEKDAY = 5;
const TRAINING_HOUR = 16;
const TRASH_ICON = '<svg class="lucide" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M3 6h18"/><path d="M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M10 11v6"/><path d="M14 11v6"/></svg>';

function resolveApiBaseUrl() {
  return ['localhost', '127.0.0.1'].includes(window.location.hostname)
    ? 'http://localhost:8080'
    : 'https://api.syndikat.golf';
}

function getBerlinNowParts() {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Berlin', year: 'numeric', month: '2-digit', day: '2-digit',
    weekday: 'short', hour: '2-digit', minute: '2-digit', hour12: false,
  });
  const parts = Object.fromEntries(formatter.formatToParts(new Date())
    .filter((part) => part.type !== 'literal').map((part) => [part.type, part.value]));
  const weekdayMap = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  return { year: Number(parts.year), month: Number(parts.month), day: Number(parts.day), weekday: weekdayMap[parts.weekday], hour: Number(parts.hour), minute: Number(parts.minute) };
}

function getNextDate() {
  const berlinNow = getBerlinNowParts();
  let daysUntilDate = (TRAINING_WEEKDAY - berlinNow.weekday + 7) % 7;
  if (daysUntilDate === 0 && (berlinNow.hour > TRAINING_HOUR || (berlinNow.hour === TRAINING_HOUR && berlinNow.minute > 0))) daysUntilDate = 7;
  const nextDate = new Date(Date.UTC(berlinNow.year, berlinNow.month - 1, berlinNow.day + daysUntilDate));
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Berlin', year: 'numeric', month: '2-digit', day: '2-digit' }).format(nextDate);
}

function formatDateGerman(date) {
  return new Intl.DateTimeFormat('de-DE', { timeZone: 'Europe/Berlin', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(date));
}

async function loadParticipants() {
  const list = document.querySelector('[data-training-list]');
  if (!list) return;
  list.innerHTML = '';
  const response = await fetch(`${API_URL}/training/participants?date=${encodeURIComponent(getNextDate())}`);
  if (!response.ok) return console.error('Failed to load training participants');
  const { participants } = await response.json();
  if (!participants.length) return list.insertAdjacentHTML('afterbegin', '<p><em data-no-participants>Bisher noch keine Anmeldungen. Sei der/die erste!</em></p>');
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

function updateHeadline() {
  document.querySelector('[data-next-date]').textContent = formatDateGerman(getNextDate());
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
    body: JSON.stringify({ name: formData.get('name'), date: getNextDate(), password: formData.get('password') }),
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
  if (form) form.addEventListener('submit', (event) => { event.preventDefault(); sendData(form); });
}

loadParticipants();
updateHeadline();
initializeForm();

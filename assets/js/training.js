// Initialize Supabase
const SUPABASE_URL = 'https://zbexetusrmggirxhsavj.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpiZXhldHVzcm1nZ2lyeGhzYXZqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzEwNjUyMDksImV4cCI6MjA0NjY0MTIwOX0.hu-irocr2J5S2sg2Wzbt3SOb8D8ojFksf6EylWitKmQ';
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const TRAINING_WEEKDAY = 7;

function hash(str) {
  return Array.from(str).reduce((hash, char) => 0 | (31 * hash + char.charCodeAt(0)), 0);
}

function getNextDate() {
  const nextDate = new Date();
  nextDate.setDate(nextDate.getDate() + ((TRAINING_WEEKDAY - nextDate.getDay()) % TRAINING_WEEKDAY));
  return nextDate.toISOString().split('T')[0];
}

async function loadParticipants() {
  const list = document.querySelector('[data-training-list]');
  if (!list) return;

  list.innerHTML = "";
  const { data: participants, error } = await supabase.from("participants").select("*").eq('date', getNextDate())
  if (error) {
    return console.error(error);
  }

  if (participants.length === 0) {
    return list.insertAdjacentHTML('beforebegin', `
      <em data-no-participants>Bisher noch keine Anmeldungen. Sei der/die erste!</em>
    `)
  }

  document.querySelector('[data-no-participants]')?.remove();

  return participants.forEach(participant => {
    list.insertAdjacentHTML('beforeend', `
      <li>${participant.name}</li>
    `);
  });
}

function updateHeadline(date) {
  document.querySelector('[data-next-date]').textContent = new Date(date).toLocaleDateString('de-DE');
}

async function sendData(form) {
  const formData = new FormData(form);

  const password = formData.get('password');
  if (hash(password.toLowerCase()) !== 96387) return alert('Inkorrektes Passwort!');
  const name = formData.get('name');
  const date = getNextDate();

  const { data, error } = await supabase.from("participants").insert([{ name, date }]);
  if (error) {
    alert("Error signing up: " + error.message);
  } else {
    alert("Du hast dich erfolgreich angemeldet.");
    form.reset(); // Reset form after submission
    loadParticipants(); // Reload participant list
  }
}

function initializeForm() {
  const form = document.querySelector('[data-training-form]');
  if (!form) return;

  form.addEventListener('submit', event => {
    event.preventDefault();
    sendData(form);
  });
}

loadParticipants();
updateHeadline(getNextDate());
initializeForm();


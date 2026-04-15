// Initialize Supabase
const SUPABASE_URL = 'https://zbexetusrmggirxhsavj.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpiZXhldHVzcm1nZ2lyeGhzYXZqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzEwNjUyMDksImV4cCI6MjA0NjY0MTIwOX0.hu-irocr2J5S2sg2Wzbt3SOb8D8ojFksf6EylWitKmQ';
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const TRAINING_WEEKDAY = 5;
const TRAINING_HOUR = 16;

function hash(str) {
  return Array.from(str).reduce((hash, char) => 0 | (31 * hash + char.charCodeAt(0)), 0);
}

function getBerlinNowParts() {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Berlin",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  });

  const parts = Object.fromEntries(
    formatter
      .formatToParts(new Date())
      .filter(part => part.type !== "literal")
      .map(part => [part.type, part.value])
  );

  const weekdayMap = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  };

  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
    weekday: weekdayMap[parts.weekday],
    hour: Number(parts.hour),
    minute: Number(parts.minute),
  };
}

function getNextDate() {
  const berlinNow = getBerlinNowParts();
  let daysUntilDate = (TRAINING_WEEKDAY - berlinNow.weekday + 7) % 7;

  if (daysUntilDate === 0) {
    const trainingAlreadyStarted =
      berlinNow.hour > TRAINING_HOUR ||
      (berlinNow.hour === TRAINING_HOUR && berlinNow.minute > 0);

    if (trainingAlreadyStarted) {
      daysUntilDate = 7;
    }
  }

  const nextDateUTC = new Date(Date.UTC(
    berlinNow.year,
    berlinNow.month - 1,
    berlinNow.day + daysUntilDate
  ));
  const dateFormat = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Berlin",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  });

  return dateFormat.format(nextDateUTC);
}

function formatDateGerman(date) {
  const berlinDateFormat = new Intl.DateTimeFormat("de-DE", {
    timeZone: "Europe/Berlin",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  });

  return berlinDateFormat.format(new Date(date));
}

async function loadParticipants() {
  const list = document.querySelector('[data-training-list]');
  if (!list) return;

  list.innerHTML = "";
  const { data: participants, error } = await supabase.from("participants").select("*").eq('date', getNextDate());
  if (error) {
    return console.error(error);
  }

  if (participants.length === 0) {
    return list.insertAdjacentHTML('afterbegin', `
      <p><em data-no-participants>Bisher noch keine Anmeldungen. Sei der/die erste!</em></p>
    `)
  }

  document.querySelector('[data-no-participants]')?.remove();

  participants.forEach(participant => {
    const hasLocalStorage = JSON.parse(window.localStorage.getItem('training-signup'))?.name === participant.name;

    const listItem = document.createElement('li');
    listItem.textContent = participant.name;

    if (hasLocalStorage) {
      const deleteButton = document.createElement('button');
      deleteButton.setAttribute('class', 'button button--text')
      deleteButton.innerHTML = '<i class="ion ion-md-trash"></i>';
      deleteButton.addEventListener('click', async () => {
        await handleDelete(participant.name);
      });
      listItem.appendChild(deleteButton);
    }

    list.appendChild(listItem);
  });
}

function updateHeadline() {
  document.querySelector('[data-next-date]').textContent = formatDateGerman(getNextDate());
}

function setRemovalToken(name, date) {
  window.localStorage.setItem('training-signup', JSON.stringify({ name, date }));
}

async function handleDelete(name) {
  const nextDate = getNextDate();
  const { error } = await supabase.from('participants').delete().eq('name', name).eq('date', nextDate);

  if (error) {
    console.error(`Failed to delete participant ${name} for date ${nextDate}:`, error);
    return;
  }

  console.log(`Successfully deleted participant ${name} for date ${nextDate}`);
  loadParticipants();
}

async function sendData(form) {
  const formData = new FormData(form);

  const password = formData.get('password');
  if (hash(password.toLowerCase()) !== 96387) return alert('Inkorrektes Passwort!');
  const name = formData.get('name');
  const date = getNextDate();

  const { error } = await supabase.from("participants").insert([{ name, date }]);
  if (error) {
    alert("Error signing up: " + error.message);
    return;
  }

  alert("Du hast dich erfolgreich angemeldet.");
  form.reset(); // Reset form after submission
  loadParticipants(); // Reload participant list
  setRemovalToken(name, date);
  return;
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
updateHeadline();
initializeForm();

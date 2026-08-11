<script>
  import { onDestroy, onMount } from "svelte";
  import { deck, categories } from "./cardDeck.js";

  const roomKeyPrefix = "chain-chaos-room:";
  const sessionKey = "chain-chaos-session";
  const labels = {
    de: {
      title: "Kettenchaos",
      subtitle: "Ein originales Disc-Golf-Kartenspiel fuer 2-4 Spieler*innen oder Teams.",
      create: "Raum erstellen",
      join: "Beitreten",
      name: "Name",
      roomCode: "Raumcode",
      start: "Startkarten geben",
      draw: "Karte ziehen",
      discard: "Abwerfen",
      play: "Spielen",
      target: "Ziel",
      scoreHole: "Loch werten",
      nextHole: "Naechstes Loch",
      hand: "Deine Hand",
      table: "Aktuelles Loch",
      scores: "Scoreboard",
      players: "Spieler",
      skins: "Skins",
      strokes: "Wuerfe",
      carry: "Carryover",
      rules: "Regeln",
      copied: "Link kopiert",
      hostOnly: "Nur Host",
      waiting: "Erstelle einen Raum oder tritt mit Code bei.",
      privacy: "Dieses statische Demo nutzt lokalen Speicher und BroadcastChannel fuer Tabs auf diesem Geraet. Fuer echte getrennte Handys braucht es die Supabase-Tabellen und Policies aus dem Projektplan.",
      needPlayers: "Mindestens 2 Spieler*innen noetig.",
      cardLimit: "Du hast das Kartenlimit erreicht.",
      playedAlready: "Du hast in diesem Loch schon eine Karte gespielt.",
      targetTaken: "Dieses Ziel hat in diesem Loch schon eine Karte bekommen.",
    },
    en: {
      title: "Chain Chaos",
      subtitle: "An original disc golf card game for 2-4 players or teams.",
      create: "Create room",
      join: "Join",
      name: "Name",
      roomCode: "Room code",
      start: "Deal starting hands",
      draw: "Draw card",
      discard: "Discard",
      play: "Play",
      target: "Target",
      scoreHole: "Score hole",
      nextHole: "Next hole",
      hand: "Your hand",
      table: "Current hole",
      scores: "Scoreboard",
      players: "Players",
      skins: "Skins",
      strokes: "Strokes",
      carry: "Carryover",
      rules: "Rules",
      copied: "Link copied",
      hostOnly: "Host only",
      waiting: "Create a room or join by code.",
      privacy: "This static demo uses local storage and BroadcastChannel for tabs on this device. Real separate-phone play needs the Supabase tables and policies from the project plan.",
      needPlayers: "At least 2 players required.",
      cardLimit: "You reached the hand limit.",
      playedAlready: "You already played a card on this hole.",
      targetTaken: "This target already received a card on this hole.",
    },
  };

  let language = "de";
  let displayName = "";
  let joinCode = "";
  let currentPlayerId = "";
  let room = null;
  let channel;
  let notice = "";
  let scoreInputs = {};
  let selectedTargets = {};

  $: t = labels[language];
  $: currentPlayer = room?.players.find((player) => player.id === currentPlayerId);
  $: ownHand = currentPlayer?.hand || [];
  $: canAddPlayer = room && room.players.length < 4;
  $: shareUrl = room ? `${location.origin}${location.pathname}#${room.code}` : "";

  function uid(prefix) {
    return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
  }

  function createRoom() {
    const hostName = displayName.trim() || "Host";
    const player = createPlayer(hostName, true);
    room = {
      id: uid("room"),
      code: Math.random().toString(36).slice(2, 7).toUpperCase(),
      language,
      hostId: player.id,
      currentHole: 1,
      carryover: 1,
      status: "lobby",
      deck: shuffle(deck.map((card) => card.id)),
      discard: [],
      players: [player],
      played: [],
      events: [],
    };
    currentPlayerId = player.id;
    persistSession();
    saveRoom();
    connectChannel();
  }

  function createPlayer(name, host = false) {
    return {
      id: uid("player"),
      token: uid("token"),
      name,
      host,
      score: 0,
      skins: 0,
      hand: [],
    };
  }

  function joinRoom() {
    const code = joinCode.trim().toUpperCase() || location.hash.slice(1).toUpperCase();
    const storedRoom = loadRoom(code);
    if (!storedRoom) {
      notice = "Raum nicht gefunden / Room not found";
      return;
    }
    room = storedRoom;
    language = room.language || language;
    const existing = loadSession(code);
    if (existing && room.players.some((player) => player.id === existing.playerId)) {
      currentPlayerId = existing.playerId;
    } else {
      if (room.players.length >= 4) {
        notice = "Maximal 4 Spieler*innen / Maximum 4 players";
        return;
      }
      const player = createPlayer(displayName.trim() || `Player ${room.players.length + 1}`);
      room.players = [...room.players, player];
      currentPlayerId = player.id;
      log("join", player.name);
      saveRoom();
    }
    persistSession();
    connectChannel();
  }

  function dealStartingHands() {
    if (!isHost()) return;
    if (room.players.length < 2) {
      notice = t.needPlayers;
      return;
    }
    room.players = room.players.map((player) => ({
      ...player,
      hand: player.hand.length ? player.hand : drawCards(3),
    }));
    room.status = "playing";
    log("deal", "3");
    saveRoom();
  }

  function drawForPlayer(playerId) {
    const player = room.players.find((item) => item.id === playerId);
    if (!player || player.hand.length >= 7) return;
    player.hand = [...player.hand, ...drawCards(1)];
    log("draw", player.name);
    saveRoom();
  }

  function drawCards(count) {
    const cards = [];
    for (let index = 0; index < count; index += 1) {
      if (!room.deck.length) {
        room.deck = shuffle(room.discard);
        room.discard = [];
      }
      const cardId = room.deck.shift();
      if (cardId) cards.push(cardId);
    }
    return cards;
  }

  function playCard(cardId) {
    const targetId = selectedTargets[cardId] || currentPlayerId;
    const alreadyPlayed = hasPlayedThisHole(currentPlayerId);
    const alreadyTargeted = hasTargetThisHole(targetId);
    if (alreadyPlayed || alreadyTargeted) return;
    room.players = room.players.map((player) => player.id === currentPlayerId
      ? { ...player, hand: player.hand.filter((id) => id !== cardId) }
      : player);
    room.played = [...room.played, { id: uid("play"), hole: room.currentHole, playerId: currentPlayerId, targetId, cardId }];
    log("play", cardId);
    saveRoom();
  }

  function discardCard(cardId) {
    room.players = room.players.map((player) => player.id === currentPlayerId
      ? { ...player, hand: player.hand.filter((id) => id !== cardId) }
      : player);
    room.discard = [...room.discard, cardId];
    log("discard", cardId);
    saveRoom();
  }

  function scoreHole() {
    if (!isHost()) return;
    const scores = room.players.map((player) => ({
      ...player,
      strokes: Number(scoreInputs[player.id] || 0),
    }));
    if (scores.some((player) => player.strokes <= 0)) return;
    const best = Math.min(...scores.map((player) => player.strokes));
    const winners = scores.filter((player) => player.strokes === best);
    room.players = room.players.map((player) => {
      const scored = scores.find((item) => item.id === player.id);
      return { ...player, score: player.score + scored.strokes };
    });
    if (winners.length === 1) {
      const winnerId = winners[0].id;
      room.players = room.players.map((player) => player.id === winnerId
        ? { ...player, skins: player.skins + room.carryover }
        : { ...player, hand: player.hand.length < 7 ? [...player.hand, ...drawCards(1)] : player.hand });
      room.carryover = 1;
    } else {
      room.carryover += 1;
    }
    room.discard = [...room.discard, ...room.played.map((play) => play.cardId)];
    room.played = [];
    room.currentHole += 1;
    scoreInputs = {};
    log("score", `hole ${room.currentHole - 1}`);
    saveRoom();
  }

  function getCard(cardId) {
    return deck.find((card) => card.id === cardId);
  }

  function hasPlayedThisHole(playerId) {
    return room.played.some((play) => play.playerId === playerId && play.hole === room.currentHole);
  }

  function hasTargetThisHole(playerId) {
    return room.played.some((play) => play.targetId === playerId && play.hole === room.currentHole);
  }

  function cardDisabledReason(cardId) {
    const targetId = selectedTargets[cardId] || currentPlayerId;
    if (hasPlayedThisHole(currentPlayerId)) return t.playedAlready;
    if (hasTargetThisHole(targetId)) return t.targetTaken;
    return "";
  }

  function playerName(playerId) {
    return room?.players.find((player) => player.id === playerId)?.name || "?";
  }

  function isHost() {
    return room?.hostId === currentPlayerId;
  }

  function setLanguage(nextLanguage) {
    language = nextLanguage;
    if (room) {
      room.language = nextLanguage;
      saveRoom();
    }
  }

  function copyLink() {
    navigator.clipboard?.writeText(shareUrl);
    notice = t.copied;
  }

  function shuffle(items) {
    return [...items].sort(() => Math.random() - 0.5);
  }

  function log(type, detail) {
    room.events = [{ id: uid("event"), type, detail, at: Date.now() }, ...(room.events || [])].slice(0, 10);
  }

  function saveRoom() {
    if (!room) return;
    localStorage.setItem(`${roomKeyPrefix}${room.code}`, JSON.stringify(room));
    history.replaceState(null, "", `#${room.code}`);
    channel?.postMessage(room);
  }

  function loadRoom(code) {
    try {
      return JSON.parse(localStorage.getItem(`${roomKeyPrefix}${code}`));
    } catch (_) {
      return null;
    }
  }

  function persistSession() {
    localStorage.setItem(sessionKey, JSON.stringify({ code: room.code, playerId: currentPlayerId }));
  }

  function loadSession(code) {
    try {
      const session = JSON.parse(localStorage.getItem(sessionKey));
      return session?.code === code ? session : null;
    } catch (_) {
      return null;
    }
  }

  function connectChannel() {
    channel?.close();
    if (!room || !("BroadcastChannel" in window)) return;
    channel = new BroadcastChannel(`chain-chaos-${room.code}`);
    channel.onmessage = (event) => {
      if (event.data?.code === room.code) room = event.data;
    };
  }

  onMount(() => {
    const hashCode = location.hash.slice(1).toUpperCase();
    const storedSession = hashCode ? loadSession(hashCode) : JSON.parse(localStorage.getItem(sessionKey) || "null");
    if (storedSession?.code) {
      const storedRoom = loadRoom(storedSession.code);
      if (storedRoom) {
        room = storedRoom;
        language = room.language || language;
        currentPlayerId = storedSession.playerId;
        joinCode = room.code;
        connectChannel();
      }
    } else if (hashCode) {
      joinCode = hashCode;
    }
  });

  onDestroy(() => channel?.close());
</script>

<section class="cc-shell">
  <div class="cc-hero">
    <div>
      <p class="cc-kicker">Disc Golf Round Cards</p>
      <h2>{t.title}</h2>
      <p>{t.subtitle}</p>
    </div>
    <div class="cc-language" aria-label="Language">
      <button class:active={language === "de"} on:click={() => setLanguage("de")}>DE</button>
      <button class:active={language === "en"} on:click={() => setLanguage("en")}>EN</button>
    </div>
  </div>

  {#if !room}
    <div class="cc-panel cc-start">
      <label>{t.name}<input bind:value={displayName} placeholder="Ace" /></label>
      <button on:click={createRoom}>{t.create}</button>
      <label>{t.roomCode}<input bind:value={joinCode} placeholder="ABCDE" /></label>
      <button on:click={joinRoom}>{t.join}</button>
      <p>{t.waiting}</p>
    </div>
  {:else}
    <div class="cc-roombar">
      <strong>{t.roomCode}: {room.code}</strong>
      <button on:click={copyLink}>Link</button>
      <span>{notice}</span>
    </div>

    <div class="cc-grid">
      <section class="cc-panel">
        <h3>{t.players}</h3>
        {#if canAddPlayer}
          <div class="cc-inline">
            <input bind:value={displayName} placeholder={t.name} />
            <button on:click={joinRoom}>{t.join}</button>
          </div>
        {/if}
        <table>
          <thead><tr><th>{t.name}</th><th>{t.strokes}</th><th>{t.skins}</th><th>Cards</th></tr></thead>
          <tbody>
            {#each room.players as player}
              <tr class:me={player.id === currentPlayerId}>
                <td>{player.name}{player.host ? " *" : ""}</td>
                <td>{player.score}</td>
                <td>{player.skins}</td>
                <td>{player.id === currentPlayerId ? player.hand.length : "?"}</td>
              </tr>
            {/each}
          </tbody>
        </table>
        <p>{t.carry}: {room.carryover}</p>
        {#if isHost()}
          <button on:click={dealStartingHands} disabled={room.players.length < 2}>{t.start}</button>
          {#if room.players.length < 2}<p>{t.needPlayers}</p>{/if}
        {/if}
      </section>

      <section class="cc-panel">
        <h3>{t.hand}</h3>
        <button on:click={() => drawForPlayer(currentPlayerId)} disabled={!currentPlayer || ownHand.length >= 7}>{t.draw}</button>
        <div class="cc-cards">
          {#each ownHand as cardId}
            {@const card = getCard(cardId)}
            <article class={`cc-card ${card.category}`}>
              <span>{categories[card.category][language]}</span>
              <h4>{card.title[language]}</h4>
              <p>{card.text[language]}</p>
              <select bind:value={selectedTargets[cardId]} aria-label={t.target}>
                {#each room.players as player}
                  <option value={player.id}>{player.name}</option>
                {/each}
              </select>
              {#if cardDisabledReason(cardId)}
                <small>{cardDisabledReason(cardId)}</small>
              {/if}
              <div class="cc-actions">
                <button on:click={() => playCard(cardId)} disabled={Boolean(cardDisabledReason(cardId))}>{t.play}</button>
                <button class="secondary" on:click={() => discardCard(cardId)}>{t.discard}</button>
              </div>
            </article>
          {/each}
        </div>
      </section>

      <section class="cc-panel">
        <h3>{t.table}: {room.currentHole}</h3>
        <div class="cc-played">
          {#each room.played as play}
            {@const card = getCard(play.cardId)}
            <article>
              <strong>{card.title[language]}</strong>
              <span>{playerName(play.playerId)} -> {playerName(play.targetId)}</span>
            </article>
          {/each}
        </div>
        {#if isHost()}
          <div class="cc-score">
            {#each room.players as player}
              <label>{player.name}<input type="number" min="1" bind:value={scoreInputs[player.id]} /></label>
            {/each}
          </div>
          <button on:click={scoreHole}>{t.scoreHole}</button>
        {:else}
          <p>{t.hostOnly}</p>
        {/if}
      </section>
    </div>

    <details class="cc-rules">
      <summary>{t.rules}</summary>
      <p>{t.privacy}</p>
      <ul>
        <li>2-4 players/teams, 3 starting cards, 7-card hand limit.</li>
        <li>Each player plays at most one card per hole; each player can be targeted once per hole.</li>
        <li>Tied holes carry skins over. After an untied hole, non-winning players draw one card.</li>
      </ul>
    </details>
  {/if}
</section>

<style>
  .cc-shell {
    --cc-ink: #172033;
    --cc-muted: #687181;
    --cc-line: #dde6ea;
    --cc-panel: #ffffff;
    --cc-field: #f7faf8;
    --cc-accent: #2f7f6f;
    color: var(--cc-ink);
  }

  .cc-hero,
  .cc-panel,
  .cc-roombar,
  .cc-rules {
    border: 1px solid var(--cc-line);
    border-radius: 8px;
    background: var(--cc-panel);
  }

  .cc-hero {
    display: flex;
    justify-content: space-between;
    gap: 1rem;
    padding: 1.25rem;
    margin-bottom: 1rem;
  }

  .cc-kicker {
    margin: 0 0 .25rem;
    color: var(--cc-accent);
    font-weight: 700;
  }

  .cc-hero h2,
  .cc-panel h3,
  .cc-card h4 {
    margin-top: 0;
  }

  .cc-language,
  .cc-inline,
  .cc-actions,
  .cc-roombar {
    display: flex;
    gap: .5rem;
    align-items: center;
  }

  button {
    border: 0;
    border-radius: 6px;
    padding: .65rem .85rem;
    background: var(--cc-accent);
    color: white;
    font-weight: 700;
    cursor: pointer;
  }

  button.secondary,
  .cc-language button {
    background: #e7efec;
    color: var(--cc-ink);
  }

  button.active {
    background: var(--cc-accent);
    color: white;
  }

  button:disabled {
    opacity: .45;
    cursor: not-allowed;
  }

  input,
  select {
    width: 100%;
    box-sizing: border-box;
    border: 1px solid var(--cc-line);
    border-radius: 6px;
    padding: .65rem;
    background-color: var(--cc-field);
    color: var(--cc-ink);
  }

  label {
    display: grid;
    gap: .35rem;
    color: var(--cc-muted);
    font-weight: 700;
  }

  .cc-start,
  .cc-score {
    display: grid;
    gap: .75rem;
  }

  .cc-roombar,
  .cc-rules {
    padding: .75rem 1rem;
    margin-bottom: 1rem;
  }

  .cc-grid {
    display: grid;
    grid-template-columns: minmax(220px, .8fr) minmax(320px, 1.4fr) minmax(240px, .9fr);
    gap: 1rem;
  }

  .cc-panel {
    padding: 1rem;
    min-width: 0;
  }

  table {
    width: 100%;
    border-collapse: collapse;
  }

  th,
  td {
    border-bottom: 1px solid var(--cc-line);
    padding: .5rem;
    text-align: left;
  }

  tr.me td {
    font-weight: 700;
  }

  .cc-cards {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(210px, 1fr));
    gap: .75rem;
    margin-top: .75rem;
  }

  .cc-card {
    display: grid;
    gap: .65rem;
    border: 2px solid #b9d6ce;
    border-radius: 8px;
    padding: .9rem;
    background: #fbfdfb;
    min-height: 260px;
  }

  .cc-card span {
    color: var(--cc-accent);
    font-size: .85rem;
    font-weight: 700;
  }

  .cc-card.challenge,
  .cc-card.restriction {
    border-color: #e7b7a4;
  }

  .cc-card.defense {
    border-color: #a8c2e5;
  }

  .cc-card.recovery {
    border-color: #d2c08a;
  }

  .cc-played {
    display: grid;
    gap: .5rem;
    margin-bottom: 1rem;
  }

  .cc-played article {
    display: grid;
    gap: .2rem;
    border-left: 4px solid var(--cc-accent);
    padding: .5rem .75rem;
    background: var(--cc-field);
  }

  @media (max-width: 900px) {
    .cc-grid,
    .cc-hero {
      grid-template-columns: 1fr;
      display: grid;
    }
  }

  :global([dark]) .cc-shell {
    --cc-ink: #f0f2f1;
    --cc-muted: #b6bdb9;
    --cc-line: #303936;
    --cc-panel: #181d1b;
    --cc-field: #111614;
    --cc-accent: #63b39f;
  }
</style>

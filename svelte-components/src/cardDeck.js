export const categories = {
  advantage: { de: "Vorteil", en: "Advantage" },
  challenge: { de: "Challenge", en: "Challenge" },
  restriction: { de: "Einschraenkung", en: "Restriction" },
  defense: { de: "Abwehr", en: "Defense" },
  recovery: { de: "Rettung", en: "Recovery" },
};

export const deck = [
  {
    id: "clean-line",
    category: "advantage",
    title: { de: "Freie Linie", en: "Clean Line" },
    text: {
      de: "Du darfst nach dem Drive einen Wurf wiederholen. Das zweite Ergebnis zaehlt.",
      en: "After your drive, you may throw again. The second result counts.",
    },
  },
  {
    id: "safe-layup",
    category: "advantage",
    title: { de: "Sicherer Lay-up", en: "Safe Lay-up" },
    text: {
      de: "Vor deinem Putt ansagen: Wenn du verfehlst, zaehlt der Rueckputt als gelocht.",
      en: "Call before putting: if you miss, the comeback putt counts as made.",
    },
  },
  {
    id: "tailwind-read",
    category: "advantage",
    title: { de: "Rueckenwind gelesen", en: "Tailwind Read" },
    text: {
      de: "Du darfst fuer diesen Wurf eine Scheibe aus einer anderen Kategorie waehlen.",
      en: "For this throw, you may choose a disc from another category.",
    },
  },
  {
    id: "tight-gap",
    category: "challenge",
    title: { de: "Enge Gasse", en: "Tight Gap" },
    text: {
      de: "Zielspieler*in muss den naechsten Wurf mit Standstill ausfuehren.",
      en: "Target player must throw the next shot from a standstill.",
    },
  },
  {
    id: "wrong-hand",
    category: "challenge",
    title: { de: "Falsche Hand", en: "Wrong Hand" },
    text: {
      de: "Zielspieler*in muss den naechsten Annaher mit der schwachen Hand werfen.",
      en: "Target player must throw the next approach with their off hand.",
    },
  },
  {
    id: "putter-only",
    category: "restriction",
    title: { de: "Nur Putter", en: "Putter Only" },
    text: {
      de: "Zielspieler*in spielt dieses Loch bis zum Korb nur mit Puttern weiter.",
      en: "Target player must finish this hole using putters only.",
    },
  },
  {
    id: "no-run-up",
    category: "restriction",
    title: { de: "Kein Anlauf", en: "No Run-up" },
    text: {
      de: "Zielspieler*in darf beim naechsten Drive keinen Anlauf nehmen.",
      en: "Target player may not use a run-up on the next drive.",
    },
  },
  {
    id: "mando-mind",
    category: "restriction",
    title: { de: "Pflichtgedanke", en: "Mando Mind" },
    text: {
      de: "Zielspieler*in muss vor dem Wurf eine klare Landezone ansagen.",
      en: "Target player must call a clear landing zone before throwing.",
    },
  },
  {
    id: "calm-card",
    category: "defense",
    title: { de: "Ruhige Karte", en: "Calm Card" },
    text: {
      de: "Blocke eine gerade auf dich gespielte Challenge oder Einschraenkung.",
      en: "Block one challenge or restriction just played on you.",
    },
  },
  {
    id: "fairway-shield",
    category: "defense",
    title: { de: "Fairway-Schild", en: "Fairway Shield" },
    text: {
      de: "Ignoriere die naechste Karte, die in diesem Loch auf dich gespielt wird.",
      en: "Ignore the next card played on you this hole.",
    },
  },
  {
    id: "second-look",
    category: "recovery",
    title: { de: "Zweiter Blick", en: "Second Look" },
    text: {
      de: "Nach einem Baumtreffer: Ziehe eine Karte. Bei mehr als 7 Karten wirfst du sofort eine ab.",
      en: "After hitting a tree: draw a card. If you exceed 7 cards, discard one now.",
    },
  },
  {
    id: "scramble-mode",
    category: "recovery",
    title: { de: "Scramble-Modus", en: "Scramble Mode" },
    text: {
      de: "Wenn du ausserhalb des Fairways liegst, darfst du eine gegnerische Karte abwerfen.",
      en: "If you are off the fairway, you may discard one opponent's played card.",
    },
  },
];

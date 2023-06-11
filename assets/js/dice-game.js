const diceData = [
  [
    {
      name: "Backhand",
      quantity: 1
    }, {
      name: "Forehand",
      quantity: 2
    }, {
      name: "Roller",
      quantity: 2
    }, {
      name: "Hyzer",
      quantity: 1
    }, {
      name: "Anhyzer",
      quantity: 2
    }, {
      name: "Standstill",
      quantity: 2
    }, {
      name: "Joker",
      quantity: 1
    }
  ], [
    {
      name: "Putter",
      quantity: 2
    }, {
      name: "Midrange",
      quantity: 2
    }, {
      name: "Driver",
      quantity: 2
    }, {
      name: "Understable",
      quantity: 2
    }, {
      name: "Overstable",
      quantity: 2
    }, {
      name: "Other's choice",
      quantity: 2
    }, {
      name: "Joker",
      quantity: 1
    }
  ]
];

const dice = diceData.map(data => data.flatMap(item => Array(item.quantity).fill(item.name)));

const $dice = document.querySelectorAll(".die");

document.querySelector("[data-roll-dice]").addEventListener("click", function () {
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({
    event: 'dice_roll'
  });

  $dice.forEach((die, index) => {
    die.textContent = "...";
    window.setTimeout(() => {
      die.textContent = randomItem(dice[index]);
    }, index ? 2000 : 1000);
  });
});

const randomItem = (arr) => arr[(Math.random() * arr.length) | 0];
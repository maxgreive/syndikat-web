import CardGame from './CardGame.svelte';

const target = document.querySelector('#disc-golf-card-game-app');

if (target) {
  new CardGame({ target });
}

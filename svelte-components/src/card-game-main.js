import DiscGolfCardGame from './DiscGolfCardGame.svelte';

const target = document.querySelector('#disc-golf-card-game-app');

if (target) {
  new DiscGolfCardGame({ target });
}

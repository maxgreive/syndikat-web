<script>
  import { Heart, Info, Search, Trash2, X } from "lucide-svelte";

  export let name;
  export let className = "";
  export let filled = false;
  export let size = "1em";
  export let strokeWidth = 2;

  const icons = {
    heart: Heart,
    info: Info,
    search: Search,
    trash: Trash2,
    x: X,
  };

  $: iconComponent = icons[name];
  $: iconClass = `lucide-icon${className ? ` ${className}` : ""}${
    filled ? " is-filled" : ""
  }`;
</script>

{#if iconComponent}
  <svelte:component
    this={iconComponent}
    class={iconClass}
    {size}
    {strokeWidth}
    aria-hidden="true"
  />
{/if}

<style>
  :global(.lucide-icon) {
    display: inline-block;
    width: 1em;
    height: 1em;
    vertical-align: middle;
    flex-shrink: 0;
  }

  :global(.lucide-icon.is-filled) {
    fill: currentColor;
  }
</style>

<script>
  export let query, text, cb;
</script>

<!-- svelte-ignore a11y-invalid-attribute -->
<button
  class="button--text"
  on:click|preventDefault={() => {
    query = text;
    cb();
  }}>{text}</button
>

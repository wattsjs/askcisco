<script lang="ts">
  import type { ResponseSource } from "$lib/types";
  import { createCollapsible } from "@melt-ui/svelte";
  import { slide } from "svelte/transition";

  const { open, root, content, trigger } = createCollapsible();

  export let sources: ResponseSource[];
</script>

<div melt={$root} class="mx-auto w-full">
  <div
    class="cursor-pointer flex m-2 items-center justify-between rounded-md text-sm font-medium shadow ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-8 p-5 mx-10"
    melt={$trigger}
  >
    <span class="text-sm leading-6 font-semibold">
      Click to {$open ? "close" : "show"} all {sources.length} reference documents
    </span>
    <button class="">
      {#if $open}
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="1em"
          height="1em"
          viewBox="0 0 24 24"
          ><path
            fill="none"
            stroke="currentColor"
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M18 6L6 18M6 6l12 12"
          /></svg
        >
      {:else}
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="1em"
          height="1em"
          viewBox="0 0 24 24"
          ><path
            fill="none"
            stroke="currentColor"
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="m7 15l5 5l5-5M7 9l5-5l5 5"
          /></svg
        >
      {/if}
    </button>
  </div>

  {#if $open}
    <div melt={$content} transition:slide>
      <div class="flex flex-col gap-y-1 my-1">
        {#each sources as source}
          <a
            class="flex flex-col justify-center rounded-md text-xs shadow ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground px-4 py-2"
            href={source.source}
            target="_blank"
          >
            <span class="font-medium">{source.title}</span>
            {#if source?.subtitle}
              <span class="">{source?.subtitle}</span>
            {/if}
          </a>
        {/each}
      </div>
    </div>
  {/if}
</div>

<style lang="postcss">
  .abs-center {
    position: absolute;
    left: 50%;
    top: 50%;
    transform: translate(-50%, -50%);
  }
</style>

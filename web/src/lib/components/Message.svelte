<script lang="ts">
  import SvelteMarkdown from 'svelte-markdown'

  import type { Message } from 'ai'
  export let message: Message

  let messageBackground = message.role === 'user' ? '' : 'bg-gray-200 dark:bg-gray-700 dark:border-gray-800 rounded border border-gray-300'
</script>

<div>
  <div class="group relative mb-4 flex items-center md:-ml-12">
    {#if message.role === 'user'}
    <div class="flex h-8 w-8 shrink-0 select-none items-center justify-center rounded-md border shadow bg-background">
      
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" fill="currentColor" class="h-4 w-4"
        ><path
          d="M230.92 212c-15.23-26.33-38.7-45.21-66.09-54.16a72 72 0 1 0-73.66 0c-27.39 8.94-50.86 27.82-66.09 54.16a8 8 0 1 0 13.85 8c18.84-32.56 52.14-52 89.07-52s70.23 19.44 89.07 52a8 8 0 1 0 13.85-8ZM72 96a56 56 0 1 1 56 56 56.06 56.06 0 0 1-56-56Z"
        /></svg
      >
    </div>

    {/if}
    <div class="ml-4 flex-1 space-y-2 overflow-auto px-1">
      <div class="prose break-words dark:prose-invert prose-p:leading-relaxed prose-pre:p-0 text-sm max-w-none">
        <SvelteMarkdown source={message.content} />
        <!-- <p class="mb-2 last:mb-0">{message.content}</p> -->
      </div>
    </div>
  </div>
  <div data-orientation="horizontal" role="none" class="shrink-0 bg-border h-[1px] w-full my-4 md:my-8" />
</div>

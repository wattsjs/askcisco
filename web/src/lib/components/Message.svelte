<script lang="ts">
  import SvelteMarkdown from "svelte-markdown";

  import type { Message } from "ai";
  export let message: Message;

  export let voteStatus = "none" as "none" | "up" | "down" | "hidden";
  export let handleRate: (type: "up" | "down") => void;
</script>

<div>
  <div class="group relative mb-4 flex items-center md:-ml-12">
    {#if message.role === "user"}
      <div
        class="flex h-8 w-8 shrink-0 select-none items-center justify-center rounded-md border shadow bg-background"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 256 256"
          fill="currentColor"
          class="h-4 w-4"
          ><path
            d="M230.92 212c-15.23-26.33-38.7-45.21-66.09-54.16a72 72 0 1 0-73.66 0c-27.39 8.94-50.86 27.82-66.09 54.16a8 8 0 1 0 13.85 8c18.84-32.56 52.14-52 89.07-52s70.23 19.44 89.07 52a8 8 0 1 0 13.85-8ZM72 96a56 56 0 1 1 56 56 56.06 56.06 0 0 1-56-56Z"
          /></svg
        >
      </div>
    {/if}
    <div class="ml-4 flex-1 space-y-2 overflow-auto px-1">
      <div
        class="prose break-words dark:prose-invert prose-p:leading-relaxed prose-pre:p-0 text-sm max-w-none"
      >
        <SvelteMarkdown source={message.content} />
      </div>
    </div>

    <!-- thumbs up/down icons on right side of relative parent -->
    {#if message.role === "assistant"}
      <div
        class="absolute right-0 -mr-10 text-gray-400 flex flex-col items-center justify-center"
      >
        <button
          on:click={() => {
            if (voteStatus === "up") {
              // voteStatus = "none";
            } else {
              voteStatus = "up";
              handleRate("up");
            }
          }}
          class="flex items-center justify-center h-8 w-8 hover:text-gray-600 cursor-pointer transition-colors duration-200 ease-in-out"
        >
          {#if voteStatus !== "up"}
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
                d="M7 11v8a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1v-7a1 1 0 0 1 1-1h3a4 4 0 0 0 4-4V6a2 2 0 0 1 4 0v5h3a2 2 0 0 1 2 2l-1 5a2 3 0 0 1-2 2h-7a3 3 0 0 1-3-3"
              /></svg
            >
          {:else}
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="1em"
              height="1em"
              viewBox="0 0 24 24"
              ><g
                fill="none"
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                ><path d="M0 0h24v24H0z" /><path
                  fill="currentColor"
                  d="M13 3a3 3 0 0 1 2.995 2.824L16 6v4h2a3 3 0 0 1 2.98 2.65l.015.174L21 13l-.02.196l-1.006 5.032c-.381 1.626-1.502 2.796-2.81 2.78L17 21H9a1 1 0 0 1-.993-.883L8 20l.001-9.536a1 1 0 0 1 .5-.865a2.998 2.998 0 0 0 1.492-2.397L10 7V6a3 3 0 0 1 3-3zm-8 7a1 1 0 0 1 .993.883L6 11v9a1 1 0 0 1-.883.993L5 21H4a2 2 0 0 1-1.995-1.85L2 19v-7a2 2 0 0 1 1.85-1.995L4 10h1z"
                /></g
              ></svg
            >
          {/if}
        </button>
        <button
          on:click={() => {
            if (voteStatus === "down") {
              // voteStatus = "none";
            } else {
              voteStatus = "down";
              handleRate("down");
            }
          }}
          class="flex items-center justify-center h-8 w-8 hover:text-gray-600 cursor-pointer transition-colors duration-200 ease-in-out"
        >
          {#if voteStatus !== "down"}
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
                d="M7 13V5a1 1 0 0 0-1-1H4a1 1 0 0 0-1 1v7a1 1 0 0 0 1 1h3a4 4 0 0 1 4 4v1a2 2 0 0 0 4 0v-5h3a2 2 0 0 0 2-2l-1-5a2 3 0 0 0-2-2h-7a3 3 0 0 0-3 3"
              /></svg
            >
          {:else}
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="1em"
              height="1em"
              viewBox="0 0 24 24"
              ><g
                fill="none"
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                ><path d="M0 0h24v24H0z" /><path
                  fill="currentColor"
                  d="M13 21.008a3 3 0 0 0 2.995-2.823l.005-.177v-4h2a3 3 0 0 0 2.98-2.65l.015-.173l.005-.177l-.02-.196l-1.006-5.032c-.381-1.625-1.502-2.796-2.81-2.78L17 3.008H9a1 1 0 0 0-.993.884L8 4.008l.001 9.536a1 1 0 0 0 .5.866a2.998 2.998 0 0 1 1.492 2.396l.007.202v1a3 3 0 0 0 3 3zm-8-7a1 1 0 0 0 .993-.883L6 13.008v-9a1 1 0 0 0-.883-.993L5 3.008H4A2 2 0 0 0 2.005 4.86L2 5.01v7a2 2 0 0 0 1.85 1.994l.15.005h1z"
                /></g
              ></svg
            >
          {/if}
        </button>
      </div>
    {/if}
  </div>
  <div
    data-orientation="horizontal"
    role="none"
    class="shrink-0 bg-border h-[1px] w-full my-4 md:my-8"
  />
</div>

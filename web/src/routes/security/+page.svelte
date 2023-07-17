<script lang="ts">
  import { goto } from '$app/navigation'
  import { page } from '$app/stores'
  import EmptyState from '$lib/components/EmptyState.svelte'
  import Message from '$lib/components/Message.svelte'
  import Sources from '$lib/components/Sources.svelte'
  import { products } from '$lib/products'
  import type { DataFilter, ResponseSource } from '$lib/types'
  import { useChat } from 'ai/svelte'
  import { onMount } from 'svelte'

  export let data
  $: ({ initialMessages } = data)

  $: responseSources = [] as ResponseSource[]

  let dataFilter = {
    version: products[0].versions[0],
    product: products[0].name,
  } as DataFilter

  const { input, handleSubmit, messages, setMessages, reload } = useChat({
    api: 'api/chat',
    body: {
      filter: dataFilter,
    },
    onResponse: (response) => {
      if (response.status === 200) {
        // pull out the X-Response-Data header
        if (response.headers.has('X-Response-Data')) {
          const responseData = response.headers.get('X-Response-Data')
          if (responseData) responseSources = JSON.parse(responseData)
        }
      }
      handleScrollToBottom()
    },
    onFinish: () => {
      handleScrollToBottom()
      chatInput.focus()
    },
  })

  let chatInput: HTMLInputElement
  $: {
    // set the query string to the first message
    if ($messages.length) {
      goto(`?q=${$messages[0].content}`)
    }
  }

  onMount(async () => {
    chatInput.focus()

    // generate response if there are messages
    if (initialMessages.length) {
      setMessages(initialMessages)
      setTimeout(async () => {
        await reload()
      }, 100);
    }
  })

  $: versions = [] as string[]
  $: {
    const product = products.find((p) => p.name === dataFilter.product)
    if (product) versions = product.versions
    else versions = []

    // reset the input when the product changes
    if (versions.length && (!dataFilter.version || !versions.includes(dataFilter.version))) dataFilter.version = versions[0]
  }

  function handleScrollToBottom() {
    // scroll to the bottom of window
    window.scrollTo({
      top: document.body.scrollHeight,
      behavior: 'smooth',
    })
  }
</script>

<div class="pb-4 pt-4 md:pt-10 flex-1">
  <div class="relative mx-auto max-w-2xl px-4">
    {#if $messages.length}
      {#each $messages as message}
        <Message {message} />
      {/each}
    {:else}
      <EmptyState />
    {/if}
  </div>
</div>
<div class="sticky inset-x-0 bottom-0 bg-gradient-to-b from-muted/0 from-0% to-gray-100 to-50% dark:from-background/10 dark:from-10% dark:to-background/80">
  <div class="mx-auto sm:max-w-2xl sm:px-4">
    <Sources {responseSources} />
    <div class="space-y-4 border-t bg-background px-4 py-2 shadow-lg sm:rounded-t-xl sm:border md:py-2">
      <form
        on:submit={(e) => {
          handleSubmit(e)
          handleScrollToBottom()
        }}
      >
        <div class="flex mb-1">
          <div class="relative w-48">
            <select bind:value={dataFilter.product} class="block w-full pl-3 pr-10 py-2 text-base border-gray-300 border focus:outline-none sm:text-sm rounded-md">
              {#each products as product}
                <option>{product.name}</option>
              {/each}
            </select>
          </div>

          <div class="relative w-48 ml-4">
            <select bind:value={dataFilter.version} class="block w-full pl-3 pr-10 py-2 text-base border-gray-300 border focus:outline-none sm:text-sm rounded-md">
              {#each versions as version}
                <option>{version}</option>
              {/each}
            </select>
          </div>
        </div>
        <div class="relative flex flex-col w-full px-8 overflow-hidden max-h-60 grow bg-background sm:rounded-md sm:border sm:px-12">
          <a
            class="inline-flex items-center justify-center text-sm font-medium shadow ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input hover:bg-accent hover:text-accent-foreground absolute left-0 top-4 h-8 w-8 rounded-full bg-background p-0 sm:left-4"
            data-state="closed"
            href="/"
            on:click={(e) => {
              e.preventDefault()
              initialMessages = []
              setMessages([])
              input.set('')
              goto('/security')
              responseSources = []
              chatInput.focus()
            }}
            ><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" fill="currentColor" class="h-4 w-4"
              ><path d="M224 128a8 8 0 0 1-8 8h-80v80a8 8 0 0 1-16 0v-80H40a8 8 0 0 1 0-16h80V40a8 8 0 0 1 16 0v80h80a8 8 0 0 1 8 8Z" /></svg
            ><span class="sr-only">New Chat</span></a
          ><input
            bind:this={chatInput}
            bind:value={$input}
            tabindex="0"
            placeholder="Ask me anything..."
            spellcheck="false"
            class="min-h-[60px] w-full resize-none bg-transparent px-4 py-[1.3rem] focus-within:outline-none sm:text-sm"
            style="height: 62px !important;"
          />
          <div class="absolute right-0 top-4 sm:right-4">
            <button
              class="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground shadow-md hover:bg-primary/90 h-8 w-8 p-0"
              type="submit"
              data-state="closed"
              disabled={!$input}
              ><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" fill="currentColor" class="h-4 w-4"
                ><path d="M200 32v144a8 8 0 0 1-8 8H67.31l34.35 34.34a8 8 0 0 1-11.32 11.32l-48-48a8 8 0 0 1 0-11.32l48-48a8 8 0 0 1 11.32 11.32L67.31 168H184V32a8 8 0 0 1 16 0Z" /></svg
              ><span class="sr-only">Ask me anything...</span></button
            >
          </div>
        </div>
      </form>
      <p class="px-2 pb-1 text-center text-[10px] leading-normal text-muted-foreground hidden sm:block">
        Answers are AI generated and may not be accurate. Please validate all responses using the listed sources.
      </p>
    </div>
  </div>
</div>

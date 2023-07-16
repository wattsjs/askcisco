<script lang="ts">
  import type { ResponseSource } from "$lib/types"
  import SourcesPanel from "./SourcesPanel.svelte"

  export let responseSources = [] as ResponseSource[]
</script>
<div class="flex items-center justify-center bg-muted/90 border-t md:border-0 md:bg-transparent">
  {#if responseSources.length > 0}
    <SourcesPanel sources={responseSources} />
  {/if}
</div>

<script lang="ts">
	import GameEmbed from '$lib/components/GameEmbed.svelte';
	import type { PageData } from './$types';

	let { mission }: PageData = $props();
</script>

<svelte:head>
	<title>Hannahs Lichtwald — Spiel</title>
	<meta name="description" content="Hannahs Lichtwald spielen — direkt im Browser, kein Account, kein Download." />
</svelte:head>

<GameEmbed mission={mission} />

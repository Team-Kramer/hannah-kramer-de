<script lang="ts">
	import GameEmbed from '$lib/components/GameEmbed.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	const mission = $derived(data.mission);
</script>

<svelte:head>
	<title>Hannahs Lichtwald — Spiel</title>
	<meta name="description" content="Hannahs Lichtwald spielen — direkt im Browser, kein Account, kein Download." />
</svelte:head>

<GameEmbed mission={mission} />

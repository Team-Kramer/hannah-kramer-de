<script lang="ts">
	import { onMount } from 'svelte';

	let { mission = '' }: { mission?: string } = $props();

	// The Godot web export lives at /spiel/engine/ (staged by CI from game/.export/web).
	const src = $derived(
		mission
			? `/spiel/engine/index.html?mission=${encodeURIComponent(mission)}`
			: '/spiel/engine/index.html'
	);

	let loaded = $state(false);
	let failed = $state(false);
	let seconds = $state(0);

	onMount(() => {
		// Godot first load is ~10MB (wasm+pck, brotli). Show a friendly countdown.
		const timer = setInterval(() => (seconds += 1), 1000);
		return () => clearInterval(timer);
	});
</script>

<div class="relative h-dvh w-full overflow-hidden bg-bg">
	<!-- Boot splash: stays until the engine iframe reports load -->
	{#if !loaded}
		<div class="absolute inset-0 z-10 flex flex-col items-center justify-center gap-4 bg-bg text-center">
			<p class="animate-pulse-gold text-6xl" aria-hidden="true">🏮</p>
			<h1 class="text-3xl font-extrabold text-on-night">Hannahs Lichtwald</h1>
			<p class="max-w-sm text-lg text-on-night/70">
				{#if seconds > 20}
					Das kann dauern (ca. 10 MB beim ersten Laden) — bitte warten …
				{:else if seconds > 8}
					Noch ein Moment — der Wald wird hell …
				{:else}
					Der Wald wird hell …
				{/if}
			</p>
			{#if failed}
				<p class="max-w-sm text-on-night/60">
					Das Spiel lädt nicht. Bitte die Seite neu laden oder
					<a href="/" class="text-accent underline">zur Startseite</a>.
				</p>
			{/if}
		</div>
	{/if}

	<iframe
		src={src}
		title="Hannahs Lichtwald — Spiel"
		class="h-full w-full border-0"
		allow="fullscreen"
		allowfullscreen
		onload={() => (loaded = true)}
		onerror={() => (failed = true)}
	></iframe>
</div>

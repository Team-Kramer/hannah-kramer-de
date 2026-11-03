<script lang="ts">
	import { onMount } from 'svelte';
	import Header from '$lib/components/Header.svelte';
	import Footer from '$lib/components/Footer.svelte';
	import { de } from '$lib/i18n/de';
	import { MISSIONS } from '$lib/missions';
	import { readEngineState, NO_ENGINE_STATE, type EngineSave } from '$lib/persist/read-engine-state';

	const t = de;

	// Engine save state (client-only: IndexedDB is unavailable during SSR).
	let engineState: EngineSave = $state(NO_ENGINE_STATE);

	function formatLastPlayed(state: EngineSave): string {
		if (!state.lastPlayed) return '';
		return new Date(state.lastPlayed).toLocaleDateString('de-DE', {
			day: '2-digit',
			month: 'long',
			year: 'numeric',
			hour: '2-digit',
			minute: '2-digit'
		});
	}

	onMount(async () => {
		engineState = await readEngineState();
	});
</script>

<svelte:head>
	<title>Missionen — Hannahs Lichtwald</title>
	<meta name="description" content="Die sieben Missionen im Lichtwald — von Mitbestimmung bis Zivilcourage. Mission 01 ist jetzt spielbar." />
</svelte:head>

<Header />

<main class="min-h-screen bg-bg py-16">
	<div class="mx-auto max-w-6xl px-6">
		<h1 class="text-5xl font-extrabold text-on-night">{t.missions.title}</h1>
		<p class="mt-4 max-w-2xl text-xl text-on-night/80">{t.missions.subtitle}</p>

		<!-- World status card: read-only view of the engine's most recent save. -->
		<section class="mt-10 rounded-panel border border-accent/40 bg-on-night/5 p-6" aria-label={t.worldStatus.title}>
			<h2 class="text-2xl font-extrabold text-on-night">{t.worldStatus.title}</h2>
			{#if engineState.hasSave}
				<p class="mt-1 text-on-night/70">{t.worldStatus.subtitle}</p>
				<dl class="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
					<div class="rounded-card bg-on-night/10 p-4">
						<dt class="text-sm font-bold text-accent">{t.worldStatus.saveName}</dt>
						<dd class="mt-1 truncate text-lg font-bold text-on-night">
							{engineState.saveFileName ?? '—'}
						</dd>
					</div>
					<div class="rounded-card bg-on-night/10 p-4">
						<dt class="text-sm font-bold text-accent">{t.worldStatus.lastPlayed}</dt>
						<dd class="mt-1 text-lg font-bold text-on-night">
							{formatLastPlayed(engineState) || '—'}
						</dd>
					</div>
					<div class="rounded-card bg-on-night/10 p-4">
						<dt class="text-sm font-bold text-accent">{t.worldStatus.version}</dt>
						<dd class="mt-1 text-lg font-bold text-on-night">
							{engineState.versionMajor ?? '—'} {engineState.versionMinor ?? ''}
							{#if engineState.versionOk}
								<span class="block text-sm font-normal text-on-night/60">{t.worldStatus.versionOk}</span>
							{:else if engineState.versionMajor}
								<span class="block text-sm font-normal text-accent-hover">{t.worldStatus.versionMismatch}</span>
							{/if}
						</dd>
					</div>
					<div class="rounded-card bg-on-night/10 p-4">
						<dt class="text-sm font-bold text-accent">{t.worldStatus.tabs}</dt>
						<dd class="mt-1 text-lg font-bold text-on-night">
							{engineState.tabUnlocks?.length ?? 0}
						</dd>
					</div>
				</dl>
				{#if engineState.resources}
					<div class="mt-5 flex flex-wrap gap-3">
						{#each Object.entries(engineState.resources) as [name, value] (name)}
							<span class="rounded-pill border border-on-night/20 px-4 py-2 text-sm font-bold text-on-night/80">
								{name}: {value}
							</span>
						{/each}
					</div>
				{/if}
			{:else}
				<p class="mt-3 text-lg text-on-night/70">{t.worldStatus.noSave}</p>
			{/if}
		</section>

		<div class="mt-12 space-y-8">
			{#each MISSIONS as mission (mission.id)}
				{@const locked = !mission.playable}
				<div
					class="grid items-center gap-8 rounded-panel bg-on-night/5 p-6 md:grid-cols-[1fr_2fr]"
					class:opacity-70={locked}
				>
					<!-- TODO-IMG: {mission.imageId} | mission-{String(mission.number).padStart(2, '0')}.webp | 4:3 800×600 | batch E
					     What to show: see content/images.json for slot {mission.imageId}.
					-->
					<img
						src="/images/placeholders/{mission.imageId}.svg"
						alt={mission.title}
						class="aspect-[4/3] w-full rounded-card object-cover"
						width="640"
						height="480"
						loading="lazy"
					/>
					<div>
						<p class="text-sm font-bold text-accent">Mission {String(mission.number).padStart(2, '0')}</p>
						<h2 class="mt-1 text-3xl font-extrabold text-on-night">{mission.title}</h2>
						<p class="mt-2 font-bold text-on-night/70">{mission.theme}</p>
						<p class="mt-3 text-lg text-on-night/80">{mission.teaser}</p>
						<p class="mt-4 text-sm text-on-night/60">
							🔓 Freischaltung: {mission.unlock}
						</p>
						{#if mission.playable}
							<a
								href="/spiel/{mission.id}/"
								class="touch-target glow-gold mt-6 inline-flex items-center rounded-pill bg-accent px-8 py-4 text-lg font-bold text-on-gold transition-colors duration-200 hover:bg-accent-hover"
							>
								▶ {t.missions.play01}
							</a>
						{:else}
							<p class="mt-6 inline-flex min-h-14 items-center rounded-pill border border-on-night/20 px-6 py-3 font-bold text-on-night/50">
								🔒 {t.missions.locked}
							</p>
						{/if}
					</div>
				</div>
			{/each}
		</div>
	</div>
</main>

<Footer />

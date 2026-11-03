<script lang="ts">
	import Header from '$lib/components/Header.svelte';
	import Footer from '$lib/components/Footer.svelte';
	import { de } from '$lib/i18n/de';
	import { MISSIONS } from '$lib/missions';

	const t = de;
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
								href="/spiel/{mission.id}"
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

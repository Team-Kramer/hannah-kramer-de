<script lang="ts">
	import { onMount } from 'svelte';
	import Header from '$lib/components/Header.svelte';
	import Footer from '$lib/components/Footer.svelte';
	import { de } from '$lib/i18n/de';
	import { MISSIONS } from '$lib/missions';
	import { getAllPosts } from '$lib/blog';
	import Reveal from '$lib/ui/effects/Reveal.svelte';
	import TiltCard from '$lib/ui/effects/TiltCard.svelte';
	import GrowBar from '$lib/ui/effects/GrowBar.svelte';

	const t = de;
	const latestPosts = getAllPosts().slice(0, 3);
	const playableCount = MISSIONS.filter((m) => m.playable).length;
	const featureImages = {
		zuhoren: 'IMG-019',
		entscheiden: 'IMG-020',
		stimmen: 'IMG-021',
		welt: 'IMG-022',
		hannah: 'IMG-023'
	};

	// Ania #12 — typewriter (40ms/char, no cursor flash); static text under reduced motion
	onMount(() => {
		const el = document.querySelector<HTMLElement>('.typewriter');
		if (!el) return;
		const text = el.dataset.text ?? '';
		const reduced =
			typeof window.matchMedia === 'function' &&
			window.matchMedia('(prefers-reduced-motion: reduce)').matches;
		if (reduced) {
			el.textContent = text;
			return;
		}
		let i = 0;
		const timer = setInterval(() => {
			el.textContent = text.slice(0, ++i);
			if (i >= text.length) clearInterval(timer);
		}, 40);
		return () => clearInterval(timer);
	});
</script>

<svelte:head>
	<title>Hannahs Lichtwald — Entdeck den Lichtwald und triff mutige Entscheidungen</title>
	<meta
		name="description"
		content="Hannahs Lichtwald: ein warmes, nie gruseliges Spiel, in dem Kinder lernen, zuzuhören, mitzubestimmen und mutige Entscheidungen zu treffen. Kein Account — einfach spielen."
	/>
	<meta property="og:title" content="Hannahs Lichtwald" />
	<meta
		property="og:description"
		content="Ein Spiel über Mut, Zuhören und Mitbestimmung — von Hannah, für Kinder."
	/>
	<meta property="og:image" content="/images/placeholders/IMG-033.svg" />
	<meta property="og:type" content="website" />
</svelte:head>

<Header />

<main>
	<!-- 1. HERO -->
	<section class="relative overflow-hidden bg-bg py-20 md:py-28">
		<!-- soft glowing light-blobs (Ania #3 metaball, reduced-motion safe) +
		     Ania #15 scroll parallax (≤20px, feature-detected, no-op elsewhere) -->
		<div class="fireflies hero-parallax" aria-hidden="true"></div>
		<!-- Ania #9 blend-mode overlay (subtle soft-light texture) -->
		<div class="blend-texture" aria-hidden="true"></div>
		<div class="relative mx-auto grid max-w-6xl items-center gap-12 px-6 md:grid-cols-2">
			<div>
				<h1 class="text-5xl font-extrabold leading-tight text-on-night md:text-6xl">
					<span class="gradient-gold">{t.hero.headline}</span>
				</h1>
				<p class="mt-4 text-xl text-on-night/80">{t.hero.subline}</p>
				<p class="typewriter mt-6 text-lg font-bold text-accent" data-text={t.hero.tagline} aria-label={t.hero.tagline}></p>
				<div class="mt-10 flex flex-wrap gap-4">
					<!-- Ania #6 glow button + #14 pulse ring (single primary CTA per page) -->
					<a
						href="/spiel/mission-01/"
						class="touch-target glow-gold glow-button pulse-ring inline-flex items-center rounded-pill bg-accent px-8 py-4 text-lg font-bold text-on-gold transition-colors duration-200 hover:bg-accent-hover"
					>
						{t.hero.ctaPlay} →
					</a>
					<a
						href="#profile"
						class="touch-target btn-lift inline-flex items-center rounded-pill border border-on-night/30 px-8 py-4 text-lg font-bold text-on-night transition-colors duration-200 hover:bg-on-night/10"
					>
						{t.hero.ctaProfile}
					</a>
				</div>
			</div>
			<div>
				<!-- TODO-IMG: IMG-018 | hero.webp | 16:9 1600×900 | batch D
				     What to show: Hannah with her lantern standing at the edge of the
				     magical night forest, a glowing path leading into the light,
				     fireflies, indigo sky, sense of beginning.
				     Style lock: children's book illustration, soft warm lighting, no horror.
				-->
				<img
					src="/images/placeholders/IMG-018.svg"
					alt="Hannah mit ihrer Laterne am Rand des Nachtwaldes"
					class="hero-image aspect-video w-full rounded-panel object-cover shadow-md"
					width="1600"
					height="900"
				/>
			</div>
		</div>
	</section>

	<!-- 2. PROFILE -->
	<section id="profile" class="bg-surface py-20">
		<div class="mx-auto grid max-w-6xl items-center gap-12 px-6 md:grid-cols-[1fr_2fr]">
			<div>
				<!-- TODO-IMG: IMG-024 | profile.webp | 1:1 512×512 | batch D
				     What to show: Hannah's portrait — real photo if available, otherwise
				     a warm illustrated portrait (same style lock, indigo background, gold rim light).
				-->
				<img
					src="/images/placeholders/IMG-024.svg"
					alt="Porträt von Hannah Kramer"
					class="aspect-square w-full max-w-xs rounded-panel object-cover shadow-soft"
					width="512"
					height="512"
					loading="lazy"
				/>
			</div>
			<div>
				<h2 class="text-4xl font-extrabold text-text">{t.profile.title}</h2>
				<p class="mt-4 text-lg leading-relaxed text-text-secondary">{t.profile.bio}</p>
				<div class="mt-8 flex flex-wrap gap-4">
					<a
						href="https://github.com/Team-Kramer"
						target="_blank"
						rel="noopener noreferrer"
						class="touch-target inline-flex items-center rounded-pill border border-border bg-surface-elevated px-6 py-3 font-bold text-text transition-colors duration-200 hover:bg-accent-light"
					>
						{t.profile.links.github}
					</a>
					<a
						href="/blog/"
						class="touch-target inline-flex items-center rounded-pill border border-border bg-surface-elevated px-6 py-3 font-bold text-text transition-colors duration-200 hover:bg-accent-light"
					>
						{t.profile.links.blog}
					</a>
					<a
						href="/so-funktionierts/"
						class="touch-target inline-flex items-center rounded-pill border border-border bg-surface-elevated px-6 py-3 font-bold text-text transition-colors duration-200 hover:bg-accent-light"
					>
						{t.profile.links.soFunktionierts}
					</a>
				</div>
			</div>
		</div>
	</section>

	<!-- 3. BLOG (before the game) -->
	<section class="bg-surface-elevated py-20">
		<div class="mx-auto max-w-6xl px-6">
			<h2 class="text-4xl font-extrabold text-text">{t.blog.title}</h2>
			<p class="mt-3 max-w-2xl text-lg text-text-secondary">{t.blog.subtitle}</p>
			<div class="mt-10 grid gap-6 md:grid-cols-3">
				{#each latestPosts as post (post.slug)}
					<Reveal>
						<a
							href="/blog/{post.slug}/"
							class="block h-full rounded-panel border border-border bg-surface p-6 shadow-soft transition-shadow duration-200 hover:shadow-md"
						>
							<p class="text-sm font-semibold text-text-secondary">
								{new Date(post.date).toLocaleDateString('de-DE', { year: 'numeric', month: 'long', day: 'numeric' })}
							</p>
							<h3 class="mt-2 text-xl font-bold text-text">{post.title}</h3>
							<p class="mt-2 text-text-secondary">{post.description}</p>
						</a>
					</Reveal>
				{/each}
			</div>
			<a
				href="/blog/"
				class="touch-target mt-8 inline-flex items-center rounded-pill border border-border px-6 py-3 font-bold text-text transition-colors duration-200 hover:bg-accent-light"
			>
				{t.blog.allPosts} →
			</a>
		</div>
	</section>

	<!-- 4. FEATURE SECTIONS (alternating image/text, sokker-style) -->
	<section class="bg-surface py-20">
		<div class="mx-auto max-w-6xl px-6">
			<h2 class="text-center text-4xl font-extrabold text-text">{t.features.title}</h2>
			<div class="mt-14 space-y-16">
				{#each t.features.sections as feature, i (feature.id)}
					{@const imgId = featureImages[feature.id]}
					{@const flip = i % 2 === 1}
					<div class="grid items-center gap-10 md:grid-cols-2">
						<div class={flip ? 'md:order-2' : ''}>
							<!-- TODO-IMG: {imgId} | feature-{feature.id}.webp | 4:3 800×600 | batch D
							     What to show: see content/images.json for slot {imgId}.
							     Style lock: children's book illustration, soft warm lighting, no horror.
							-->
							<img
								src="/images/placeholders/{imgId}.svg"
								alt={feature.headline}
								class="aspect-[4/3] w-full rounded-panel object-cover shadow-soft"
								width="800"
								height="600"
								loading="lazy"
							/>
						</div>
						<div class={flip ? 'md:order-1' : ''}>
							<h3 class="text-3xl font-extrabold text-text">{feature.headline}</h3>
							<p class="mt-4 text-lg leading-relaxed text-text-secondary">{feature.pitch}</p>
							<a
								href={feature.link}
								class="mt-6 inline-flex min-h-14 items-center gap-2 text-lg font-bold text-accent-hover hover:underline"
							>
								{feature.linkLabel} →
							</a>
						</div>
					</div>
				{/each}
			</div>
		</div>
	</section>

	<!-- 5. MISSION PREVIEWS -->
	<section class="bg-bg py-20">
		<div class="mx-auto max-w-6xl px-6">
			<h2 class="text-4xl font-extrabold text-on-night">{t.missions.title}</h2>
			<p class="mt-3 max-w-2xl text-lg text-on-night/80">{t.missions.subtitle}</p>
			<div class="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
				{#each MISSIONS as mission (mission.id)}
					{@const locked = !mission.playable}
					<!-- Ania #11 tilt (max 4°, fine-pointer only) + #10 clip-path reveal +
					     #4 rotating glow marks the current (playable) mission -->
					<TiltCard class="h-full">
						<Reveal class="h-full {locked ? '' : 'rotating-glow'}">
							<a
								href={locked ? '/missionen' : '/spiel/' + mission.id}
								class="group block h-full overflow-hidden rounded-panel bg-on-night/5 transition-shadow duration-200 hover:shadow-md"
								aria-label={locked ? mission.title + ' — ' + t.missions.locked : t.missions.play01 + ': ' + mission.title}
							>
						<!-- TODO-IMG: {mission.imageId} | mission-{String(mission.number).padStart(2, '0')}.webp | 4:3 800×600 | batch E
						     What to show: see content/images.json for slot {mission.imageId}.
						-->
						<img
							src="/images/placeholders/{mission.imageId}.svg"
							alt={mission.title}
							class="aspect-[4/3] w-full object-cover transition-opacity duration-200 group-hover:opacity-90 {locked ? 'opacity-50' : ''}"
							width="640"
							height="480"
							loading="lazy"
						/>
							<div class="p-5">
								<p class="text-sm font-bold text-accent">Mission {String(mission.number).padStart(2, '0')}</p>
								<h3 class="mt-1 text-xl font-bold text-on-night">{mission.title}</h3>
								<p class="mt-1 text-sm text-on-night/70">{mission.theme}</p>
								<p class="mt-3 text-sm font-bold {locked ? 'text-on-night/50' : 'text-accent'}">
									{locked ? '🔒 ' + t.missions.locked : '▶ ' + t.missions.play01}
								</p>
							</div>
						</a>
						</Reveal>
					</TiltCard>
				{/each}
			</div>
			<div class="mt-8">
				<a
					href="/missionen/"
					class="touch-target inline-flex items-center rounded-pill border border-on-night/30 px-6 py-3 font-bold text-on-night transition-colors duration-200 hover:bg-on-night/10"
				>
					{t.missions.allMissions} →
				</a>
			</div>
		</div>
	</section>

	<!-- 6. STATS STRIP -->
	<section class="border-y border-on-night/10 bg-forest py-12">
		<div class="mx-auto flex max-w-6xl flex-wrap items-center justify-center gap-x-12 gap-y-4 px-6">
			{#each [t.stats.missions, t.stats.characters, t.stats.resources, t.stats.ways, t.stats.accounts, t.stats.hosting] as stat (stat)}
				<p class="text-xl font-extrabold text-on-night">{stat}</p>
			{/each}
		</div>
		<!-- Ania #13 grow bar: world progress (1 of 7 missions playable) -->
		<div class="mx-auto mt-8 max-w-md px-6">
			<p class="mb-2 text-center text-sm font-bold text-on-night/80">
				Wald-Fortschritt: {playableCount} von {MISSIONS.length} Missionen
			</p>
			<GrowBar percent={(playableCount / MISSIONS.length) * 100} label="Wald-Fortschritt" />
		</div>
	</section>

	<!-- 7. FINAL CTA + SAAS STRIP -->
	<section class="bg-bg py-20">
		<div class="mx-auto max-w-4xl px-6 text-center">
			<h2 class="text-4xl font-extrabold text-on-night md:text-5xl">{t.cta.title}</h2>
			<p class="mt-4 text-xl text-on-night/80">{t.cta.subtitle}</p>
			<a
				href="/spiel/mission-01/"
				class="touch-target glow-gold glow-button mt-10 inline-flex items-center rounded-pill bg-accent px-10 py-5 text-xl font-bold text-on-gold transition-colors duration-200 hover:bg-accent-hover"
			>
				{t.cta.play} →
			</a>
		</div>
		<div class="mx-auto mt-16 max-w-4xl px-6">
			<div class="glass rounded-panel p-8 text-center">
				<h3 class="text-2xl font-extrabold text-on-night">{t.cta.saasTitle}</h3>
				<p class="mt-3 text-on-night/80">{t.cta.saasText}</p>
				<a
					href="https://github.com/Team-Kramer"
					target="_blank"
					rel="noopener noreferrer"
					class="touch-target btn-lift mt-6 inline-flex items-center rounded-pill border border-on-night/30 px-6 py-3 font-bold text-on-night transition-colors duration-200 hover:bg-on-night/10"
				>
					{t.cta.saasLink} →
				</a>
			</div>
		</div>
	</section>
</main>

<Footer />

<style>
	/* Ania #3 — soft glowing light-blobs ("fireflies in the night"), 6s cycle, reduced-motion safe */
	.fireflies {
		position: absolute;
		inset: 0;
		background:
			radial-gradient(400px circle at 20% 30%, rgba(245, 185, 66, 0.12), transparent 60%),
			radial-gradient(500px circle at 80% 70%, rgba(245, 185, 66, 0.08), transparent 60%),
			radial-gradient(300px circle at 60% 20%, rgba(255, 249, 239, 0.06), transparent 60%);
		animation: blob-drift 6s var(--ease-out-soft) infinite alternate;
		pointer-events: none;
	}
	@keyframes blob-drift {
		from {
			transform: translate(0, 0);
		}
		to {
			transform: translate(20px, -15px);
		}
	}

	/* Ania #8 — gradient text (hero headline only) */
	.gradient-gold {
		background: linear-gradient(120deg, var(--color-accent), var(--color-surface));
		-webkit-background-clip: text;
		background-clip: text;
		color: transparent;
	}
	@supports not ((-webkit-background-clip: text) or (background-clip: text)) {
		.gradient-gold {
			color: var(--color-on-night);
		}
	}

	/* Ania #12 — typewriter (hero tagline, 40ms/char, no cursor flash) */
	.typewriter {
		min-height: 1.5em;
	}

	/* Ania #7 — mirror/reflection on hero image (progressive enhancement) */
	.hero-image {
		-webkit-box-reflect: below 12px linear-gradient(transparent 60%, rgba(255, 249, 239, 0.08));
	}

	@media (prefers-reduced-motion: reduce) {
		.fireflies {
			animation: none;
		}
	}
</style>

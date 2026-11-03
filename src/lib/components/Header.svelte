<script lang="ts">
	import { de } from '$lib/i18n/de';
	const t = de;
</script>

<!-- Ania #1 glass + #2 improved frosted glass (sticky nav) -->
<header class="sticky top-0 z-50 glass frosted-nav border-b border-on-night/10">
	<nav class="mx-auto flex max-w-6xl items-center justify-between px-6 py-3" aria-label="Hauptnavigation">
		<a href="/" class="flex items-center gap-2 text-lg font-extrabold text-on-night">
			<span aria-hidden="true">🏮</span>
			<span>Hannahs Lichtwald</span>
		</a>
		<div class="hidden items-center gap-1 md:flex">
			{#each [
				['/missionen', t.nav.missionen],
				['/spiel/', t.nav.spiel],
				['/so-funktionierts', t.nav.soFunktionierts],
				['/blog', t.nav.blog]
			] as [href, label]}
				<a
					href={href}
					class="touch-target inline-flex items-center rounded-pill px-4 text-base font-bold text-on-night/80 transition-colors duration-150 hover:bg-on-night/10 hover:text-on-night"
				>
					{label}
				</a>
			{/each}
		</div>
		<a
			href="/spiel/mission-01/"
			class="touch-target inline-flex items-center rounded-pill bg-accent px-5 py-2.5 text-base font-bold text-on-gold transition-colors duration-150 hover:bg-accent-hover"
		>
			{t.hero.ctaPlay}
		</a>
	</nav>
</header>

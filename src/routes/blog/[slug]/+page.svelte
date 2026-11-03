<script lang="ts">
	import type { PageData } from './$types';

	let { post }: PageData = $props();

	function formatDate(iso: string): string {
		return new Date(iso).toLocaleDateString('de-DE', {
			year: 'numeric',
			month: 'long',
			day: 'numeric'
		});
	}
</script>

<svelte:head>
	<title>{post.title} — Hannahs Lichtwald</title>
	<meta name="description" content={post.description} />
	<meta property="og:title" content={post.title} />
	<meta property="og:description" content={post.description} />
	<meta property="og:type" content="article" />
	<meta property="og:image" content="/images/placeholders/IMG-033.svg" />
</svelte:head>

<article class="min-h-screen bg-surface py-16">
	<div class="mx-auto max-w-2xl px-6">
		<a href="/blog" class="inline-flex min-h-14 items-center gap-2 rounded-pill px-4 text-lg font-bold text-text-secondary hover:text-text">
			← Alle Beiträge
		</a>

		<header class="mt-8">
			<p class="text-sm font-semibold text-text-secondary">
				{formatDate(post.date)} · {post.readingTime}
			</p>
			<h1 class="mt-2 text-4xl font-extrabold text-text">{post.title}</h1>
		</header>

		<div class="prose-lichtwald mt-8">
			{@html post.body}
		</div>

		<footer class="mt-12 border-t border-border pt-8">
			<a
				href="/spiel/mission-01"
				class="touch-target inline-block rounded-pill bg-accent px-8 py-4 text-lg font-bold text-on-gold"
			>
				Jetzt Mission 01 spielen
			</a>
		</footer>
	</div>
</article>

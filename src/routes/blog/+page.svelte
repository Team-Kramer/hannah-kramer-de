<script lang="ts">
	import type { PageData } from './$types';

	let { posts }: PageData = $props();

	function formatDate(iso: string): string {
		return new Date(iso).toLocaleDateString('de-DE', {
			year: 'numeric',
			month: 'long',
			day: 'numeric'
		});
	}
</script>

<svelte:head>
	<title>Blog — Hannahs Lichtwald</title>
	<meta name="description" content="Beiträge über den Bau von Hannahs Lichtwald — ein Spiel über mutige Entscheidungen." />
</svelte:head>

<main class="min-h-screen bg-surface py-16">
	<div class="mx-auto max-w-3xl px-6">
		<h1 class="text-4xl font-extrabold text-text">Blog</h1>
		<p class="mt-3 text-lg text-text-secondary">
			Notizen aus dem Lichtwald — über Spiele, Entscheidungen und das Zuhören.
		</p>

		<div class="mt-10 space-y-6">
			{#each posts as post (post.slug)}
				<a
					href="/blog/{post.slug}"
					class="block rounded-panel border border-border bg-surface-elevated p-6 shadow-soft transition-shadow duration-200 hover:shadow-md"
				>
					<p class="text-sm font-semibold text-text-secondary">
						{formatDate(post.date)} · {post.readingTime}
					</p>
					<h2 class="mt-2 text-2xl font-bold text-text">{post.title}</h2>
					<p class="mt-2 text-text-secondary">{post.description}</p>
				</a>
			{/each}
		</div>
	</div>
</main>

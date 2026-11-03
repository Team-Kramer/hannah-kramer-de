<script lang="ts">
	import Header from '$lib/components/Header.svelte';
	import Footer from '$lib/components/Footer.svelte';
</script>

<svelte:head>
	<title>Impressum — Hannahs Lichtwald</title>
</svelte:head>

<Header />

<main class="min-h-screen bg-surface py-16">
	<div class="mx-auto max-w-2xl px-6">
		<h1 class="text-4xl font-extrabold text-text">Impressum</h1>
		<div class="prose-lichtwald mt-8">
			<p>
				<!-- TODO: echte Angaben eintragen (Name, Anschrift, E-Mail) — Hannah/Martin -->
				Hannah Kramer<br />
				[Anschrift eintragen]<br />
				E-Mail: [E-Mail eintragen]
			</p>
			<p>
				Verantwortlich für den Inhalt: Hannah Kramer (in Zusammenarbeit mit der Familie Kramer).
			</p>
			<p>
				Plattform: GitHub Pages — https://github.com/Team-Kramer/hannah-kramer-de
			</p>
			<p>
				<!-- TODO: EU-Streitschlichtung / Verbraucherstreitbeilegung ergänzen, falls erforderlich -->
			</p>
		</div>
	</div>
</main>

<Footer />

<script lang="ts">
	import Header from '$lib/components/Header.svelte';
	import Footer from '$lib/components/Footer.svelte';
</script>

<svelte:head>
	<title>Über Hannahs Lichtwald</title>
	<meta
		name="description"
		content="Hannahs Lichtwald ist ein interaktives Spiel über Mitbestimmung, Fairness und Zusammenhalt."
	/>
	<link rel="canonical" href="https://hannah-kramer.de/ueber/" />
</svelte:head>

<Header />

<main class="min-h-screen bg-surface py-16">
	<div class="mx-auto max-w-3xl px-6">
		<p class="text-sm font-bold uppercase tracking-widest text-accent">Über das Projekt</p>
		<h1 class="mt-3 text-5xl font-extrabold text-text">Ein Lichtwald, in dem jede Stimme zählt.</h1>
		<div class="prose-lichtwald mt-8">
			<p>
				Hannahs Lichtwald ist ein erzählerisches Spiel über Mitbestimmung, Fairness und
				Zusammenhalt. In einer warmen, magischen Welt erleben Kinder Situationen, in denen es
				keine einfache oder einzig richtige Antwort gibt.
			</p>

			<h2>Entscheidungen gemeinsam erleben</h2>
			<p>
				Die Missionen laden dazu ein, unterschiedliche Sichtweisen kennenzulernen, zuzuhören und
				Verantwortung für gemeinsame Entscheidungen zu übernehmen. Es gibt keinen Zeitdruck und
				keine Punkte für „richtige“ Antworten. Das Spiel soll Gespräche ermöglichen — nicht
				vorgeben, was jemand denken oder entscheiden muss.
			</p>

			<h2>Ein Projekt von Martin Kramer</h2>
			<p>
				Ich bin Martin Kramer und verantworte Hannahs Lichtwald. Das Projekt wächst Schritt für
				Schritt; aktuell ist Mission 01 spielbar. Die Website und das Spiel werden als statisches
				Angebot bereitgestellt. Mehr zu den Missionen und ihren Entscheidungswegen findest du auf
				<a href="/missionen/">der Missionsübersicht</a> und unter
				<a href="/so-funktionierts/">So funktioniert’s</a>.
			</p>

			<h2>Kontakt</h2>
			<p>
				Fragen, Ideen oder Rückmeldungen? Schreib mir an
				<a href="mailto:info@julia-kramer.de">info@julia-kramer.de</a>.
			</p>
		</div>
	</div>
</main>

<Footer />

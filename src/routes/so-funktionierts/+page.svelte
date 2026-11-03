<script lang="ts">
	import Header from '$lib/components/Header.svelte';
	import Footer from '$lib/components/Footer.svelte';
</script>

<svelte:head>
	<title>So funktioniert’s — Hannahs Lichtwald</title>
	<meta
		name="description"
		content="Für Eltern & Pädagog:innen: Was der Lichtwald lehrt, wie die drei Entscheidungswege funktionieren, und warum nichts im Spiel gruselig ist."
	/>
</svelte:head>

<Header />

<main class="min-h-screen bg-surface py-16">
	<div class="mx-auto max-w-3xl px-6">
		<h1 class="text-5xl font-extrabold text-text">So funktioniert’s</h1>
		<p class="mt-4 text-xl text-text-secondary">
			Für Eltern und Pädagog:innen — was der Lichtwald lehrt und wie er funktioniert.
		</p>

		<section class="mt-12">
			<h2 class="text-3xl font-extrabold text-text">Was das Spiel lehrt</h2>
			<p class="mt-4 text-lg leading-relaxed text-text-secondary">
				Der Lichtwald ist kein Lernspiel mit Quiz-Fragen. Er ist eine
				<strong>magische Welt, in der Kinder demokratische Situationen selbst erleben</strong> —
				ohne Punkte, ohne Zeitdruck, ohne „falsche“ Antworten.
			</p>
			<ul class="mt-6 space-y-4">
				{#each [
					['Mitbestimmung', 'Jede Stimme zählt. Kinder erleben, dass ihre Meinung Wirkung hat — und dass Mitbestimmen Arbeit ist.'],
					['Fairness', 'Ressourcen sind knapp. Kinder lernen, dass man nicht alles gleichzeitig kann — und dass das okay ist.'],
					['Zivilcourage', 'In Mission 05 muss jemand eingreifen, der ausgegrenzt wird. Kinder üben, sich zu trauen.'],
					['Verantwortung', 'Wer selbst entscheidet, trägt die Konsequenz. Wer moderiert, trägt die Verantwortung für den Prozess.']
				] as [title, desc]}
					<li class="rounded-card border border-border bg-surface-elevated p-5">
						<p class="text-lg font-bold text-text">{title}</p>
						<p class="mt-1 text-text-secondary">{desc}</p>
					</li>
				{/each}
			</ul>
		</section>

		<section class="mt-12">
			<h2 class="text-3xl font-extrabold text-text">Die drei Entscheidungswege</h2>
			<p class="mt-4 text-lg leading-relaxed text-text-secondary">
				In jeder Mission gibt es drei Wege, zu einer Entscheidung zu kommen.
				Kein Weg ist „besser“ — jeder hat andere Stärken und andere Folgen.
			</p>
			<div class="mt-6 overflow-x-auto">
				<table class="w-full border-collapse text-left">
					<thead>
						<tr>
							<th class="border border-border bg-accent-light p-3">Weg</th>
							<th class="border border-border bg-accent-light p-3">Wie es funktioniert</th>
							<th class="border border-border bg-accent-light p-3">Was es übt</th>
						</tr>
					</thead>
					<tbody class="text-text-secondary">
						<tr>
							<td class="border border-border p-3 font-bold text-text">Selbst entscheiden</td>
							<td class="border border-border p-3">Hannah trifft die Entscheidung allein. Ihre Freundschaften wiegen mit.</td>
							<td class="border border-border p-3">Verantwortung tragen</td>
						</tr>
						<tr>
							<td class="border border-border p-3 font-bold text-text">Abstimmen lassen</td>
							<td class="border border-border p-3">Jede Stimme zählt. Freundschaften geben ein Gewicht. Bei Gleichstand gewinnt die leiseste Stimme.</td>
							<td class="border border-border p-3">Demokratie & Kompromisse</td>
						</tr>
						<tr>
							<td class="border border-border p-3 font-bold text-text">Moderieren</td>
							<td class="border border-border p-3">Hannah hilft allen, einen gemeinsamen Kompromiss zu finden, mit dem alle leben können.</td>
							<td class="border border-border p-3">Vermitteln & Zuhören</td>
						</tr>
					</tbody>
				</table>
			</div>
		</section>

		<section class="mt-12">
			<h2 class="text-3xl font-extrabold text-text">Das „nie gruselig“-Versprechen</h2>
			<p class="mt-4 text-lg leading-relaxed text-text-secondary">
				Der Lichtwald spielt nachts — aber nichts in ihm ist furchteinflößend.
				Sogar der „Schatten der Eile“ (die einzige negative Kraft) ist ein sanftes,
				neugieriges Wölkchen mit einer kleinen Uhr. Es gibt keine Monster, keine
				Angst-Sprünge, keine Strafen. Ein schlechter Ausgang bedeutet: die Welt
				wird ein Stück weniger hell — und man kann es besser machen.
			</p>
		</section>

		<section class="mt-12">
			<h2 class="text-3xl font-extrabold text-text">Datenschutz</h2>
			<p class="mt-4 text-lg leading-relaxed text-text-secondary">
				<strong>Es wird nichts gespeichert, nichts getrackt, nichts übertragen.</strong>
				Dein Spielstand liegt ausschließlich in deinem Browser (localStorage).
				Es gibt keine Accounts, keine Werbung, keine Cookies.
				Die Seite ist komplett statisch und wird auf GitHub Pages gehostet.
			</p>
		</section>

		<section id="eigene-mission" class="mt-12">
			<h2 class="text-3xl font-extrabold text-text">Eigene Mission bauen</h2>
			<p class="mt-4 text-lg leading-relaxed text-text-secondary">
				Jede Mission im Lichtwald ist strukturierte Daten: Charaktere, Optionen,
				Ressourcen, Folgen. Das bedeutet: <strong>Missionen lassen sich wie
				Bausteine zusammenstellen</strong> — von Kindern, mit Kindern, für Kinder.
			</p>
			<p class="mt-4 text-lg leading-relaxed text-text-secondary">
				Der Missions-Editor ist in Arbeit. Bis dahin: die Struktur einer Mission
				ist so einfach, dass sie sich auf ein Blatt Papier schreiben lässt —
				wer mitmachen will, schreibt Hannah an.
			</p>
		</section>

		<div class="mt-14 flex flex-wrap gap-4">
			<a
				href="/spiel/mission-01"
				class="touch-target glow-gold inline-flex items-center rounded-pill bg-accent px-8 py-4 text-lg font-bold text-on-gold transition-colors duration-200 hover:bg-accent-hover"
			>
				Selbst ausprobieren →
			</a>
			<a
				href="https://github.com/Team-Kramer/hannah-kramer-de"
				target="_blank"
				rel="noopener noreferrer"
				class="touch-target inline-flex items-center rounded-pill border border-border px-8 py-4 text-lg font-bold text-text transition-colors duration-200 hover:bg-accent-light"
			>
				Quellcode (GitHub)
			</a>
		</div>
	</div>
</main>

<Footer />

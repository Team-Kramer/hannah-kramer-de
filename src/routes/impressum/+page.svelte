<script lang="ts">
	import Header from '$lib/components/Header.svelte';
	import Footer from '$lib/components/Footer.svelte';
</script>

<svelte:head>
	<title>Impressum — Hannahs Lichtwald</title>
	<meta
		name="description"
		content="Impressum von Hannahs Lichtwald mit Angaben zum Anbieter und zur redaktionellen Verantwortung."
	/>
	<link rel="canonical" href="https://hannah-kramer.de/impressum/" />
</svelte:head>

<Header />

<main class="min-h-screen bg-surface py-16">
	<div class="mx-auto max-w-2xl px-6">
		<h1 class="text-4xl font-extrabold text-text">Impressum</h1>
		<div class="prose-lichtwald mt-8">
			<h2>Angaben gemäß § 5 DDG</h2>
			<p>
				Martin Kramer<br />
				Am Anger 4<br />
				33758 Schloß Holte-Stukenbrock<br />
				Deutschland
			</p>

			<h2>Kontakt</h2>
			<p>
				E-Mail: <a href="mailto:info@martin-kramer.com">info@martin-kramer.com</a>
			</p>

			<h2>Verantwortlich für journalistisch-redaktionelle Inhalte</h2>
			<p>
				Martin Kramer<br />
				Am Anger 4<br />
				33758 Schloß Holte-Stukenbrock<br />
				Deutschland
			</p>

			<h2>Hinweis zum Rechtsstand</h2>
			<p>
				Die Anbieterkennzeichnung richtet sich nach § 5 DDG. Weitere Angaben – etwa eine
				Umsatzsteuer-Identifikationsnummer oder Registerdaten – sind nur aufzunehmen, wenn sie für
				den Anbieter tatsächlich bestehen und einschlägig sind.
			</p>
			<a href="https://www.gesetze-im-internet.de/ddg/__5.html" rel="noreferrer">
				§ 5 Digitale-Dienste-Gesetz
			</a>
		</div>
	</div>
</main>

<Footer />

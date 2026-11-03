<script lang="ts">
	import Header from '$lib/components/Header.svelte';
	import Footer from '$lib/components/Footer.svelte';
</script>

<svelte:head>
	<title>Datenschutz — Hannahs Lichtwald</title>
	<meta
		name="description"
		content="Datenschutzerklärung: Es wird nichts getrackt. Keine Cookies, keine Analyse, keine Accounts. Spielstände bleiben im Browser."
	/>
</svelte:head>

<Header />

<main class="min-h-screen bg-surface py-16">
	<div class="mx-auto max-w-2xl px-6">
		<h1 class="text-4xl font-extrabold text-text">Datenschutzerklärung</h1>
		<div class="prose-lichtwald mt-8">
			<h2>Die kurze Version</h2>
			<p>
				<strong>Es wird nichts getrackt.</strong> Keine Cookies, keine Analyse-Tools,
				keine Werbung, keine Accounts. Wenn du diese Seite verlässt, wissen wir
				nichts von dir — und wissen auch nichts, während du hier bist.
			</p>

			<h2>1. Verantwortliche Stelle</h2>
			<p>
				<!-- TODO: echte Angaben eintragen -->
				Hannah Kramer, [Anschrift eintragen], E-Mail: [E-Mail eintragen].
			</p>

			<h2>2. Was passiert mit deinen Daten</h2>
			<p>
				Beim Aufruf der Website werden technisch notwendige Server-Logdaten
				(Adresse des anfragenden Servers, Zeitpunkt, aufgerufene Seite) durch den
				Hosting-Dienst <strong>GitHub Pages</strong> (GitHub Inc., USA) verarbeitet.
				Diese Daten sind für die Auslieferung der Seite erforderlich und werden
				automatisch gelöscht.
			</p>

			<h2>3. Das Spiel — wo liegt dein Spielstand</h2>
			<p>
				Der Spielstand von Mission 01 wird <strong>ausschließlich lokal in deinem
				Browser</strong> gespeichert (IndexedDB / localStorage). Er verlässt dein
				Gerät nicht, wird nicht übertragen und nicht ausgewertet. Du kannst ihn
				jederzeit löschen, indem du die Browser-Daten für diese Seite löschst.
			</p>

			<h2>4. Keine Cookies, keine Analyse, keine Werbung</h2>
			<p>
				Diese Website setzt keine Cookies. Es werden keine Tracking-, Analyse- oder
				Werbemodule eingebunden. Es gibt keine Einbettungen externer Inhalte
				(keine Videos, keine Karten, keine Schriftarten von Drittservern).
			</p>

			<h2>5. Kontakt</h2>
			<p>
				Fragen zum Datenschutz beantwortet Hannah Kramer unter
				[E-Mail eintragen].
			</p>

			<h2>6. Rechte der betroffenen Person</h2>
			<p>
				Da praktisch keine personenbezogenen Daten verarbeitet werden, gelten die
				Rechte aus Art. 15–22 DSGVO (Auskunft, Berichtigung, Löschung,
				Einschränkung, Datenübertragbarkeit, Widerspruch) in dem engen Rahmen,
				in dem Server-Logdaten vorliegen.
			</p>

			<p class="text-sm text-text-secondary">
				Stand: Februar 2026. <!-- TODO: rechtlich prüfen lassen, bevor live -->
			</p>
		</div>
	</div>
</main>

<Footer />

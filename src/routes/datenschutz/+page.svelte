<script lang="ts">
	import Header from '$lib/components/Header.svelte';
	import Footer from '$lib/components/Footer.svelte';
</script>

<svelte:head>
	<title>Datenschutz — Hannahs Lichtwald</title>
	<meta
		name="description"
		content="Datenschutzhinweise zu Hannahs Lichtwald, zum GitHub-Pages-Hosting und zum lokalen Spielstand."
	/>
	<link rel="canonical" href="https://hannah-kramer.de/datenschutz/" />
</svelte:head>

<Header />

<main class="min-h-screen bg-surface py-16">
	<div class="mx-auto max-w-2xl px-6">
		<h1 class="text-4xl font-extrabold text-text">Datenschutzerklärung</h1>
		<div class="prose-lichtwald mt-8">
			<h2>Die kurze Version</h2>
			<p>
				Es gibt keine Analyse- oder Marketingdienste, keine Tracking-Cookies und keine Accounts.
				GitHub Pages verarbeitet beim Ausliefern der Website technische Verbindungsdaten,
				einschließlich der IP-Adresse, zu Sicherheitszwecken.
			</p>

			<h2>1. Verantwortlicher</h2>
			<p>
				Martin Kramer<br />
				Am Anger 4<br />
				33758 Schloß Holte-Stukenbrock<br />
				Deutschland<br />
				E-Mail: <a href="mailto:info@julia-kramer.de">info@julia-kramer.de</a>
			</p>

			<h2>2. Hosting über GitHub Pages</h2>
			<p>
				Diese Website wird als statische Website über GitHub Pages bereitgestellt. Beim Aufruf
				können technische Verbindungsdaten, einschließlich der IP-Adresse, durch GitHub zu
				Sicherheitszwecken protokolliert werden. GitHub, Inc. hat seinen Sitz in 88 Colin P. Kelly
				Jr. Street, San Francisco, CA 94107, USA. GitHub beschreibt seine Verarbeitung in der
				<a
					href="https://docs.github.com/en/site-policy/privacy-policies/github-privacy-statement"
					rel="noreferrer"
				>GitHub Privacy Statement</a
				>.
			</p>

			<h2>3. Das Spiel und dein Spielstand</h2>
			<p>
				Der Spielstand wird von der Spiel-Engine lokal in deinem Browser in IndexedDB
				gespeichert. Die Website überträgt ihn nicht an einen Server. Du kannst ihn löschen,
				indem du die Browserdaten für diese Website entfernst.
			</p>
			<p>
				Wenn du im Spiel „Welt teilen“ verwendest, wird ein Link mit deinem Spielstand in den
				URL-Fragmentteil (nach dem Zeichen #) aufgenommen. Der Fragmentteil wird nicht bei der
				Seitenanfrage an den Hosting-Server gesendet. Wenn du den Link mit anderen teilst, können
				diese den darin enthaltenen Spielstand öffnen.
			</p>

			<h2>4. Keine Analyse- oder Marketingdienste</h2>
			<p>
				Diese Website verwendet keine Tracking-Cookies und bindet keine Analyse- oder
				Marketingdienste ein. Es werden keine externen Inhalte wie Videos, Karten oder
				Schriftarten von Drittservern geladen. Beim Aufruf externer Links gelten die
				Datenschutzbestimmungen des jeweiligen Anbieters.
			</p>

			<h2>5. Zweck und Rechtsgrundlage</h2>
			<p>
				Die Bereitstellung der Website und die Abwehr technischer Angriffe dienen dem Interesse
				an einem sicheren und funktionsfähigen Online-Angebot. Als Rechtsgrundlage für die
				hierfür erforderliche Verarbeitung kommt insbesondere Art. 6 Abs. 1 lit. f DSGVO in
				Betracht.
			</p>

			<h2>6. Kontakt und deine Rechte</h2>
			<p>
				Fragen zum Datenschutz und Anfragen zur Ausübung deiner Rechte aus Art. 15–22 DSGVO
				(Auskunft, Berichtigung, Löschung, Einschränkung, Datenübertragbarkeit und Widerspruch)
				richtest du an Martin Kramer unter
				<a href="mailto:info@julia-kramer.de">info@julia-kramer.de</a>. Du kannst dich außerdem
				bei einer Datenschutzaufsichtsbehörde beschweren, insbesondere bei der
				<a href="https://www.ldi.nrw.de/" rel="noreferrer">
					Landesbeauftragten für Datenschutz und Informationsfreiheit Nordrhein-Westfalen
				</a>.
			</p>

			<p class="text-sm text-text-secondary">
				Stand: November 2026.
			</p>
		</div>
	</div>
</main>

<Footer />

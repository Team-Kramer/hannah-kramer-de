<svelte:head>
	<title>Hannahs Lichtwald — Spiel</title>
</svelte:head>

<main class="min-h-screen bg-bg">
	<!-- Phase 4: Godot engine embed. The Web export is served at /spiel/engine/ (D8). -->
	<div class="flex min-h-screen flex-col items-center justify-center p-6 text-center">
		<p class="text-5xl" aria-hidden="true">🏮</p>
		<h1 class="mt-4 text-3xl font-extrabold text-on-night">Hannahs Lichtwald</h1>
		<p class="mt-3 max-w-md text-lg text-on-night/80">
			Das Spiel wird hier eingebettet, sobald die Godot-Web-Export in
			<code class="rounded bg-on-night/10 px-1">/spiel/engine/</code> liegt (Phase 2 + 4).
		</p>
		<a
			href="/"
			class="touch-target inline-block mt-8 rounded-pill border border-on-night/30 px-8 py-4 text-lg font-bold text-on-night"
		>
			← Zur Startseite
		</a>
	</div>
</main>

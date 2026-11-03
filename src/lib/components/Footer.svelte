<script lang="ts">
	import { de } from '$lib/i18n/de';
	const t = de;
</script>

<footer class="border-t border-on-night/10 bg-bg py-12">
	<div class="mx-auto grid max-w-6xl gap-8 px-6 md:grid-cols-3">
		<div>
			<p class="flex items-center gap-2 text-lg font-extrabold text-on-night">
				<span aria-hidden="true">🏮</span>
				Hannahs Lichtwald
			</p>
			<p class="mt-3 max-w-xs text-on-night/70">
				Ein warmes, nie gruseliges Spiel, in dem Kinder mitbestimmen.
			</p>
			<p class="mt-4 text-sm text-on-night/50">{t.footer.builtWith}</p>
		</div>
		<div>
			<p class="font-bold text-on-night">{t.footer.nav}</p>
			<ul class="mt-3 space-y-2">
				{#each [
					['/missionen', t.nav.missionen],
					['/spiel/', t.nav.spiel],
					['/so-funktionierts', t.nav.soFunktionierts],
					['/blog', t.nav.blog]
				] as [href, label]}
					<li>
						<a href={href} class="text-on-night/70 transition-colors duration-150 hover:text-on-night">{label}</a>
					</li>
				{/each}
			</ul>
		</div>
		<div>
			<p class="font-bold text-on-night">{t.footer.legal}</p>
			<ul class="mt-3 space-y-2">
				<li>
					<a href="/impressum" class="text-on-night/70 transition-colors duration-150 hover:text-on-night">{t.footer.impressum}</a>
				</li>
				<li>
					<a href="/datenschutz" class="text-on-night/70 transition-colors duration-150 hover:text-on-night">{t.footer.datenschutz}</a>
				</li>
			</ul>
		</div>
	</div>
	<p class="mt-10 text-center text-sm text-on-night/50">{t.footer.copyright}</p>
</footer>

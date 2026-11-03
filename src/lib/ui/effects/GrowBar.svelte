<script lang="ts">
	/**
	 * Ania #13 — Grow bar (gold fill on cream track).
	 * Animates from 0 to `percent` on mount; instant under reduced motion.
	 */
	import { onMount } from 'svelte';

	let {
		percent,
		label = ''
	}: {
		percent: number;
		label?: string;
	} = $props();

	let width = $state('0%');

	onMount(() => {
		const reduced =
			typeof window.matchMedia === 'function' &&
			window.matchMedia('(prefers-reduced-motion: reduce)').matches;
		const target = `${Math.min(100, Math.max(0, percent))}%`;
		if (reduced) {
			width = target;
			return;
		}
		// let the 0% state paint first so the transition runs
		requestAnimationFrame(() => {
			requestAnimationFrame(() => {
				width = target;
			});
		});
	});
</script>

<div class="grow-track w-full" role="progressbar" aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100} aria-label={label}>
	<div class="grow-fill" style="width: {width}"></div>
</div>

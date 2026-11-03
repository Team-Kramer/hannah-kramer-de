<script lang="ts">
	/**
	 * Ania #10 — Clip-path reveal (picture-book page turn, 200ms).
	 * The element starts with .reveal-hidden; when it enters the viewport
	 * the class is swapped to .reveal-shown. Without JS (or under reduced
	 * motion) the CSS fallback keeps the element visible — no hidden content.
	 */
	import { onMount, type Snippet } from 'svelte';

	let {
		class: className = '',
		children
	}: {
		class?: string;
		children?: Snippet;
	} = $props();

	let el: HTMLElement;

	onMount(() => {
		const reduced =
			typeof window.matchMedia === 'function' &&
			window.matchMedia('(prefers-reduced-motion: reduce)').matches;
		if (reduced || !('IntersectionObserver' in window)) {
			el.classList.remove('reveal-hidden');
			el.classList.add('reveal-shown');
			return;
		}
		const io = new IntersectionObserver(
			(entries) => {
				for (const entry of entries) {
					if (entry.isIntersecting) {
						el.classList.remove('reveal-hidden');
						el.classList.add('reveal-shown');
						io.disconnect();
					}
				}
			},
			{ threshold: 0.15 }
		);
		io.observe(el);
		return () => io.disconnect();
	});
</script>

<div bind:this={el} class="reveal-hidden {className}">
	{@render children?.()}
</div>

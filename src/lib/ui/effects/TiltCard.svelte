<script lang="ts">
	/**
	 * Ania #11 — Tilt card wrapper (max 4°, fine-pointer + no reduced motion).
	 */
	import { onMount, type Snippet } from 'svelte';
	import { attachTilt } from './tilt';

	let {
		class: className = '',
		children
	}: {
		class?: string;
		children?: Snippet;
	} = $props();

	let el: HTMLElement;

	onMount(() => {
		el.style.transition = 'transform 200ms ease';
		return attachTilt(el);
	});
</script>

<div bind:this={el} class="will-change-transform {className}">
	{@render children?.()}
</div>

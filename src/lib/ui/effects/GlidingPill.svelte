<script lang="ts">
	/**
	 * Ania #16 — Gliding pill (tabs). The indicator glides to the active tab;
	 * left/width are measured with getBoundingClientRect (JS-measured fallback
	 * per the plan — CSS Anchor Positioning is not relied on).
	 * Usage: <GlidingPill tabs={[['label', 'value'], ...]} bind:value />
	 */
	import { onMount, tick } from 'svelte';

	let {
		tabs,
		value = $bindable(''),
		onchange
	}: {
		tabs: [string, string][];
		value?: string;
		onchange?: (v: string) => void;
	} = $props();

	let container: HTMLElement;
	let indicator: HTMLElement;
	const tabEls: Record<string, HTMLButtonElement> = {};

	function position() {
		const el = tabEls[value];
		if (!el || !indicator) return;
		const cRect = container.getBoundingClientRect();
		const tRect = el.getBoundingClientRect();
		indicator.style.left = `${tRect.left - cRect.left}px`;
		indicator.style.width = `${tRect.width}px`;
	}

	onMount(() => {
		void tick().then(position);
		window.addEventListener('resize', position);
		return () => window.removeEventListener('resize', position);
	});

	function select(v: string) {
		value = v;
		onchange?.(v);
		void tick().then(position);
	}
</script>

<div class="pill-tabs relative inline-flex max-w-full gap-1 overflow-x-auto rounded-pill bg-on-night/10 p-1" bind:this={container} role="tablist">
	<span class="pill-indicator" aria-hidden="true" bind:this={indicator}></span>
	{#each tabs as [label, v] (v)}
		<button
			type="button"
			role="tab"
			aria-selected={value === v}
			bind:this={tabEls[v]}
			class="touch-target relative z-10 whitespace-nowrap rounded-pill px-4 py-2 text-sm font-bold transition-colors duration-200 {value === v ? 'text-text' : 'text-text-secondary hover:text-text'}"
			onclick={() => select(v)}
		>
			{label}
		</button>
	{/each}
</div>

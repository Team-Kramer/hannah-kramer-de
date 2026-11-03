import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
	// SvelteKit's default base is '' (relative) — correct for the custom domain
	// hannah-kramer.de (apex), not a /repo/ subpath (D2).
	plugins: [sveltekit(), tailwindcss()]
});

import adapter from '@sveltejs/adapter-static';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	preprocess: vitePreprocess(),
	kit: {
		// GitHub Pages: prerendered static output, SPA-style 404 fallback.
			adapter: adapter({
			pages: 'build',
			assets: 'build',
			fallback: '404.html'
		}),
		prerender: {
			// The Godot web export is staged into build/spiel/engine/ by CI *after*
			// this build. The prerenderer crawls the GameEmbed iframe src and would
			// 404 on /spiel/engine/index.html — warn instead of failing the build.
			handleHttpError: ({ path, status }) => {
				if (status === 404 && path.startsWith('/spiel/engine/')) return 'warn';
				return 'fail';
			}
		},
		env: {
			publicPrefix: 'PUBLIC_'
		}
	}
};

export default config;

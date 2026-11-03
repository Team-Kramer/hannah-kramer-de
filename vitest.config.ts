import { fileURLToPath } from 'node:url';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { svelteTesting } from '@testing-library/svelte/vite';
import { defineConfig } from 'vitest/config';

const root = fileURLToPath(new URL('.', import.meta.url));

export default defineConfig({
	plugins: [svelte(), svelteTesting()],
	resolve: {
		alias: {
			'$app/navigation': `${root}tests/mocks/navigation.ts`,
			'$app/stores': `${root}tests/mocks/stores.ts`,
			'$app/environment': `${root}tests/mocks/environment.ts`,
			'$env/static/public': `${root}tests/public-env.ts`,
			'$lib': `${root}src/lib`
		}
	},
	test: {
		environment: 'jsdom',
		globals: true,
		setupFiles: ['./tests/setup.ts'],
		include: ['tests/**/*.test.{ts,js}', 'src/**/*.test.{ts,js}']
	}
});

import { render, screen } from '@testing-library/svelte';
import { describe, expect, it } from 'vitest';
import Page from '../src/routes/+page.svelte';

describe('landing page smoke', () => {
	it('renders the Lichtwald hero + CTA to /spiel/', () => {
		render(Page);
		expect(screen.getByRole('heading', { name: /Hannahs Lichtwald/i })).toBeInTheDocument();
		const cta = screen.getByRole('link', { name: /Zum Spiel/i });
		expect(cta).toHaveAttribute('href', '/spiel/');
	});

	it('hero CTA has a ≥56px touch target', () => {
		render(Page);
		const cta = screen.getByRole('link', { name: /Zum Spiel/i });
		expect(cta.className).toContain('touch-target');
	});
});

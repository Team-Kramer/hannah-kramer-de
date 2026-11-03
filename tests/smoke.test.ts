import { render, screen } from '@testing-library/svelte';
import { describe, expect, it } from 'vitest';
import Page from '../src/routes/+page.svelte';

describe('landing page smoke', () => {
	it('renders the Lichtwald hero + CTA to the game', () => {
		render(Page);
		expect(screen.getByRole('heading', { name: /Entdeck den Lichtwald/i })).toBeInTheDocument();
		const heroCta = screen
			.getAllByRole('link', { name: /Spiel jetzt/i })
			.find((el) => el.className.includes('glow-gold'));
		expect(heroCta).toBeDefined();
		expect(heroCta).toHaveAttribute('href', '/spiel/mission-01');
	});

	it('hero CTA has a ≥56px touch target', () => {
		render(Page);
		const heroCta = screen
			.getAllByRole('link', { name: /Spiel jetzt/i })
			.find((el) => el.className.includes('glow-gold'));
		expect(heroCta).toBeDefined();
		expect(heroCta!.className).toContain('touch-target');
	});
});

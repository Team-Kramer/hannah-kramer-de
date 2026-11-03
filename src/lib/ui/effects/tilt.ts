/**
 * Ania #11 — Interactive 3D card tilt.
 * Max 4° (gentler than the 8° reference), disabled under
 * prefers-reduced-motion and on touch devices (no hover-dependent state).
 * Interruptible: reads the current pointer position on every move,
 * no snap-to-start.
 */
const MAX_DEG = 4;

export function prefersReducedMotion(): boolean {
	return (
		typeof window !== 'undefined' &&
		typeof window.matchMedia === 'function' &&
		window.matchMedia('(prefers-reduced-motion: reduce)').matches
	);
}

export function hasFinePointer(): boolean {
	return (
		typeof window !== 'undefined' &&
		window.matchMedia('(hover: hover) and (pointer: fine)').matches
	);
}

export function attachTilt(el: HTMLElement): () => void {
	if (prefersReducedMotion() || !hasFinePointer()) return () => {};

	let raf = 0;
	const onMove = (e: PointerEvent) => {
		const rect = el.getBoundingClientRect();
		const px = (e.clientX - rect.left) / rect.width - 0.5;
		const py = (e.clientY - rect.top) / rect.height - 0.5;
		cancelAnimationFrame(raf);
		raf = requestAnimationFrame(() => {
			el.style.transform = `perspective(800px) rotateX(${(-py * MAX_DEG).toFixed(2)}deg) rotateY(${(px * MAX_DEG).toFixed(2)}deg)`;
		});
	};
	const onLeave = () => {
		cancelAnimationFrame(raf);
		el.style.transform = '';
	};

	el.addEventListener('pointermove', onMove);
	el.addEventListener('pointerleave', onLeave);
	return () => {
		cancelAnimationFrame(raf);
		el.removeEventListener('pointermove', onMove);
		el.removeEventListener('pointerleave', onLeave);
		el.style.transform = '';
	};
}

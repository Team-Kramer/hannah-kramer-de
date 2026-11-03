import { error } from '@sveltejs/kit';
import { getAllPosts } from '$lib/blog';

// Prerendering: tell the crawler which [slug] values exist.
export const entries = () => getAllPosts().map((post) => ({ slug: post.slug }));

export function load({ params }) {
	const post = getAllPosts().find((p) => p.slug === params.slug);
	if (!post) error(404, 'Beitrag nicht gefunden');
	return { post };
}

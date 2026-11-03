import { getAllPosts } from '$lib/blog';

export function load() {
	return { posts: getAllPosts() };
}

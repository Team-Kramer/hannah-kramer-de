import { marked } from 'marked';

export interface BlogPost {
	slug: string;
	title: string;
	date: string;
	description: string;
	body: string; // rendered HTML
	readingTime: string;
}

const posts = import.meta.glob('/content/blog/*.md', {
	eager: true,
	query: '?raw',
	import: 'default'
}) as Record<string, string>;

interface Frontmatter {
	title: string;
	date: string;
	description: string;
	slug: string;
}

/** Minimal frontmatter parser (title/date/description/slug — no YAML dependency). */
function parseFrontmatter(raw: string): { meta: Frontmatter; body: string } {
	const match = raw.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
	if (!match) throw new Error('Missing frontmatter');
	const meta: Record<string, string> = {};
	for (const line of match[1].split('\n')) {
		const idx = line.indexOf(':');
		if (idx > 0) meta[line.slice(0, idx).trim()] = line.slice(idx + 1).trim();
	}
	return { meta: meta as unknown as Frontmatter, body: match[2] };
}

function readingTime(body: string): string {
	const words = body.split(/\s+/).length;
	return `${Math.max(1, Math.round(words / 200))} Min. Lesezeit`;
}

export function getAllPosts(): BlogPost[] {
	return Object.entries(posts)
		.map(([path, raw]) => {
			const { meta, body } = parseFrontmatter(raw);
			return {
				slug: meta.slug ?? path.split('/').pop()!.replace('.md', ''),
				title: meta.title ?? '',
				date: meta.date ?? '',
				description: meta.description ?? '',
				body: marked.parse(body, { async: false }) as string,
				readingTime: readingTime(body)
			};
		})
		.sort((a, b) => b.date.localeCompare(a.date));
}

export function getPost(slug: string): BlogPost | undefined {
	return getAllPosts().find((p) => p.slug === slug);
}

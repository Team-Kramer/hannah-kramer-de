import { getAllPosts } from '$lib/blog';
import { MISSIONS } from '$lib/missions';

export const prerender = true;

const publicRoutes = [
	'',
	'/missionen/',
	'/spiel/',
	'/so-funktionierts/',
	'/ueber/',
	'/blog/',
	'/impressum/',
	'/datenschutz/'
];

function escapeXml(value: string): string {
	return value
		.replaceAll('&', '&amp;')
		.replaceAll('<', '&lt;')
		.replaceAll('>', '&gt;')
		.replaceAll('"', '&quot;')
		.replaceAll("'", '&apos;');
}

export function GET() {
	const urls = [
		...publicRoutes.map((route) => ({
			loc: `https://hannah-kramer.de${route}`,
			lastmod: undefined
		})),
		...MISSIONS.filter((mission) => mission.playable).map((mission) => ({
			loc: `https://hannah-kramer.de/spiel/${mission.id}/`,
			lastmod: undefined
		})),
		...getAllPosts().map((post) => ({
			loc: `https://hannah-kramer.de/blog/${post.slug}/`,
			lastmod: post.date
		}))
	];
	const entries = urls
		.map(
			({ loc, lastmod }) =>
				`<url><loc>${escapeXml(loc)}</loc>${lastmod ? `<lastmod>${escapeXml(lastmod)}</lastmod>` : ''}</url>`
		)
		.join('');
	const body =
		'<?xml version="1.0" encoding="UTF-8"?>' +
		'<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">' +
		entries +
		'</urlset>';

	return new Response(body, {
		headers: { 'Content-Type': 'application/xml; charset=utf-8' }
	});
}

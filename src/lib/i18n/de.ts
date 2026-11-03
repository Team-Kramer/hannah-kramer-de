/**
 * UI strings — German (target audience: German parents/educators).
 * English as fast-follow (D5): src/lib/i18n/en.ts.
 */
export const de = {
	nav: {
		home: 'Start',
		missionen: 'Missionen',
		spiel: 'Spiel',
		soFunktionierts: 'So funktioniert’s',
		blog: 'Blog'
	},
	hero: {
		headline: 'Entdeck den Lichtwald',
		subline: 'und triff mutige Entscheidungen mit Hannah',
		tagline: 'Zuhören. Entscheiden. Miteinander.',
		ctaPlay: 'Spiel jetzt',
		ctaProfile: 'Wer ist Hannah?'
	},
	continue: {
		label: 'Weiter spielen',
		subtitle: 'Dein Lichtwald wartet',
		cta: 'Weiterspielen',
		share: 'Welt teilen',
		shareCopied: 'Link kopiert!'
	},
	worldStatus: {
		title: 'Wald-Status',
		subtitle: 'So steht es um deinen Lichtwald',
		lastPlayed: 'Zuletzt gespielt',
		saveName: 'Wald',
		version: 'Version',
		versionOk: 'passt zum Spiel',
		versionMismatch: 'andere Version',
		light: 'Lichtpunkte',
		tabs: 'Entdeckte Orte',
		noSave: 'Noch kein Spielstand gefunden. Spiel eine Mission, um deinen Lichtwald zu beginnen.'
	},
	profile: {
		title: 'Wer ist Hannah?',
		bio: 'Hannah Kramer ist 10 Jahre alt und baut Spiele, in denen Kinder lernen, wie wichtig es ist, einander zuzuhören und gemeinsam zu entscheiden. Der Lichtwald ist ihr Projekt: eine magische Welt, in der jede Stimme zählt — auch die leisen. Hannah entwickelt den Lichtwald mit ihrer Familie und teilt alles, was sie lernt, auf dieser Seite.',
		links: {
			github: 'GitHub',
			blog: 'Blog',
			soFunktionierts: 'Für Eltern & Pädagog:innen'
		}
	},
	blog: {
		title: 'Neues aus dem Lichtwald',
		subtitle: 'Beiträge über den Bau des Spiels — und darüber, warum Zuhören eine Superkraft ist.',
		allPosts: 'Alle Beiträge'
	},
	features: {
		title: 'So funktioniert der Lichtwald',
		sections: [
			{
				id: 'zuhoren',
				headline: 'Zuhören & Verstehen',
				pitch: 'Bevor entschieden wird, wird zugehört. In Mission 01 triffst du fünf Bewohner:innen — jede und jeder hat etwas anderes nötig. Du lernst, die leisen Stimmen genauso gut zu hören wie die lauten.',
				link: '/spiel/mission-01',
				linkLabel: 'Zuhören üben'
			},
			{
				id: 'entscheiden',
				headline: 'Echte Entscheidungen',
				pitch: 'Du hast nur begrenzte Lichtpunkte und musst wählen. Drei Wege führen zum Ziel: selbst entscheiden, abstimmen lassen oder moderieren. Jeder Weg hat andere Folgen.',
				link: '/so-funktionierts',
				linkLabel: 'Die drei Wege erklärt'
			},
			{
				id: 'stimmen',
				headline: 'Stimmen, die zählen',
				pitch: 'Bei der Abstimmung zählt jede Stimme — aber Freundschaften wiegen mit. Und bei Gleichstand? Dann gewinnt die leiseste Stimme. So wird niemand überstimmt, nur weil er oder sie leise ist.',
				link: '/so-funktionierts',
				linkLabel: 'Wie Abstimmung funktioniert'
			},
			{
				id: 'welt',
				headline: 'Die Welt reagiert',
				pitch: 'Deine Entscheidungen verändern den Lichtwald. Bei einem guten Ausgang wird der Licht-Rat gegründet — ein Ort, an dem alle gemeinsam Regeln aufstellen. Bei einem schlechten Ausgang bleibt der Schatten der Eile länger.',
				link: '/spiel/mission-01',
				linkLabel: 'Erleben, wie die Welt reagiert'
			},
			{
				id: 'hannah',
				headline: 'Von Hannah, für Hannah',
				pitch: 'Hannah baut den Lichtwald selbst. Und du kannst ihr helfen: Mit dem Missions-Editor (bald) baust du eigene Missionen — mit eigenen Charakteren, Optionen und Folgen. Deine Mission, deine Welt.',
				link: '/so-funktionierts#eigene-mission',
				linkLabel: 'Eigene Mission bauen'
			}
		]
	},
	missions: {
		title: 'Die Missionen',
		subtitle: 'Sieben Missionen warten auf dich. Mission 01 ist jetzt spielbar — die anderen folgen.',
		allMissions: 'Alle Missionen',
		play01: 'Mission 01 spielen',
		locked: 'Bald verfügbar'
	},
	stats: {
		missions: '7 Missionen',
		characters: '15+ Charaktere',
		resources: '4 Ressourcen',
		ways: '3 Entscheidungswege',
		accounts: '0 Accounts',
		hosting: '0 € Hosting'
	},
	cta: {
		title: 'Bereit für den Lichtwald?',
		subtitle: 'Kein Account. Keine Anmeldung. Einfach loslegen.',
		play: 'Spiel jetzt',
		saasTitle: 'Brave, imaginative, warm, never scary — als Produkt',
		saasText: 'Hannahs Lichtwald wird auch als Plattform für andere Bildungs-Spiele gebaut. Mehr dazu auf der SaaS-Seite.',
		saasLink: 'Mehr erfahren'
	},
	footer: {
		nav: 'Navigation',
		legal: 'Rechtliches',
		impressum: 'Impressum',
		datenschutz: 'Datenschutz',
		copyright: '© 2026 Hannah Kramer. Alle Rechte vorbehalten.',
		builtWith: 'Gebaut mit SvelteKit & Godot 4.4 — hostet auf GitHub Pages.'
	},
	spiel: {
		title: 'Hannahs Lichtwald — Spiel',
		loading: 'Der Lichtwald wird geladen …',
		error: 'Das Spiel konnte nicht geladen werden. Bitte lade die Seite neu.',
		back: '← Zur Startseite',
		missionLabel: 'Mission'
	}
} as const;

export type Lang = typeof de;

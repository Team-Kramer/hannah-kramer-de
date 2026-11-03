/**
 * Mission data for the static site (source: hannah-lichtwald doc 03 "Weitere Missionen").
 * Mission 01 is playable; 02–07 are teasers with unlock chains.
 */
export interface Mission {
	id: string;
	number: number;
	title: string;
	theme: string;
	unlock: string;
	teaser: string;
	playable: boolean;
	/** placeholder image id (content/images.json) */
	imageId: string;
}

export const MISSIONS: Mission[] = [
	{
		id: 'mission-01',
		number: 1,
		title: 'Der kaputte Spielplatz',
		theme: 'Mitbestimmung & Fairness',
		unlock: 'Lagerfeuer',
		teaser: 'Fünf Bewohner, ein kaputter Spielplatz — und eine Entscheidung, die alle betrifft.',
		playable: true,
		imageId: 'IMG-007'
	},
	{
		id: 'mission-02',
		number: 2,
		title: 'Der neue Mitbewohner',
		theme: 'Willkommen heißen / Anderssein',
		unlock: 'Spielplatz (guter Ausgang)',
		teaser: 'Ein neues Kind kommt in den Lichtwald. Es ist anders — Hannah kann Brücken bauen oder zuschauen.',
		playable: false,
		imageId: 'IMG-025'
	},
	{
		id: 'mission-03',
		number: 3,
		title: 'Streit um das Lagerfeuer',
		theme: 'Kompromiss finden',
		unlock: 'Mission 02',
		teaser: 'Zwei Gruppen wollen das Feuer für unterschiedliche Dinge nutzen. Wie findet man eine Lösung, mit der beide leben können?',
		playable: false,
		imageId: 'IMG-026'
	},
	{
		id: 'mission-04',
		number: 4,
		title: 'Die laute und die stille Gruppe',
		theme: 'Zuhören & beide Seiten sehen',
		unlock: 'Mission 03',
		teaser: 'Im Lichtwald gibt es Kinder, die viel reden, und solche, die kaum gehört werden. Hannah lernt, die leisen Stimmen sichtbar zu machen.',
		playable: false,
		imageId: 'IMG-027'
	},
	{
		id: 'mission-05',
		number: 5,
		title: 'Jemand wird ausgegrenzt',
		theme: 'Zivilcourage',
		unlock: 'Mission 04',
		teaser: 'Ein Bewohner wird aus dem Spiel ausgeschlossen. Hannah muss entscheiden, ob und wie sie eingreift.',
		playable: false,
		imageId: 'IMG-028'
	},
	{
		id: 'mission-06',
		number: 6,
		title: 'Der erste Licht-Rat',
		theme: 'Gemeinsam Regeln aufstellen',
		unlock: 'Mission 05',
		teaser: 'Die Bewohner wollen gemeinsame Regeln. Hannah hilft dabei, die ersten Regeln des Zusammenlebens aufzustellen.',
		playable: false,
		imageId: 'IMG-029'
	},
	{
		id: 'mission-07',
		number: 7,
		title: 'Die große Entscheidung',
		theme: 'Verantwortung für die Gemeinschaft',
		unlock: 'Licht-Rat',
		teaser: 'Eine wichtige Veränderung steht an. Der Licht-Rat entscheidet — und Hannah trägt mit Verantwortung.',
		playable: false,
		imageId: 'IMG-030'
	}
];

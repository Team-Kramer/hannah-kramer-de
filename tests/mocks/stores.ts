import { writable } from 'svelte/store';

export const page = {
	subscribe: writable({
		url: new URL('http://localhost/'),
		params: {},
		route: { id: '/' },
		status: 200,
		error: null,
		data: {},
		form: undefined
	}).subscribe
};

export const navigating = {
	subscribe: writable(false).subscribe
};

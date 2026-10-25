export type Theme = 'light' | 'dark';

const COOKIE_NAME = 'ra_theme';

export const theme = $state<{ current: Theme }>({ current: 'dark' });

export function initTheme() {
	theme.current = document.documentElement.dataset.theme === 'light' ? 'light' : 'dark';
}

export function toggleTheme() {
	const next: Theme = theme.current === 'dark' ? 'light' : 'dark';
	document.documentElement.dataset.theme = next;
	theme.current = next;
	document.cookie = `${COOKIE_NAME}=${next}; path=/; max-age=31536000; samesite=lax`;
}

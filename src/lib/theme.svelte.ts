export type Theme = 'light' | 'dark';
export type ThemePreference = Theme | 'system';

const PREFERENCE_COOKIE = 'ra_theme';
const RESOLVED_COOKIE = 'ra_theme_resolved';
const YEAR = 60 * 60 * 24 * 365;

export const theme = $state<{ current: Theme; preference: ThemePreference }>({
	current: 'dark',
	preference: 'dark'
});

function writeCookie(name: string, value: string) {
	document.cookie = `${name}=${value}; path=/; max-age=${YEAR}; samesite=lax`;
}

function readCookie(name: string) {
	return document.cookie
		.split('; ')
		.find((entry) => entry.startsWith(`${name}=`))
		?.slice(name.length + 1);
}

function systemTheme(): Theme {
	return matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function apply() {
	const resolved = theme.preference === 'system' ? systemTheme() : theme.preference;
	document.documentElement.dataset.theme = resolved;
	theme.current = resolved;
	writeCookie(RESOLVED_COOKIE, resolved);
}

export function initTheme() {
	const stored = readCookie(PREFERENCE_COOKIE);
	theme.preference = stored === 'light' || stored === 'system' ? stored : 'dark';
	apply();
	const query = matchMedia('(prefers-color-scheme: dark)');
	const onChange = () => {
		if (theme.preference === 'system') apply();
	};
	query.addEventListener('change', onChange);
	return () => query.removeEventListener('change', onChange);
}

export function setThemePreference(preference: ThemePreference) {
	theme.preference = preference;
	writeCookie(PREFERENCE_COOKIE, preference);
	apply();
}

export function toggleTheme() {
	setThemePreference(theme.current === 'dark' ? 'light' : 'dark');
}

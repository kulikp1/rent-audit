export const avatarColors = {
	violet: '#6b4fd8',
	blue: '#4560f5',
	teal: '#3a9d8f',
	orange: '#d98443',
	pink: '#d1527e',
	slate: '#2e3350'
} as const;

export type AvatarColor = keyof typeof avatarColors;

export const avatarColorKeys = Object.keys(avatarColors) as [AvatarColor, ...AvatarColor[]];

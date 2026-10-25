import { createHash } from 'node:crypto';
import { describe, expect, it, vi } from 'vitest';

vi.mock('$app/env/private', () => ({
	CLOUDINARY_CLOUD_NAME: 'demo',
	CLOUDINARY_API_KEY: 'key',
	CLOUDINARY_API_SECRET: 'secret'
}));

const {
	signParams,
	signUpload,
	privateDownloadUrl,
	publicIdBelongsTo,
	cloudinaryConfigured,
	signAvatarUpload,
	avatarBelongsTo,
	avatarUrl
} = await import('./cloudinary');

describe('cloudinary signing', () => {
	it('signs sorted key=value pairs joined with & followed by the secret using SHA-1', () => {
		const expected = createHash('sha1')
			.update('folder=f&timestamp=5&type=authenticated' + 'abcd')
			.digest('hex');
		expect(signParams({ type: 'authenticated', timestamp: 5, folder: 'f' }, 'abcd')).toBe(expected);
	});

	it('signs upload params for the authenticated type in the apartment folder', () => {
		const upload = signUpload('apt1', 1000);
		expect(upload.params).toEqual({
			folder: 'rent-audit/apt1',
			timestamp: 1000,
			type: 'authenticated'
		});
		expect(upload.signature).toBe(signParams(upload.params, 'secret'));
		expect(upload.uploadUrl).toBe('https://api.cloudinary.com/v1_1/demo/image/upload');
	});

	it('builds a signed private download url', () => {
		const url = new URL(privateDownloadUrl('rent-audit/apt1/photo', 2000));
		expect(url.pathname).toBe('/v1_1/demo/image/download');
		expect(url.searchParams.get('public_id')).toBe('rent-audit/apt1/photo');
		expect(url.searchParams.get('api_key')).toBe('key');
		expect(url.searchParams.get('signature')).toBe(
			signParams(
				{
					format: 'jpg',
					public_id: 'rent-audit/apt1/photo',
					timestamp: 2000,
					type: 'authenticated'
				},
				'secret'
			)
		);
	});

	it('only accepts photos from the same apartment folder', () => {
		expect(publicIdBelongsTo('rent-audit/apt1/photo', 'apt1')).toBe(true);
		expect(publicIdBelongsTo('rent-audit/apt2/photo', 'apt1')).toBe(false);
		expect(publicIdBelongsTo('rent-audit/apt1/../apt2/x', 'apt1')).toBe(false);
		expect(publicIdBelongsTo('other/apt1/photo', 'apt1')).toBe(false);
	});

	it('reports configured state', () => {
		expect(cloudinaryConfigured()).toBe(true);
	});
});

describe('cloudinary avatars', () => {
	it('signs a public upload with a face-aware square crop in the user folder', () => {
		const upload = signAvatarUpload('u1', 1000);
		expect(upload.params).toEqual({
			folder: 'rent-audit/avatars/u1',
			timestamp: 1000,
			transformation: 'c_fill,g_face,w_256,h_256'
		});
		expect(upload.signature).toBe(signParams(upload.params, 'secret'));
	});

	it('accepts only public ids inside the user avatar folder', () => {
		expect(avatarBelongsTo('rent-audit/avatars/u1/abc', 'u1')).toBe(true);
		expect(avatarBelongsTo('rent-audit/avatars/u2/abc', 'u1')).toBe(false);
		expect(avatarBelongsTo('rent-audit/avatars/u1/../u2/abc', 'u1')).toBe(false);
		expect(avatarBelongsTo('rent-audit/apt1/abc', 'u1')).toBe(false);
	});

	it('builds the public delivery url', () => {
		expect(avatarUrl('rent-audit/avatars/u1/abc')).toBe(
			'https://res.cloudinary.com/demo/image/upload/rent-audit/avatars/u1/abc'
		);
	});
});

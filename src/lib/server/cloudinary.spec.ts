import { createHash } from 'node:crypto';
import { describe, expect, it, vi } from 'vitest';

vi.mock('$app/env/private', () => ({
	CLOUDINARY_CLOUD_NAME: 'demo',
	CLOUDINARY_API_KEY: 'key',
	CLOUDINARY_API_SECRET: 'secret'
}));

const { signParams, signUpload, privateDownloadUrl, publicIdBelongsTo, cloudinaryConfigured } =
	await import('./cloudinary');

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

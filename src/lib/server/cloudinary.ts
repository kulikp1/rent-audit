import { createHash } from 'node:crypto';
import { CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET, CLOUDINARY_CLOUD_NAME } from '$app/env/private';

export function cloudinaryConfigured(): boolean {
	return !!(CLOUDINARY_CLOUD_NAME && CLOUDINARY_API_KEY && CLOUDINARY_API_SECRET);
}

export function signParams(params: Record<string, string | number>, secret: string): string {
	const payload = Object.keys(params)
		.sort()
		.map((key) => `${key}=${params[key]}`)
		.join('&');
	return createHash('sha1')
		.update(payload + secret)
		.digest('hex');
}

export function uploadFolder(apartmentId: string): string {
	return `rent-audit/${apartmentId}`;
}

export function signUpload(apartmentId: string, now = Math.floor(Date.now() / 1000)) {
	const params = { folder: uploadFolder(apartmentId), timestamp: now, type: 'authenticated' };
	return {
		cloudName: CLOUDINARY_CLOUD_NAME,
		apiKey: CLOUDINARY_API_KEY,
		uploadUrl: `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,
		params,
		signature: signParams(params, CLOUDINARY_API_SECRET)
	};
}

export function privateDownloadUrl(publicId: string, now = Math.floor(Date.now() / 1000)): string {
	const params = { format: 'jpg', public_id: publicId, timestamp: now, type: 'authenticated' };
	const query = new URLSearchParams({
		...Object.fromEntries(Object.entries(params).map(([key, value]) => [key, String(value)])),
		api_key: CLOUDINARY_API_KEY,
		signature: signParams(params, CLOUDINARY_API_SECRET)
	});
	return `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/download?${query}`;
}

export function publicIdBelongsTo(publicId: string, apartmentId: string): boolean {
	return publicId.startsWith(`${uploadFolder(apartmentId)}/`) && !publicId.includes('..');
}

export async function fetchPrivateImage(publicId: string): Promise<{ data: Buffer; mime: string }> {
	const response = await fetch(privateDownloadUrl(publicId));
	if (!response.ok) throw new Error(`cloudinary_download_failed_${response.status}`);
	return {
		data: Buffer.from(await response.arrayBuffer()),
		mime: response.headers.get('content-type')?.split(';')[0] ?? 'image/jpeg'
	};
}

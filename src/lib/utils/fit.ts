const MIN_HEIGHT = 240;

export function fitViewport(node: HTMLElement) {
	let frame = 0;

	function update() {
		frame = 0;
		if (node.offsetParent === null) return;
		node.style.maxHeight = 'none';
		const rect = node.getBoundingClientRect();
		const top = rect.top + window.scrollY;
		const below = document.documentElement.scrollHeight - (top + rect.height);
		const available = window.innerHeight - top - below;
		node.style.maxHeight = `${Math.max(MIN_HEIGHT, Math.floor(available))}px`;
	}

	function schedule() {
		if (!frame) frame = requestAnimationFrame(update);
	}

	const observer = new ResizeObserver(schedule);
	observer.observe(document.body);
	window.addEventListener('resize', schedule);
	schedule();

	return {
		destroy() {
			observer.disconnect();
			window.removeEventListener('resize', schedule);
			if (frame) cancelAnimationFrame(frame);
		}
	};
}

export function fitViewportIf(node: HTMLElement, enabled: boolean) {
	if (enabled) return fitViewport(node);
}

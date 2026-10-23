const BOTTOM_GAP = 32;
const MIN_HEIGHT = 240;

export function fitViewport(node: HTMLElement) {
	let frame = 0;

	function update() {
		frame = 0;
		if (node.offsetParent === null) return;
		const top = node.getBoundingClientRect().top + window.scrollY;
		const available = window.innerHeight - top - BOTTOM_GAP;
		node.style.maxHeight = `${Math.max(MIN_HEIGHT, Math.round(available))}px`;
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

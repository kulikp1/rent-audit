import { goto } from '$app/navigation';
import { pathTo } from './path';

const interactive = 'a, button, input, select, textarea, label, [role=menuitem], [popover]';

export function rowLink(node: HTMLElement, href: string) {
	let target = href;

	function onclick(event: MouseEvent) {
		if (event.defaultPrevented || event.button !== 0) return;
		if ((event.target as HTMLElement).closest(interactive)) return;
		if (event.metaKey || event.ctrlKey) {
			window.open(pathTo(target), '_blank', 'noopener');
			return;
		}
		void goto(pathTo(target));
	}

	node.addEventListener('click', onclick);
	return {
		update(next: string) {
			target = next;
		},
		destroy() {
			node.removeEventListener('click', onclick);
		}
	};
}

/** Notice helpers wrapping Obsidian's Notice API. */

import { Notice } from "obsidian";

export function noticeInfo(msg: string, timeout = 5000): void {
	new Notice(msg, timeout);
}

export function noticeWarn(msg: string, timeout = 8000): void {
	new Notice(msg, timeout);
}

export function noticeError(msg: string, action?: { text: string; onClick: () => void }): void {
	if (action) {
		const frag = document.createDocumentFragment();
		frag.appendText(msg + " ");
		const link = frag.createEl("a", { text: action.text });
		link.addEventListener("click", (e) => {
			e.preventDefault();
			action.onClick();
		});
		new Notice(frag, 0);
	} else {
		new Notice(msg, 0);
	}
}

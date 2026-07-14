import { markInputRule, markPasteRule } from "@tiptap/core";
import Bold from "@tiptap/extension-bold";
import Italic from "@tiptap/extension-italic";
import Strike from "@tiptap/extension-strike";

// Autoformatação com a sintaxe do WhatsApp em vez do markdown padrão do StarterKit:
// *negrito*, _itálico_ e ~tachado~ — o mesmo que o usuário digita no aplicativo.
// Use com StarterKit.configure({ bold: false, italic: false, strike: false }).
const BOLD_INPUT_REGEX = /(?:^|\s)(\*(?!\s)((?:[^*]+))(?!\s)\*)$/;
const BOLD_PASTE_REGEX = /(?:^|\s)(\*(?!\s)((?:[^*]+))(?!\s)\*)/g;
const ITALIC_INPUT_REGEX = /(?:^|\s)(_(?!\s)((?:[^_]+))(?!\s)_)$/;
const ITALIC_PASTE_REGEX = /(?:^|\s)(_(?!\s)((?:[^_]+))(?!\s)_)/g;
const STRIKE_INPUT_REGEX = /(?:^|\s)(~(?!\s)((?:[^~]+))(?!\s)~)$/;
const STRIKE_PASTE_REGEX = /(?:^|\s)(~(?!\s)((?:[^~]+))(?!\s)~)/g;

export const WhatsappBold = Bold.extend({
	addInputRules() {
		return [markInputRule({ find: BOLD_INPUT_REGEX, type: this.type })];
	},
	addPasteRules() {
		return [markPasteRule({ find: BOLD_PASTE_REGEX, type: this.type })];
	},
});

export const WhatsappItalic = Italic.extend({
	addInputRules() {
		return [markInputRule({ find: ITALIC_INPUT_REGEX, type: this.type })];
	},
	addPasteRules() {
		return [markPasteRule({ find: ITALIC_PASTE_REGEX, type: this.type })];
	},
});

export const WhatsappStrike = Strike.extend({
	addInputRules() {
		return [markInputRule({ find: STRIKE_INPUT_REGEX, type: this.type })];
	},
	addPasteRules() {
		return [markPasteRule({ find: STRIKE_PASTE_REGEX, type: this.type })];
	},
});

export const WhatsappFormattingMarks = [WhatsappBold, WhatsappItalic, WhatsappStrike];

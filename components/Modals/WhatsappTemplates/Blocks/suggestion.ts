import { type TWhatsappTemplateVariable, WhatsappTemplateVariables } from "@/lib/whatsapp/template-variables";
import type { SuggestionKeyDownProps, SuggestionProps } from "@tiptap/suggestion";
import { ReactRenderer } from "@tiptap/react";
import { VariableList } from "./VariableList";

type VariableListRef = {
	onKeyDown: (props: SuggestionKeyDownProps) => boolean;
};

export function createSuggestion(variables: TWhatsappTemplateVariable[]) {
	return {
		items: ({ query }: { query: string }) => {
			// Clean query if it starts with { (since trigger is { and user might type {{)
			const cleanQuery = query.startsWith("{") ? query.slice(1) : query;

			return variables.filter(
				(item) => item.label.toLowerCase().includes(cleanQuery.toLowerCase()) || item.value.toLowerCase().includes(cleanQuery.toLowerCase()),
			);
		},

		render: () => {
			let component: ReactRenderer;
			let popup: HTMLElement | null = null;
			let popupContainer: HTMLElement | null = null;

			const positionPopup = (rect: DOMRect) => {
				if (!popup) {
					return;
				}

				// Vira o popup para cima quando não há espaço suficiente abaixo do cursor.
				const popupHeight = popup.offsetHeight || 280;
				const spaceBelow = window.innerHeight - rect.bottom;
				const flipUp = spaceBelow < popupHeight + 16;

				if (popupContainer && popupContainer !== document.body) {
					const containerRect = popupContainer.getBoundingClientRect();
					if (flipUp) {
						popup.style.top = `${rect.top - containerRect.top - popupHeight - 6 + popupContainer.scrollTop}px`;
					} else {
						popup.style.top = `${rect.bottom - containerRect.top + 4 + popupContainer.scrollTop}px`;
					}
					popup.style.left = `${rect.left - containerRect.left + popupContainer.scrollLeft}px`;
					return;
				}

				popup.style.top = flipUp ? `${rect.top - popupHeight - 6}px` : `${rect.bottom + 4}px`;
				popup.style.left = `${rect.left}px`;
			};

			return {
				onStart: (props: SuggestionProps) => {
					component = new ReactRenderer(VariableList, {
						props,
						editor: props.editor,
					});

					if (!props.clientRect) {
						return;
					}

					popup = component.element;
					popupContainer = props.editor.view.dom.closest("[role='dialog']") as HTMLElement | null;
					const shouldRenderInDialog = Boolean(popupContainer);
					popup.style.position = shouldRenderInDialog ? "absolute" : "fixed";
					popup.style.pointerEvents = "auto";
					popup.style.zIndex = "10000";

					(popupContainer ?? document.body).appendChild(popup);

					const rect = props.clientRect();
					if (rect) {
						positionPopup(rect);
					}
				},

				onUpdate(props: SuggestionProps) {
					component.updateProps(props);

					if (!props.clientRect) {
						return;
					}

					const rect = props.clientRect();
					if (rect) {
						positionPopup(rect);
					}
				},

				onKeyDown(props: SuggestionKeyDownProps) {
					if (props.event.key === "Escape") {
						popup?.remove();

						return true;
					}

					return (component.ref as VariableListRef | null)?.onKeyDown(props) ?? false;
				},

				onExit() {
					popup?.remove();
					component.destroy();
				},
			};
		},
	};
}

export default createSuggestion(WhatsappTemplateVariables);

import { WhatsappTemplateVariables } from "@/lib/whatsapp/template-variables";
import { ReactRenderer } from "@tiptap/react";
import tippy, { type Instance } from "tippy.js";
import { VariableList } from "./VariableList";

export default {
	items: ({ query }: { query: string }) => {
		// Clean query if it starts with { (since trigger is { and user might type {{)
		const cleanQuery = query.startsWith("{") ? query.slice(1) : query;

		return WhatsappTemplateVariables.filter(
			(item) => item.label.toLowerCase().includes(cleanQuery.toLowerCase()) || item.value.toLowerCase().includes(cleanQuery.toLowerCase()),
		);
	},

	render: () => {
		let component: ReactRenderer;
		let popup: Instance[];

		return {
			onStart: (props: any) => {
				component = new ReactRenderer(VariableList, {
					props,
					editor: props.editor,
				});

				if (!props.clientRect) {
					return;
				}

				popup = tippy("body", {
					getReferenceClientRect: props.clientRect,
					appendTo: () => document.body,
					content: component.element,
					showOnCreate: true,
					interactive: true,
					trigger: "manual",
					placement: "bottom-start",
				});
			},

			onUpdate(props: any) {
				component.updateProps(props);

				if (!props.clientRect) {
					return;
				}

				popup[0].setProps({
					getReferenceClientRect: props.clientRect,
				});
			},

			onKeyDown(props: any) {
				if (props.event.key === "Escape") {
					popup[0].hide();

					return true;
				}

				return (component.ref as any)?.onKeyDown(props);
			},

			onExit() {
				popup[0].destroy();
				component.destroy();
			},
		};
	},
};

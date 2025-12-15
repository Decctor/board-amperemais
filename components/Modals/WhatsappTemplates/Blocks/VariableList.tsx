import { cn } from "@/lib/utils";
import type { WhatsappTemplateVariables } from "@/lib/whatsapp/template-variables";
import React, { forwardRef, useEffect, useImperativeHandle, useState } from "react";

type VariableListProps = {
	items: typeof WhatsappTemplateVariables;
	command: (props: { id: string; label: string }) => void;
};

export const VariableList = forwardRef((props: VariableListProps, ref) => {
	const [selectedIndex, setSelectedIndex] = useState(0);

	const selectItem = (index: number) => {
		const item = props.items[index];
		if (item) {
			props.command({ id: item.value, label: item.value });
		}
	};

	const upHandler = () => {
		setSelectedIndex((selectedIndex + props.items.length - 1) % props.items.length);
	};

	const downHandler = () => {
		setSelectedIndex((selectedIndex + 1) % props.items.length);
	};

	const enterHandler = () => {
		selectItem(selectedIndex);
	};

	useEffect(() => {
		setSelectedIndex(0);
	}, [props.items]);

	useImperativeHandle(ref, () => ({
		onKeyDown: ({ event }: { event: KeyboardEvent }) => {
			if (event.key === "ArrowUp") {
				upHandler();
				return true;
			}

			if (event.key === "ArrowDown") {
				downHandler();
				return true;
			}

			if (event.key === "Enter") {
				enterHandler();
				return true;
			}

			return false;
		},
	}));

	return (
		<div className="bg-popover text-popover-foreground rounded-md border shadow-md overflow-hidden min-w-[200px] p-1">
			{props.items.length ? (
				props.items.map((item, index) => (
					<button
						type="button"
						className={cn(
							"flex w-full flex-col items-start gap-1 rounded-sm px-2 py-1.5 text-sm outline-none select-none",
							index === selectedIndex ? "bg-accent text-accent-foreground" : "hover:bg-accent hover:text-accent-foreground",
						)}
						key={item.id}
						onClick={() => selectItem(index)}
					>
						<span className="font-medium">{item.label}</span>
						<span className="text-xs text-muted-foreground truncate max-w-full text-left">{"{{" + item.value + "}}"}</span>
					</button>
				))
			) : (
				<div className="px-2 py-1.5 text-sm text-muted-foreground">Nenhuma variável encontrada.</div>
			)}
		</div>
	);
});

VariableList.displayName = "VariableList";

"use client";

import { Button } from "@/components/ui/button";
import { SectionWrapper } from "@/components/ui/section-wrapper";
import { LoadingButton } from "@/components/loading-button";
import { Pencil } from "lucide-react";
import type { ReactNode } from "react";

/**
 * EntityDetailBlock pattern: read-only SectionWrapper with scoped inline edit.
 * Reuse for client/seller profile cadastro tabs.
 */
type EntityDetailBlockSectionProps = {
	title: string;
	icon: ReactNode;
	isEditing: boolean;
	isPending?: boolean;
	onStartEdit: () => void;
	onCancel: () => void;
	onSave: () => void;
	viewContent: ReactNode;
	editContent: ReactNode;
	extraActions?: ReactNode;
};

export default function EntityDetailBlockSection({
	title,
	icon,
	isEditing,
	isPending = false,
	onStartEdit,
	onCancel,
	onSave,
	viewContent,
	editContent,
	extraActions,
}: EntityDetailBlockSectionProps) {
	return (
		<SectionWrapper
			title={title}
			icon={icon}
			actions={
				isEditing ? (
					<div className="flex items-center gap-2">
						<Button variant="ghost" size="xs" onClick={onCancel} disabled={isPending}>
							CANCELAR
						</Button>
						<LoadingButton variant="default" size="xs" onClick={onSave} loading={isPending}>
							SALVAR
						</LoadingButton>
					</div>
				) : (
					<div className="flex items-center gap-2">
						{extraActions}
						<Button variant="ghost" size="xs" onClick={onStartEdit} className="flex items-center gap-1">
							<Pencil className="w-4 h-4 min-w-4 min-h-4" />
							EDITAR
						</Button>
					</div>
				)
			}
		>
			{isEditing ? editContent : viewContent}
		</SectionWrapper>
	);
}

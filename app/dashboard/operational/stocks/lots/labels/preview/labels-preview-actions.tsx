"use client";

import { Button } from "@/components/ui/button";
import { Printer } from "lucide-react";

export default function LabelsPreviewActions() {
	return (
		<Button type="button" size="sm" onClick={() => window.print()}>
			<Printer className="h-4 w-4" />
			IMPRIMIR / SALVAR PDF
		</Button>
	);
}

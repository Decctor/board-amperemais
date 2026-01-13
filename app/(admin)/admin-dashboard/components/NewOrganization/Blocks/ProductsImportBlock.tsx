"use client";
import ResponsiveMenuSection from "@/components/Utils/ResponsiveMenuSection";
import { Button } from "@/components/ui/button";
import type { TUseOrganizationState } from "@/state-hooks/use-organization-state";
import { FileSpreadsheet, Upload, X } from "lucide-react";

type ProductsImportBlockProps = {
	productsExcelFile: TUseOrganizationState["state"]["productsExcelFile"];
	updateProductsExcelFile: TUseOrganizationState["updateProductsExcelFile"];
};

export default function ProductsImportBlock({ productsExcelFile, updateProductsExcelFile }: ProductsImportBlockProps) {
	return (
		<ResponsiveMenuSection title="IMPORTAÇÃO DE PRODUTOS (OPCIONAL)" icon={<FileSpreadsheet className="w-4 h-4" />}>
			<div className="flex flex-col gap-3">
				<p className="text-sm text-primary/60">
					Faça upload de um arquivo Excel (.xlsx) com os produtos. O arquivo deve conter as colunas: CÓDIGO, DESCRIÇÃO, UNIDADE, NCM, TIPO, GRUPO
				</p>

				{productsExcelFile ? (
					<div className="bg-primary/5 border border-primary/20 rounded-lg p-4 flex items-center justify-between">
						<div className="flex items-center gap-3">
							<FileSpreadsheet className="w-8 h-8 text-green-600" />
							<div>
								<p className="text-sm font-medium">{productsExcelFile.name}</p>
								<p className="text-xs text-primary/60">{(productsExcelFile.size / 1024).toFixed(2)} KB</p>
							</div>
						</div>
						<Button variant="ghost" size="icon" onClick={() => updateProductsExcelFile(null)}>
							<X className="w-4 h-4" />
						</Button>
					</div>
				) : (
					<label
						className="border-2 border-dashed border-primary/20 hover:border-primary/40 rounded-lg p-8 cursor-pointer transition-colors"
						htmlFor="products-excel-file"
					>
						<div className="flex flex-col items-center justify-center gap-3">
							<FileSpreadsheet className="w-12 h-12 text-primary/40" />
							<Upload className="w-6 h-6 text-primary/40" />
							<p className="text-sm text-primary/60 text-center">Clique para selecionar arquivo Excel</p>
							<p className="text-xs text-primary/40 text-center">Formatos aceitos: .xlsx, .xls</p>
						</div>
						<input
							accept=".xlsx,.xls"
							className="hidden"
							id="products-excel-file"
							type="file"
							onChange={(e) => {
								const file = e.target.files?.[0] ?? null;
								updateProductsExcelFile(file);
							}}
						/>
					</label>
				)}
			</div>
		</ResponsiveMenuSection>
	);
}

import { useRFMConfigQuery } from "@/lib/queries/configs";
import React, { useEffect, useState } from "react";
import LoadingComponent from "../Layouts/LoadingComponent";
import ErrorComponent from "../Layouts/ErrorComponent";
import NumberInput from "../Inputs/NumberInput";
import type { TRFMConfig } from "@/utils/rfm";
import { Button } from "../ui/button";
import { useMutation } from "@tanstack/react-query";
import { updateRFMConfig } from "@/lib/mutations/configs";
import { LoadingButton } from "../loading-button";
import { toast } from "sonner";

function SettingsView() {
	return (
		<div className="flex h-full grow flex-col">
			<div className="flex w-full flex-col items-center justify-between border-b border-gray-200 pb-2 lg:flex-row">
				<div className="flex flex-col">
					<h1 className="text-lg font-bold">Controle de Configurações</h1>
					<p className="text-sm text-[#71717A]">
						Gerencie as configurações da plataforma.
					</p>
				</div>
			</div>
			<RFMConfigBlock />
		</div>
	);
}

export default SettingsView;

function RFMConfigBlock() {
	const { data, isLoading, isError, isSuccess } = useRFMConfigQuery();
	const [infoHolder, setInfoHolder] = useState<TRFMConfig>({
		identificador: "CONFIG_RFM",
		recencia: {
			"1": { min: 0, max: 0 },
			"2": { min: 0, max: 0 },
			"3": { min: 0, max: 0 },
			"4": { min: 0, max: 0 },
			"5": { min: 0, max: 0 },
		},
		frequencia: {
			"1": { min: 0, max: 0 },
			"2": { min: 0, max: 0 },
			"3": { min: 0, max: 0 },
			"4": { min: 0, max: 0 },
			"5": { min: 0, max: 0 },
		},
	});
	useEffect(() => {
		if (data) setInfoHolder(data);
	}, [data]);

	const { mutate: updateRFMConfigMutation, isPending } = useMutation({
		mutationKey: ["update-rfm-config"],
		mutationFn: updateRFMConfig,
		onSuccess: (data) => {
			toast.success(data);
		},
	});
	return (
		<div className="flex w-full flex-col gap-3 rounded border border-primary bg-[#fff] p-2 shadow-sm dark:bg-[#121212]">
			<div className="flex items-center gap-2">
				<h1 className="text-sm font-bold leading-none tracking-tight">
					CONFIGURAÇÃO RFM
				</h1>
			</div>
			<div className="w-full flex flex-col gap-2">
				<div className="w-full flex items-center gap-2 bg-primary text-primary-foreground rounded">
					<h1 className="w-1/3 text-center">NOTA</h1>
					<h1 className="w-1/3 text-center">FREQUÊNCIA</h1>
					<h1 className="w-1/3 text-center">RECÊNCIA</h1>
				</div>
				{isLoading ? <LoadingComponent /> : null}
				{isError ? <ErrorComponent /> : null}
				{isSuccess ? (
					<div className="w-full flex flex-col gap-2">
						<div className="w-full flex items-center gap-2">
							<h1 className="w-1/3 text-center">1</h1>
							<div className="w-1/3 flex items-center gap-1 flex-col lg:flex-row">
								<div className="w-full lg:w-1/2">
									<NumberInput
										label="MÍNIMO"
										placeholder="Preencha aqui o valor mínimo para a nota"
										value={infoHolder.frequencia[1].min}
										handleChange={(value) =>
											setInfoHolder((prev) => ({
												...prev,
												frequencia: {
													...prev.frequencia,
													"1": { ...prev.frequencia["1"], min: value },
												},
											}))
										}
										width="100%"
									/>
								</div>
								<div className="w-full lg:w-1/2">
									<NumberInput
										label="MÁXIMO"
										placeholder="Preencha aqui o valor máximo para a nota"
										value={infoHolder.frequencia[1].max}
										handleChange={(value) =>
											setInfoHolder((prev) => ({
												...prev,
												frequencia: {
													...prev.frequencia,
													"1": { ...prev.frequencia["1"], max: value },
												},
											}))
										}
										width="100%"
									/>
								</div>
							</div>
							<div className="w-1/3 flex items-center gap-1 flex-col lg:flex-row">
								<div className="w-full lg:w-1/2">
									<NumberInput
										label="MÍNIMO"
										placeholder="Preencha aqui o valor mínimo para a nota"
										value={infoHolder.recencia[1].min}
										handleChange={(value) =>
											setInfoHolder((prev) => ({
												...prev,
												recencia: {
													...prev.recencia,
													"1": { ...prev.recencia["1"], min: value },
												},
											}))
										}
										width="100%"
									/>
								</div>
								<div className="w-full lg:w-1/2">
									<NumberInput
										label="MÁXIMO"
										placeholder="Preencha aqui o valor máximo para a nota"
										value={infoHolder.recencia[1].max}
										handleChange={(value) =>
											setInfoHolder((prev) => ({
												...prev,
												recencia: {
													...prev.recencia,
													"1": { ...prev.recencia["1"], max: value },
												},
											}))
										}
										width="100%"
									/>
								</div>
							</div>
						</div>
						<div className="w-full flex items-center gap-2">
							<h1 className="w-1/3 text-center">2</h1>
							<div className="w-1/3 flex items-center gap-1 flex-col lg:flex-row">
								<div className="w-full lg:w-1/2">
									<NumberInput
										label="MÍNIMO"
										placeholder="Preencha aqui o valor mínimo para a nota"
										value={infoHolder.frequencia[2].min}
										handleChange={(value) =>
											setInfoHolder((prev) => ({
												...prev,
												frequencia: {
													...prev.frequencia,
													"2": { ...prev.frequencia["2"], min: value },
												},
											}))
										}
										width="100%"
									/>
								</div>
								<div className="w-full lg:w-1/2">
									<NumberInput
										label="MÁXIMO"
										placeholder="Preencha aqui o valor máximo para a nota"
										value={infoHolder.frequencia[2].max}
										handleChange={(value) =>
											setInfoHolder((prev) => ({
												...prev,
												frequencia: {
													...prev.frequencia,
													"2": { ...prev.frequencia["2"], max: value },
												},
											}))
										}
										width="100%"
									/>
								</div>
							</div>
							<div className="w-1/3 flex items-center gap-1 flex-col lg:flex-row">
								<div className="w-full lg:w-1/2">
									<NumberInput
										label="MÍNIMO"
										placeholder="Preencha aqui o valor mínimo para a nota"
										value={infoHolder.recencia[2].min}
										handleChange={(value) =>
											setInfoHolder((prev) => ({
												...prev,
												recencia: {
													...prev.recencia,
													"2": { ...prev.recencia["2"], min: value },
												},
											}))
										}
										width="100%"
									/>
								</div>
								<div className="w-full lg:w-1/2">
									<NumberInput
										label="MÁXIMO"
										placeholder="Preencha aqui o valor máximo para a nota"
										value={infoHolder.recencia[2].max}
										handleChange={(value) =>
											setInfoHolder((prev) => ({
												...prev,
												recencia: {
													...prev.recencia,
													"2": { ...prev.recencia["2"], max: value },
												},
											}))
										}
										width="100%"
									/>
								</div>
							</div>
						</div>
						<div className="w-full flex items-center gap-2">
							<h1 className="w-1/3 text-center">3</h1>
							<div className="w-1/3 flex items-center gap-1 flex-col lg:flex-row">
								<div className="w-full lg:w-1/2">
									<NumberInput
										label="MÍNIMO"
										placeholder="Preencha aqui o valor mínimo para a nota"
										value={infoHolder.frequencia[3].min}
										handleChange={(value) =>
											setInfoHolder((prev) => ({
												...prev,
												frequencia: {
													...prev.frequencia,
													"3": { ...prev.frequencia["3"], min: value },
												},
											}))
										}
										width="100%"
									/>
								</div>
								<div className="w-full lg:w-1/2">
									<NumberInput
										label="MÁXIMO"
										placeholder="Preencha aqui o valor máximo para a nota"
										value={infoHolder.frequencia[3].max}
										handleChange={(value) =>
											setInfoHolder((prev) => ({
												...prev,
												frequencia: {
													...prev.frequencia,
													"3": { ...prev.frequencia["3"], max: value },
												},
											}))
										}
										width="100%"
									/>
								</div>
							</div>
							<div className="w-1/3 flex items-center gap-1 flex-col lg:flex-row">
								<NumberInput
									label="MÍNIMO"
									placeholder="Preencha aqui o valor mínimo para a nota"
									value={infoHolder.recencia[3].min}
									handleChange={(value) =>
										setInfoHolder((prev) => ({
											...prev,
											recencia: {
												...prev.recencia,
												"3": { ...prev.recencia["3"], min: value },
											},
										}))
									}
									width="100%"
								/>
								<NumberInput
									label="MÁXIMO"
									placeholder="Preencha aqui o valor máximo para a nota"
									value={infoHolder.recencia[3].max}
									handleChange={(value) =>
										setInfoHolder((prev) => ({
											...prev,
											recencia: {
												...prev.recencia,
												"3": { ...prev.recencia["3"], max: value },
											},
										}))
									}
									width="100%"
								/>
							</div>
						</div>
						<div className="w-full flex items-center gap-2">
							<h1 className="w-1/3 text-center">4</h1>
							<div className="w-1/3 flex items-center gap-1 flex-col lg:flex-row">
								<div className="w-full lg:w-1/2">
									<NumberInput
										label="MÍNIMO"
										placeholder="Preencha aqui o valor mínimo para a nota"
										value={infoHolder.frequencia[4].min}
										handleChange={(value) =>
											setInfoHolder((prev) => ({
												...prev,
												frequencia: {
													...prev.frequencia,
													"4": { ...prev.frequencia["4"], min: value },
												},
											}))
										}
										width="100%"
									/>
								</div>
								<div className="w-full lg:w-1/2">
									<NumberInput
										label="MÁXIMO"
										placeholder="Preencha aqui o valor máximo para a nota"
										value={infoHolder.frequencia[4].max}
										handleChange={(value) =>
											setInfoHolder((prev) => ({
												...prev,
												frequencia: {
													...prev.frequencia,
													"4": { ...prev.frequencia["4"], max: value },
												},
											}))
										}
										width="100%"
									/>
								</div>
							</div>
							<div className="w-1/3 flex items-center gap-1 flex-col lg:flex-row">
								<div className="w-full lg:w-1/2">
									<NumberInput
										label="MÍNIMO"
										placeholder="Preencha aqui o valor mínimo para a nota"
										value={infoHolder.recencia[4].min}
										handleChange={(value) =>
											setInfoHolder((prev) => ({
												...prev,
												recencia: {
													...prev.recencia,
													"4": { ...prev.recencia["4"], min: value },
												},
											}))
										}
										width="100%"
									/>
								</div>
								<div className="w-full lg:w-1/2">
									<NumberInput
										label="MÁXIMO"
										placeholder="Preencha aqui o valor máximo para a nota"
										value={infoHolder.recencia[4].max}
										handleChange={(value) =>
											setInfoHolder((prev) => ({
												...prev,
												recencia: {
													...prev.recencia,
													"4": { ...prev.recencia["4"], max: value },
												},
											}))
										}
										width="100%"
									/>
								</div>
							</div>
						</div>
						<div className="w-full flex items-center gap-2">
							<h1 className="w-1/3 text-center">5</h1>
							<div className="w-1/3 flex items-center gap-1 flex-col lg:flex-row">
								<div className="w-full lg:w-1/2">
									<NumberInput
										label="MÍNIMO"
										placeholder="Preencha aqui o valor mínimo para a nota"
										value={infoHolder.frequencia[5].min}
										handleChange={(value) =>
											setInfoHolder((prev) => ({
												...prev,
												frequencia: {
													...prev.frequencia,
													"5": { ...prev.frequencia["5"], min: value },
												},
											}))
										}
										width="100%"
									/>
								</div>
								<div className="w-full lg:w-1/2">
									<NumberInput
										label="MÁXIMO"
										placeholder="Preencha aqui o valor máximo para a nota"
										value={infoHolder.frequencia[5].max}
										handleChange={(value) =>
											setInfoHolder((prev) => ({
												...prev,
												frequencia: {
													...prev.frequencia,
													"5": { ...prev.frequencia["5"], max: value },
												},
											}))
										}
										width="100%"
									/>
								</div>
							</div>
							<div className="w-1/3 flex items-center gap-1 flex-col lg:flex-row">
								<div className="w-full lg:w-1/2">
									<NumberInput
										label="MÍNIMO"
										placeholder="Preencha aqui o valor mínimo para a nota"
										value={infoHolder.recencia[5].min}
										handleChange={(value) =>
											setInfoHolder((prev) => ({
												...prev,
												recencia: {
													...prev.recencia,
													"5": { ...prev.recencia["5"], min: value },
												},
											}))
										}
										width="100%"
									/>
								</div>
								<div className="w-full lg:w-1/2">
									<NumberInput
										label="MÁXIMO"
										placeholder="Preencha aqui o valor máximo para a nota"
										value={infoHolder.recencia[5].max}
										handleChange={(value) =>
											setInfoHolder((prev) => ({
												...prev,
												recencia: {
													...prev.recencia,
													"5": { ...prev.recencia["5"], max: value },
												},
											}))
										}
										width="100%"
									/>
								</div>
							</div>
						</div>
					</div>
				) : null}
			</div>
			<div className="w-full flex items-center justify-end">
				<LoadingButton
					loading={isPending || !isSuccess}
					onClick={() => updateRFMConfigMutation(infoHolder)}
				>
					SALVAR
				</LoadingButton>
			</div>
		</div>
	);
}

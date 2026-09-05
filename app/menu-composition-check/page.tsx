"use client";

import { useState } from "react";
import ResponsiveMenu from "@/components/Utils/ResponsiveMenu";
import { ResponsiveMenuAnimatedBody } from "@/components/Utils/ResponsiveMenuAnimatedBody";
import { Button } from "@/components/ui/button";

function LocalField() {
	const [value, setValue] = useState("");
	return <input aria-label="Rascunho local" value={value} onChange={(event) => setValue(event.target.value)} className="border p-2" />;
}

export default function MenuCompositionCheck() {
	const [locked, setLocked] = useState(false);
	const [veto, setVeto] = useState(false);
	const [legacy, setLegacy] = useState(false);
	const [phase, setPhase] = useState("content");
	return (
		<main className="p-8">
			<h1>Validação local de menus</h1>
			<ResponsiveMenu.Root onOpenChange={(open, details) => { if (!open && veto) details.cancel(); }} lockClose={locked}>
				<ResponsiveMenu.Trigger>Abrir composição</ResponsiveMenu.Trigger>
				<ResponsiveMenu.Content drawerVariant="full">
					<ResponsiveMenu.Header><ResponsiveMenu.Title>Composição de teste</ResponsiveMenu.Title><ResponsiveMenu.Description>Dados locais, sem gravação.</ResponsiveMenu.Description></ResponsiveMenu.Header>
					<ResponsiveMenu.Body>
						<LocalField />
						<Button onClick={() => setLocked(!locked)}>{locked ? "Desbloquear fechamento" : "Bloquear fechamento"}</Button>
						<Button onClick={() => setVeto(!veto)}>{veto ? "Permitir fechamento" : "Cancelar solicitação"}</Button>
						<Button onClick={() => setPhase(phase === "content" ? "loading" : phase === "loading" ? "error" : phase === "error" ? "success" : "content")}>Trocar estado</Button>
						<ResponsiveMenu.Root>
							<ResponsiveMenu.Trigger>Abrir aninhado</ResponsiveMenu.Trigger>
							<ResponsiveMenu.Content><ResponsiveMenu.Header><ResponsiveMenu.Title>Menu aninhado</ResponsiveMenu.Title><ResponsiveMenu.Description>Teste de foco.</ResponsiveMenu.Description></ResponsiveMenu.Header><ResponsiveMenu.Body><input aria-label="Campo aninhado" /></ResponsiveMenu.Body><ResponsiveMenu.Footer><ResponsiveMenu.Close>Fechar aninhado</ResponsiveMenu.Close></ResponsiveMenu.Footer></ResponsiveMenu.Content>
						</ResponsiveMenu.Root>
					</ResponsiveMenu.Body>
					<ResponsiveMenuAnimatedBody stateKey={phase}><p>Estado: {phase}</p></ResponsiveMenuAnimatedBody>
					{phase !== "success" ? <ResponsiveMenu.Footer><ResponsiveMenu.Close variant="outline">Fechar composição</ResponsiveMenu.Close></ResponsiveMenu.Footer> : null}
				</ResponsiveMenu.Content>
			</ResponsiveMenu.Root>
			<Button onClick={() => setLegacy(true)}>Abrir compatibilidade</Button>
			{legacy ? <ResponsiveMenu mode="read-only" menuTitle="API compatível" menuDescription="Teste do export padrão." stateIsLoading={false} closeMenu={() => setLegacy(false)}><LocalField /></ResponsiveMenu> : null}
		</main>
	);
}

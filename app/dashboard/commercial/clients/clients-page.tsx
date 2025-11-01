"use client";
import ClientsDatabaseFilterMenu from "@/components/Clients/DatabaseFilterMenu";
import ErrorComponent from "@/components/Layouts/ErrorComponent";
import LoadingComponent from "@/components/Layouts/LoadingComponent";
import { Button } from "@/components/ui/button";
import GeneralPaginationComponent from "@/components/Utils/Pagination";
import { getErrorMessage } from "@/lib/errors";
import { useClientsBySearch } from "@/lib/queries/clients";
import { cn } from "@/lib/utils";
import type { TGetClientsBySearchOutput } from "@/pages/api/clients/search";
import type { TUserSession } from "@/schemas/users";
import { Info, ListFilter, Phone, Mail, Megaphone } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

type ClientsPageProps = {
	user: TUserSession;
};
export default function ClientsPage({ user }: ClientsPageProps) {
	const [newMainEntityModalIsOpen, setNewMainEntityModalIsOpen] = useState<boolean>(false);
	const [editMainEntityModal, setEditMainEntityModal] = useState<{ id: string | null; isOpen: boolean }>({ id: null, isOpen: false });
	const [filterMenuIsOpen, setFilterMenuIsOpen] = useState<boolean>(false);
	const {
		data: clientsResult,
		isLoading,
		isError,
		isSuccess,
		error,
		queryParams,
		updateQueryParams,
	} = useClientsBySearch({
		initialParams: {},
	});

	const clients = clientsResult?.clients;
	const clientsShowing = clients ? clients.length : 0;
	const clientsMatched = clientsResult?.clientsMatched || 0;
	const totalPages = clientsResult?.totalPages;
	return (
		<div className="w-full h-full flex flex-col gap-3">
			<div className="w-full flex items-center justify-end gap-2">
				<Button className="flex items-center gap-2" size="sm" onClick={() => setFilterMenuIsOpen(true)}>
					<ListFilter className="w-4 h-4 min-w-4 min-h-4" />
					FILTROS
				</Button>
			</div>
			<GeneralPaginationComponent
				activePage={queryParams.page}
				queryLoading={isLoading}
				selectPage={(page) => updateQueryParams({ page })}
				totalPages={totalPages || 0}
				itemsMatchedText={clientsMatched > 0 ? `${clientsMatched} clientes encontrados.` : `${clientsMatched} cliente encontrado.`}
				itemsShowingText={clientsShowing > 0 ? `Mostrando ${clientsShowing} clientes.` : `Mostrando ${clientsShowing} cliente.`}
			/>
			{isLoading ? <LoadingComponent /> : null}
			{isError ? <ErrorComponent msg={getErrorMessage(error)} /> : null}
			{isSuccess && clients ? (
				clients.length > 0 ? (
					clients.map((client, index: number) => <ClientPageCard key={client.id} client={client} />)
				) : (
					<p className="w-full tracking-tight text-center">Nenhum cliente encontrado.</p>
				)
			) : null}
			{filterMenuIsOpen ? (
				<ClientsDatabaseFilterMenu queryParams={queryParams} updateQueryParams={updateQueryParams} closeMenu={() => setFilterMenuIsOpen(false)} />
			) : null}
		</div>
	);
}

type ClientCardProps = {
	client: TGetClientsBySearchOutput["clients"][number];
};
function ClientPageCard({ client }: ClientCardProps) {
	return (
		<div className={cn("bg-card border-primary/20 flex w-full flex-col gap-1 rounded-xl border px-3 py-4 shadow-xs")}>
			<div className="w-full flex items-center justify-between gap-2">
				<div className="flex items-center gap-2 flex-wrap">
					<h1 className="text-xs font-bold tracking-tight lg:text-sm">{client.nome}</h1>
					<div className="flex items-center gap-1">
						<Phone width={10} height={10} />
						<h1 className="py-0.5 text-center text-[0.65rem] font-medium italic text-primary/80">{client.telefone}</h1>
					</div>
					{client.email ? (
						<div className="flex items-center gap-1">
							<Mail width={10} height={10} />
							<h1 className="py-0.5 text-center text-[0.65rem] font-medium italic text-primary/80">{client.email}</h1>
						</div>
					) : null}
					{client.canalAquisicao ? (
						<div className="flex items-center gap-1">
							<Megaphone width={15} height={15} />
							<h1 className="py-0.5 text-center text-[0.65rem] font-medium italic text-primary/80">{client.canalAquisicao || "N/A"}</h1>
						</div>
					) : null}
				</div>
				<Button variant="link" className="flex items-center gap-1.5" size="sm" asChild>
					<Link href={`/dashboard/commercial/clients/id/${client.id}`}>
						<Info className="w-3 min-w-3 h-3 min-h-3" />
						DETALHES
					</Link>
				</Button>
			</div>
		</div>
	);
}

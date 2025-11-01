import { useClientsBySearch } from "@/lib/queries/clients";
import type { TUserSession } from "@/schemas/users";
import React, { useState } from "react";
import LoadingComponent from "../Layouts/LoadingComponent";
import ErrorComponent from "../Layouts/ErrorComponent";
import { getErrorMessage } from "@/lib/errors";
import { Button } from "../ui/button";
import { Info, ListFilter } from "lucide-react";
import GeneralPaginationComponent from "../Utils/Pagination";
import ClientsDatabaseFilterMenu from "../Clients/DatabaseFilterMenu";
import NewClient from "../Modals/Clients/NewClient";
import type { TGetClientsBySearchOutput } from "@/pages/api/clients/search";
import Link from "next/link";
type ClientsViewProps = {
	session: TUserSession;
};
function ClientsView({ session }: ClientsViewProps) {
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
		<div className="flex h-full grow flex-col p-6">
			<div className="flex w-full flex-col gap-2 py-2">
				<div className="w-full flex items-center justify-end gap-2">
					<Button onClick={() => setFilterMenuIsOpen(true)} className="flex items-center gap-2">
						<ListFilter size={15} />
						FILTRAR
					</Button>
					<Button onClick={() => setNewMainEntityModalIsOpen(true)}>NOVO CLIENTE</Button>
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
						clients.map((client, index: number) => <ClientCard key={client.id} client={client} />)
					) : (
						<p className="w-full tracking-tight text-center">Nenhum cliente encontrado.</p>
					)
				) : null}
			</div>

			{filterMenuIsOpen ? (
				<ClientsDatabaseFilterMenu queryParams={queryParams} updateQueryParams={updateQueryParams} closeMenu={() => setFilterMenuIsOpen(false)} />
			) : null}
			{newMainEntityModalIsOpen ? <NewClient session={session} closeModal={() => setNewMainEntityModalIsOpen(false)} /> : null}
		</div>
	);
}

export default ClientsView;

type ClientCardProps = {
	client: TGetClientsBySearchOutput["clients"][number];
};
function ClientCard({ client }: ClientCardProps) {
	return (
		<div className="border border-primary flex flex-col px-3 py-2 rounded w-full bg-[#fff] dark:bg-[#121212]">
			<div className="w-full flex items-center justify-between gap-2">
				<div className="flex items-center gap-2">
					<h1 className="text-[0.6rem] font-bold tracking-tight lg:text-sm">{client.nome}</h1>
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

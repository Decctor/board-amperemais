import { useClients, useClientsBySearch } from "@/lib/queries/clients";
import type { TUserSession } from "@/schemas/users";
import React, { useState } from "react";
import LoadingComponent from "../Layouts/LoadingComponent";
import ErrorComponent from "../Layouts/ErrorComponent";
import { getErrorMessage } from "@/lib/errors";
import type { TClientDTO } from "@/schemas/clients";
import { IoMdPulse } from "react-icons/io";
import TextInput from "../Inputs/TextInput";
import { Button } from "../ui/button";
import { ListFilter } from "lucide-react";
import GeneralPaginationComponent from "../Utils/Pagination";
import ClientsDatabaseFilterMenu from "../Clients/DatabaseFilterMenu";
import NewClient from "../Modals/Clients/NewClient";
import type { TGetClientsBySearchOutput } from "@/pages/api/clients/search";

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
		<div className="flex h-full grow flex-col">
			<div className="flex w-full flex-col items-start lg:items-center justify-between border-b border-gray-200 pb-2 lg:flex-row">
				<div className="flex flex-col">
					<h1 className="text-lg font-bold">Controle de Clientes</h1>
					<p className="text-sm text-[#71717A]">Gerencie os clientes.</p>
				</div>
			</div>
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
			</div>
		</div>
	);
}

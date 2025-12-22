"use client";
import type { TGetCashbackProgramOutput } from "@/app/api/cashback-programs/route";
import DateIntervalInput from "@/components/Inputs/DateIntervalInput";
import type { TAuthUserSession } from "@/lib/authentication/types";
import dayjs from "dayjs";
import { useState } from "react";
import CashbackStatsBlock from "./CashbackStatsBlock";
import RecentTransactionsBlock from "./RecentTransactionsBlock";
import TopClientsBlock from "./TopClientsBlock";

type CashbackProgramsPageProps = {
	user: TAuthUserSession["user"];
	cashbackProgram: Exclude<TGetCashbackProgramOutput["data"], null>;
};

export default function CashbackProgramsPage({ user, cashbackProgram }: CashbackProgramsPageProps) {
	// Initialize with current month
	const [period, setPeriod] = useState<{ after?: Date; before?: Date }>({
		after: dayjs().startOf("month").toDate(),
		before: dayjs().endOf("month").toDate(),
	});

	const handlePeriodChange = (value: { after?: Date; before?: Date }) => {
		setPeriod(value);
	};

	const periodFormatted = {
		after: period.after ? period.after.toISOString() : dayjs().startOf("month").toISOString(),
		before: period.before ? period.before.toISOString() : dayjs().endOf("month").toISOString(),
	};

	return (
		<div className="w-full h-full flex flex-col gap-3">
			{/* Date Range Picker */}
			<div className="w-full flex items-center justify-end">
				<div className="w-fit">
					<DateIntervalInput label="Período" value={period} handleChange={handlePeriodChange} showLabel={false} width="350px" />
				</div>
			</div>

			{/* Stats Block */}
			<CashbackStatsBlock period={periodFormatted} />

			{/* Recent Transactions and Top Clients */}
			<div className="w-full flex flex-col lg:flex-row gap-3 items-stretch">
				<div className="w-full lg:w-1/2">
					<RecentTransactionsBlock period={periodFormatted} />
				</div>
				<div className="w-full lg:w-1/2">
					<TopClientsBlock />
				</div>
			</div>
		</div>
	);
}

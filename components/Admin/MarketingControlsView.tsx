import React, { useState } from 'react'
import LoadingComponent from '../Layouts/LoadingComponent'
import ErrorComponent from '../Layouts/ErrorComponent'
import { TUserSession } from '@/schemas/users'
import { formatToMoney } from '@/lib/formatting'
import { Pencil } from 'lucide-react'

import { getMonthLabel } from '@/utils/constants'
import { useMarketingControls } from '@/lib/queries/marketing-controls'
import { TMarketingControlDTO } from '@/schemas/marketing-controls'
import NewMarketingControl from '../Modals/MarketingControls/NewMarketingControl'
import EditMarketingControl from '../Modals/MarketingControls/EditMarketingControl'
import { BsMegaphoneFill } from 'react-icons/bs'
import MarketingSalesStats from '../Marketing/MarketingSalesStats'
import MarketingControlsBlock from '../Marketing/MarketingControlsBlock'

type MarketingControlViewProps = {
  session: TUserSession
}
function MarketingControlView({ session }: MarketingControlViewProps) {
  return (
    <div className="flex h-full grow flex-col gap-6 py-4">
      <MarketingControlsBlock session={session} />
      <MarketingSalesStats />
    </div>
  )
}

export default MarketingControlView

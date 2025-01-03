import React, { useState } from 'react'
import MultipleSalesSelectInput from '@/components/Inputs/SelectMultipleSalesInput'

function teste() {
  const [selected, setSelected] = useState<string[]>([])
  console.log(selected)
  return (
    <div className="w-full h-full grow flex items-center justify-center">
      <MultipleSalesSelectInput
        showLabel={false}
        label="VENDAS EXCLUÍDAS"
        selected={selected}
        handleChange={(value) => setSelected(value as string[])}
        selectedItemLabel="VENDAS EXCLUÍDAS"
        onReset={() => setSelected([])}
        width="100%"
      />
    </div>
  )
}

export default teste

import { isEmpty } from '@/utils/methods'
import React from 'react'
type NumberInputProps = {
  width?: string
  label: string
  labelClassName?: string
  showLabel?: boolean
  value: number | null
  editable?: boolean
  placeholder: string
  handleChange: (value: number) => void
}
function NumberInput({
  width,
  label,
  labelClassName = 'font-sans font-bold  text-[#353432]',
  showLabel = true,
  value,
  editable = true,
  placeholder,
  handleChange,
}: NumberInputProps) {
  const inputIdentifier = label.toLowerCase().replace(' ', '_')
  return (
    <div className={`flex w-full flex-col gap-1 lg:w-[${width ? width : '350px'}]`}>
      {showLabel ? (
        <label htmlFor={inputIdentifier} className={labelClassName}>
          {label}
        </label>
      ) : null}

      <input
        readOnly={!editable}
        value={!isEmpty(value) ? value?.toString() : ''}
        onChange={(e) => handleChange(Number(e.target.value))}
        id={inputIdentifier}
        type="number"
        step={0.01}
        placeholder={placeholder}
        className="w-full rounded-md border border-gray-200 p-3 text-sm shadow-sm outline-none placeholder:italic"
      />
    </div>
  )
}

export default NumberInput

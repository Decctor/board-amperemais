import React from 'react'
import { BsCheck } from 'react-icons/bs'
type CheckboxInputProps = {
  checked: boolean
  labelTrue: string
  labelFalse: string
  labelClassName?: string
  handleChange: (value: boolean) => void
  editable?: boolean
  justify?: string
  padding?: string
}
function CheckboxInput({
  labelTrue,
  labelFalse,
  labelClassName = 'cursor-pointer font-medium leading-none text-xs grow',
  checked,
  handleChange,
  editable = true,
  justify = 'justify-center',
  padding = '0.75rem',
}: CheckboxInputProps) {
  return (
    <div className={`flex w-full items-center ${justify} gap-2 ${padding ? `p-[${padding}]` : 'p-3'}`}>
      <div
        className={`flex h-[16px] min-h-[16px] w-[16px] min-w-[16px] items-center justify-center rounded-full border border-black ${
          editable ? 'cursor-pointer' : ''
        }`}
        onClick={() => {
          if (editable) handleChange(!checked)
        }}
      >
        {checked ? <BsCheck style={{ color: 'black' }} /> : null}
      </div>
      <p
        className={labelClassName}
        onClick={() => {
          if (editable) handleChange(!checked)
        }}
      >
        {checked ? labelTrue : labelFalse}
      </p>
    </div>
  )
}

export default CheckboxInput

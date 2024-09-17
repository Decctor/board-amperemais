import React from 'react'
type DateTimeProps = {
  width?: string
  label: string
  labelClassName?: string
  showLabel?: boolean
  value: string | undefined
  editable?: boolean
  handleChange: (value: string | undefined) => void
}
function DateTimeInput({
  width,
  label,
  labelClassName = 'font-sans font-bold  text-[#353432]',
  showLabel = true,
  value,
  editable = true,
  handleChange,
}: DateTimeProps) {
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
        value={value}
        onChange={(e) => {
          handleChange(e.target.value != '' ? e.target.value : undefined)
        }}
        id={inputIdentifier}
        onReset={() => handleChange(undefined)}
        type="datetime-local"
        className="w-full rounded-md border border-gray-200 p-3 text-sm shadow-sm outline-none placeholder:italic"
      />
    </div>
  )
}

export default DateTimeInput

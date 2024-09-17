import React from 'react'

type TextareaInputProps = {
  label: string
  value: string
  placeholder: string
  editable?: boolean
  handleChange: (value: string) => void
}
function TextareaInput({ label, value, placeholder, editable = true, handleChange }: TextareaInputProps) {
  return (
    <div className="flex w-full flex-col rounded-md border border-gray-300 shadow-sm">
      <h1 className="font w-full rounded-tl-md rounded-tr-md bg-gray-600 p-1 text-center text-xs font-bold text-white">{label}</h1>
      <textarea
        disabled={!editable}
        placeholder={placeholder}
        value={value}
        onChange={(e) => {
          handleChange(e.target.value)
        }}
        className="min-h-[65px] w-full resize-none rounded-bl-md rounded-br-md bg-gray-50 p-3 text-center text-xs font-medium text-gray-600 outline-none"
      />
    </div>
  )
}

export default TextareaInput

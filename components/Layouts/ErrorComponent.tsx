import React from 'react'
import { MdOutlineError } from 'react-icons/md'
type ErrorComponentProps = {
  msg?: string
}
function ErrorComponent({ msg }: ErrorComponentProps) {
  return (
    <div className="flex h-full w-full grow flex-col items-center justify-center">
      <MdOutlineError color="#F31559" size={35} />
      <p className="text-sm font-medium italic text-gray-500">{msg ? msg : 'Oops, houve um erro.'}</p>
    </div>
  )
}

export default ErrorComponent

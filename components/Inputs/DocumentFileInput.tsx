import { useClickOutside } from '@/lib/hooks'
import { handleRenderIcon, renderIcon } from '@/lib/methods/rendering'

import { formatLongString } from '@/utils/methods'
import { TFileReferenceDTO } from '@/utils/schemas/file-reference.schema'
import React, { useRef, useState } from 'react'

import { BsCheck2All, BsCloudUploadFill } from 'react-icons/bs'

type DocumentFileInputProps = {
  label: string
  value: File | string | null
  handleChange: (file: File | null | string) => void
  fileReferences?: TFileReferenceDTO[]
  multiple?: boolean
}
function DocumentFileInput({ label, value, handleChange, fileReferences, multiple = false }: DocumentFileInputProps) {
  const ref = useRef(null)
  const inputIdentifier = label.toLowerCase().replace(' ', '_')
  const [showMenu, setShowMenu] = useState<boolean>(false)
  useClickOutside(ref, () => setShowMenu(false))
  return (
    <div ref={ref} className="relative flex w-full flex-col justify-center self-center">
      <div className="flex w-full items-center justify-between gap-2">
        <label htmlFor={inputIdentifier} className={'text-start font-sans font-bold text-[#353432]'}>
          {label}
        </label>
        {fileReferences ? (
          !showMenu ? (
            <button
              onClick={() => setShowMenu(true)}
              className="min-w-fit rounded-md bg-blue-800 px-2 py-1 text-[0.55rem] font-medium text-white hover:bg-blue-600"
            >
              MOSTRAR OPÇÕES
            </button>
          ) : (
            <button
              onClick={() => setShowMenu(false)}
              className="min-w-fit rounded-md bg-red-600 px-2 py-1 text-[0.55rem] font-medium text-white hover:bg-red-500"
            >
              FECHAR OPÇÕES
            </button>
          )
        ) : null}
      </div>
      <div className="relative mt-2 flex w-full items-center justify-center">
        <label
          htmlFor="dropzone-file"
          className={`flex min-h-[58px] w-full cursor-pointer flex-col items-center justify-center rounded-md border border-gray-200  bg-[#fff] p-3 hover:border-blue-300 hover:bg-blue-100`}
        >
          <div className="flex w-full items-center gap-2">
            {value ? (
              <p className="grow text-center leading-none tracking-tight text-gray-500">
                {typeof value != 'string' ? value.name : formatLongString(value, 30)}
              </p>
            ) : (
              <p className="grow text-center leading-none tracking-tight text-gray-500">
                <span className="font-semibold text-cyan-500">Clique para escolher um arquivo</span> ou o arraste para a àrea demarcada
              </p>
            )}
            {value ? <BsCheck2All size={30} color={'rgb(34,197,94)'} /> : <BsCloudUploadFill size={30} />}
          </div>
          <input
            onChange={(e) => {
              if (e.target.files) return handleChange(e.target.files[0])
              else return handleChange(null)
            }}
            id="dropzone-file"
            type="file"
            className="absolute h-full w-full opacity-0"
            multiple={multiple}
          />
        </label>
      </div>
      {showMenu ? (
        <div className="absolute top-[95px] z-[100] flex h-[250px] max-h-[250px] w-full flex-col gap-2 self-center overflow-y-auto overscroll-y-auto rounded-md border border-gray-200 bg-[#fff] p-2 py-1 shadow-sm scrollbar-thin scrollbar-track-gray-100 scrollbar-thumb-gray-300">
          {fileReferences?.map((reference) => (
            <div key={reference._id} className="flex w-full flex-col rounded-md border border-cyan-500 p-2">
              <div className="flex w-full items-center justify-between gap-1">
                <div className="flex grow items-center gap-1">
                  {handleRenderIcon(reference.formato, 12)}
                  <a
                    href={reference.url}
                    className="text-[0.65rem] font-bold leading-none tracking-tight text-gray-500 duration-300 ease-in-out hover:text-cyan-500"
                  >
                    {reference.titulo}
                  </a>
                </div>
                {value == reference.url ? (
                  <h1 className="rounded-md bg-green-600 px-2 py-1 text-[0.55rem] font-medium text-white">ESCOLHIDO</h1>
                ) : (
                  <button
                    onClick={() => handleChange(reference.url)}
                    className="rounded-md bg-cyan-600 px-2 py-1 text-[0.55rem] font-medium text-white hover:bg-cyan-500"
                  >
                    USAR ARQUIVO
                  </button>
                )}
              </div>
              <div className="mt-1 flex w-full items-center justify-between gap-2">
                <h1 className="text-center text-[0.6rem] font-medium italic text-gray-500">{reference.formato}</h1>
              </div>
            </div>
          ))}
        </div>
      ) : null}
      {/* <div className="relative mt-2 flex h-fit items-center justify-center rounded-lg border-2 border-dotted border-blue-700 bg-gray-100 p-2">
        <div className="absolute">
          {value ? (
            <div className="flex flex-col items-center">
              <i className="fa fa-folder-open fa-4x text-blue-700"></i>
              <span className="block text-center font-normal text-gray-400">
                {typeof value != 'string' ? value.name : formatLongString(value, 30)}
              </span>
            </div>
          ) : (
            <div className="flex flex-col items-center">
              <i className="fa fa-folder-open fa-4x text-blue-700"></i>
              <span className="block font-normal text-gray-400">Adicione o arquivo aqui...</span>
            </div>
          )}
        </div>
        <input
          onChange={(e) => handleChange(e.target.files ? e.target.files[0] : null)}
          className="h-full w-full opacity-0"
          type="file"
          accept=".png, .jpeg, .pdf"
        />
      </div> */}
    </div>
  )
}

export default DocumentFileInput

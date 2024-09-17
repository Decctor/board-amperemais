import { handleRenderIcon } from '@/lib/methods/rendering'
import { formatLongString } from '@/utils/methods'
import { TFileReferenceDTO } from '@/utils/schemas/file-reference.schema'
import React, { useState } from 'react'
import { BsCheck2All, BsCloudUploadFill, BsLockFill } from 'react-icons/bs'
import { MdOutlineAttachFile } from 'react-icons/md'
import { TbBoxMultiple } from 'react-icons/tb'
import { VscChromeClose } from 'react-icons/vsc'

type DocumentationInputProps = {
  label: string
  value: FileList | string | null
  handleChange: (
    file: {
      type: 'FILE-REFERENCE' | 'FILE-LIST'
      value: FileList | string
    } | null
  ) => void
  description: string
  obligatory: boolean
  multiple: boolean
  fileReferences?: TFileReferenceDTO[]
}
function DocumentationInput({ label, value, handleChange, description, obligatory, multiple, fileReferences }: DocumentationInputProps) {
  const inputIdentifier = label.toLowerCase().replace(' ', '_')
  const [showReferencesMenu, setShowReferencesMenu] = useState<boolean>(false)
  return (
    <div className="flex w-full flex-col rounded-md border border-gray-500 p-2">
      <div className="flex w-full flex-row items-center justify-between gap-2">
        <div className="flex grow flex-wrap items-center gap-2">
          <div className="flex items-center gap-1">
            <div className="flex h-[25px] w-[25px] items-center justify-center rounded-full border border-black p-1">
              <MdOutlineAttachFile size={13} />
            </div>
            <label htmlFor={inputIdentifier} className="text-xs font-medium leading-none tracking-tight lg:text-sm">
              {label}
            </label>
          </div>
          {obligatory ? (
            <div className="flex items-center gap-1 rounded-full border-red-600 bg-red-50 px-2 py-1 text-red-600">
              <BsLockFill size={12} />
              <p className="text-[0.65rem]">OBRIGATÓRIO</p>
            </div>
          ) : null}

          {multiple ? (
            <div className="flex items-center gap-1 rounded-full border-blue-600 bg-blue-50 px-2 py-1 text-blue-600">
              <TbBoxMultiple size={12} />
              <p className="text-[0.65rem]">MÚLTIPLO</p>
            </div>
          ) : null}
        </div>
      </div>
      <div className="my-2 text-start text-[0.65rem] tracking-tight text-gray-500 lg:text-xs">{description || 'NENHUMA DESCRIÇÃO DEFINIDA.'}</div>
      <div className="relative mt-2 flex w-full items-center justify-center">
        <label
          htmlFor={inputIdentifier}
          className={`flex min-h-[58px] w-full cursor-pointer flex-col items-center justify-center rounded-md border border-gray-200  bg-[#fff] p-3 hover:border-blue-300 hover:bg-blue-100`}
        >
          <div className="flex w-full items-center gap-2">
            {value ? (
              <p className="grow text-center text-xs leading-none tracking-tight text-gray-500 lg:text-base">
                {typeof value != 'string' ? (value.length > 1 ? `${value[0].name}, outros...` : value[0].name) : 'ARQUIVO DE REFERÊNCIA'}
              </p>
            ) : (
              <p className="grow text-center text-xs leading-none tracking-tight text-gray-500 lg:text-base">
                <span className="font-semibold text-cyan-500">Clique para escolher um arquivo</span> ou o arraste para a àrea demarcada
              </p>
            )}
            {value ? <BsCheck2All size={30} color={'rgb(34,197,94)'} /> : <BsCloudUploadFill size={30} />}
          </div>
          <input
            onChange={(e) => {
              if (e.target.files)
                return handleChange({
                  type: 'FILE-LIST',
                  value: e.target.files,
                })
              else return handleChange(null)
            }}
            id={inputIdentifier}
            type="file"
            className="absolute h-full w-full opacity-0"
            multiple={multiple}
          />
        </label>
      </div>
      {fileReferences && fileReferences.length > 0 ? (
        <div className="mt-1 flex w-full flex-col gap-1">
          <div className="flex w-full items-center justify-center lg:justify-end">
            {showReferencesMenu ? (
              <button
                onClick={() => setShowReferencesMenu(false)}
                className="flex items-center gap-1 rounded border border-red-500 bg-red-50 px-2 py-1 text-red-500 duration-300 ease-in-out hover:bg-red-100"
              >
                <p className="text-[0.6rem]">FECHAR</p>
                <VscChromeClose size={15} />
              </button>
            ) : (
              <button
                onClick={() => setShowReferencesMenu(true)}
                className="flex items-center gap-1 rounded border border-blue-500 bg-blue-50 px-2 py-1 text-blue-500 duration-300 ease-in-out hover:bg-blue-100"
              >
                <p className="text-[0.6rem]">USAR REFERÊNCIAS</p>
                <MdOutlineAttachFile size={15} />
              </button>
            )}
          </div>
          {showReferencesMenu
            ? fileReferences.map((reference) => (
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
                        onClick={() => {
                          handleChange({
                            type: 'FILE-REFERENCE',
                            value: reference._id,
                          })
                          setShowReferencesMenu(false)
                        }}
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
              ))
            : null}
        </div>
      ) : null}
    </div>
  )
}

export default DocumentationInput

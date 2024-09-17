import { IProject } from '@/utils/models'
import { storage } from '../../services/firebase/storage-config'
import { FullMetadata, getMetadata, ref } from 'firebase/storage'
import React, { useState } from 'react'
import { AiOutlineCheck } from 'react-icons/ai'
import { TbDownload } from 'react-icons/tb'
import { fileTypes } from '@/utils/constants'
import axios from 'axios'
import JSZip from 'jszip'
import { basename } from 'path'
import { toast } from 'react-hot-toast'
type SingleFileInputProps = {
  label: string
  width?: string
  placeholder?: string
  acceptedFiles?: string
  fileKey: string
  currentFileUrl?: string
  info: IProject
  infoHolder: IProject | undefined
  handleAttachment: (fileKey: string, file: File) => void
}
function SingleFileInput({
  label,
  width,
  placeholder = 'Adicione o arquivo aqui',
  acceptedFiles,
  fileKey,
  currentFileUrl,
  info,
  infoHolder,
  handleAttachment,
}: SingleFileInputProps) {
  const inputIdentifier = label.toLowerCase().replace(' ', '_')
  const [file, setFile] = useState<File | null>(null)

  function formatLongString(str: string) {
    if (str.length > 50) {
      return str.substring(0, 50) + '\u2026'
    } else {
      return str
    }
  }
  async function handleDownload(url: string) {
    var splitFileName = label.toUpperCase().split(' ')
    var fixedFileName = splitFileName.join('_')
    if (info.nome) {
      fixedFileName = `${info.nome}-${fixedFileName}`
    }
    let fileRef = ref(storage, url)
    const metadata = await getMetadata(fileRef)
    const md = metadata as FullMetadata

    const filePath = fileRef.fullPath
    // @ts-ignore
    const extension = fileTypes[metadata.contentType]?.extension
    const toastID = toast.loading('Baixando arquivo...')
    try {
      const response = await axios.get(`/api/utils/downloadFirebase?filePath=${encodeURIComponent(filePath)}`, {
        responseType: 'blob',
      })

      // Given that the API now returns zipped files for reduced size, we gotta decompress
      const zip = new JSZip()
      const unzippedFiles = await zip.loadAsync(response.data)
      const proposal = await unzippedFiles.file(basename(filePath))?.async('arraybuffer')
      if (!proposal) {
        toast.error('Erro ao descomprimir o arquivo da proposta.')
        throw 'Erro ao descomprimir proposta.'
      }
      const url = window.URL.createObjectURL(new Blob([proposal]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `${fixedFileName}${extension}`)
      document.body.appendChild(link)
      link.click()
      toast.dismiss(toastID)
      link.remove()
    } catch (error) {
      toast.error('Houve um erro no download do arquivo.')
    }
  }
  return (
    <div className="flex w-full gap-2">
      <div className={`flex w-full grow flex-col gap-1 lg:w-[${width ? width : '350px'}]`}>
        <label htmlFor={inputIdentifier} className="font-sans font-bold  text-[#353432]">
          {label}
        </label>
        <div className="relative flex h-[46px] w-full items-center justify-center overflow-x-hidden rounded-lg border-2 border-dotted border-blue-700 bg-gray-100 p-2">
          <div className="absolute">
            {file ? (
              <div className="flex flex-col items-center">
                <i className="fa fa-folder-open fa-4x text-blue-700"></i>
                <span className="block text-center text-sm font-normal text-gray-400">{file ? file.name : `-`}</span>
              </div>
            ) : (
              <div className="flex flex-col items-center overflow-x-hidden text-sm">
                <i className="fa fa-folder-open fa-4x text-blue-700"></i>
                <span className="block w-full overflow-x-hidden font-normal text-gray-400">
                  {currentFileUrl ? formatLongString(currentFileUrl) : placeholder}
                </span>
              </div>
            )}
          </div>
          <input
            onChange={(e) => {
              if (e.target.files) setFile(e.target.files[0])
            }}
            className="h-full w-full opacity-0"
            type="file"
            id={inputIdentifier}
            accept={acceptedFiles ? acceptedFiles : '.png, .jpeg, .jpg, .pdf, .docx, .doc'}
          />
        </div>
      </div>
      <div className="flex flex-col items-end justify-end gap-2">
        {!!file || (!file && !currentFileUrl) ? (
          <button
            disabled={!file}
            onClick={async () => {
              // updateData("PROJETO", "servicosAdicionais", {
              //   outros: infoHolder?.servicosAdicionais?.outros,
              // })
              console.log('UEPA')
              if (file) {
                await handleAttachment(fileKey, file)
                setFile(null)
              }
            }}
            className="cursor-pointer pb-4 text-green-200"
          >
            <AiOutlineCheck
              style={{
                fontSize: '18px',
                color: file ? 'rgb(34,197,94)' : 'rgb(156,163,175)',
              }}
            />
          </button>
        ) : null}

        {currentFileUrl && !file ? (
          <div
            onClick={() => handleDownload(currentFileUrl)}
            className="flex cursor-pointer items-center justify-center pb-4 text-blue-700 duration-300 ease-in-out hover:scale-105 hover:text-blue-500"
          >
            <TbDownload />
          </div>
        ) : null}
      </div>
    </div>
  )
}

export default SingleFileInput

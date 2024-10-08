import { TUser, TUserSession } from '@/schemas/users'
import React, { useState } from 'react'
import { VscChromeClose } from 'react-icons/vsc'
import * as Dialog from '@radix-ui/react-dialog'
import TextInput from '@/components/Inputs/TextInput'
import SelectInput from '@/components/Inputs/SelectInput'
import { useSaleQueryFilterOptions } from '@/lib/queries/stats/utils'
import { LoadingButton } from '@/components/loading-button'
import { useMutationWithFeedback } from '@/lib/mutations/common'
import { createUser } from '@/lib/mutations/users'
import { useQueryClient } from '@tanstack/react-query'
type NewUserProps = {
  session: TUserSession
  closeModal: () => void
}
function NewUser({ session, closeModal }: NewUserProps) {
  const queryClient = useQueryClient()
  const [infoHolder, setInfoHolder] = useState<TUser>({
    nome: '',
    usuario: '',
    senha: '',
    visualizacao: 'PRÓPRIA',
    vendedor: '',
    dataInsercao: new Date().toISOString(),
  })
  const { data: filterOptions } = useSaleQueryFilterOptions()

  const { mutate, isPending } = useMutationWithFeedback({
    mutationKey: ['create-user'],
    mutationFn: createUser,
    queryClient: queryClient,
    affectedQueryKey: ['users'],
  })
  return (
    <Dialog.Root open onOpenChange={closeModal}>
      <Dialog.Overlay className="fixed inset-0 z-[100] bg-primary/70 backdrop-blur-sm" />
      <Dialog.Content className="fixed left-[50%] top-[50%] z-[100] h-[70%] w-[90%] translate-x-[-50%] translate-y-[-50%] rounded-md bg-background p-[10px] lg:h-[60%] lg:w-[40%]">
        <div className="flex h-full w-full flex-col">
          <div className="flex flex-col items-center justify-between border-b border-gray-200 px-2 pb-2 text-lg lg:flex-row">
            <h3 className="text-sm font-bold lg:text-xl">NOVO USUÁRIO</h3>
            <button
              onClick={() => closeModal()}
              type="button"
              className="flex items-center justify-center rounded-lg p-1 duration-300 ease-linear hover:scale-105 hover:bg-red-200"
            >
              <VscChromeClose style={{ color: 'red' }} />
            </button>
          </div>
          <div className="scrollbar-thin scrollbar-track-gray-100 scrollbar-thumb-gray-300 flex grow flex-col gap-y-2 overflow-y-auto overscroll-y-auto p-2 py-1">
            <div className="flex w-full flex-col items-center gap-2 lg:flex-row">
              <div className="w-full lg:w-1/2">
                <TextInput
                  value={infoHolder.nome}
                  label="NOME DO USUÁRIO"
                  placeholder="Preencha aqui o nome do usuário..."
                  handleChange={(value) => setInfoHolder((prev) => ({ ...prev, nome: value }))}
                  width="100%"
                />
              </div>
              <div className="w-full lg:w-1/2">
                <SelectInput
                  value={infoHolder.visualizacao}
                  options={[
                    { id: 1, label: 'PRÓPRIA', value: 'PRÓPRIA' },
                    { id: 2, label: 'GERAL', value: 'GERAL' },
                  ]}
                  label="TIPO DE VISUALIZAÇÃO"
                  selectedItemLabel="NÃO DEFINIDO"
                  onReset={() => setInfoHolder((prev) => ({ ...prev, visualizacao: 'PRÓPRIA' }))}
                  handleChange={(value) => setInfoHolder((prev) => ({ ...prev, visualizacao: value }))}
                  width="100%"
                />
              </div>
            </div>
            <div className="flex w-full flex-col items-center gap-2">
              <div className="w-full">
                <TextInput
                  value={infoHolder.usuario}
                  label="USUÁRIO DE ACESSO"
                  placeholder="Preencha aqui o usuário de acesso..."
                  handleChange={(value) => setInfoHolder((prev) => ({ ...prev, usuario: value }))}
                  width="100%"
                />
              </div>
              <div className="w-full">
                <TextInput
                  value={infoHolder.senha}
                  label="SENHA DE ACESSO"
                  placeholder="Preencha aqui a senha de acesso..."
                  handleChange={(value) => setInfoHolder((prev) => ({ ...prev, senha: value }))}
                  width="100%"
                />
              </div>
              <div className="w-full">
                <SelectInput
                  value={infoHolder.vendedor}
                  options={filterOptions?.sellers.map((seller, index) => ({ id: index + 1, label: seller, value: seller })) || []}
                  label="VENDEDOR VINCULADO"
                  selectedItemLabel="NÃO DEFINIDO"
                  onReset={() => setInfoHolder((prev) => ({ ...prev, vendedor: '' }))}
                  handleChange={(value) => setInfoHolder((prev) => ({ ...prev, vendedor: value }))}
                  width="100%"
                />
              </div>
            </div>
          </div>
          <div className="mt-1 flex w-full items-end justify-end">
            <LoadingButton
              onClick={() => {
                // @ts-ignore
                mutate(infoHolder)
              }}
              loading={isPending}
            >
              CRIAR USUÁRIO
            </LoadingButton>
          </div>
        </div>
      </Dialog.Content>
    </Dialog.Root>
  )
}

export default NewUser

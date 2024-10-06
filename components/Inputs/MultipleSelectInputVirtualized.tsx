import { useMediaQuery } from '@/lib/hooks/use-media-query'
import React, { useEffect, useRef, useState } from 'react'
import { HiCheck } from 'react-icons/hi'
import { IoMdArrowDropdown, IoMdArrowDropup } from 'react-icons/io'
import { VariableSizeList } from 'react-window'
import { Drawer, DrawerContent } from '../ui/drawer'

type SelectOption<T> = {
  id: string | number
  value: any
  label: string
}
type SelectInputProps<T> = {
  width?: string
  label: string
  labelClassName?: string
  showLabel?: boolean
  selected: (string | number)[] | null
  selectedItemLabel: string
  options: SelectOption<T>[] | null
  handleChange: (value: T[]) => void
  onReset: () => void
}

function MultipleSelectInputVirtualized<T>({
  width,
  label,
  labelClassName = 'text-sm tracking-tight text-primary/80 font-medium text-start',
  showLabel = true,
  selected,
  options,
  selectedItemLabel,
  handleChange,
  onReset,
}: SelectInputProps<T>) {
  function getValueID(selected: (string | number)[] | null) {
    if (options && selected) {
      const filteredOptions = options?.filter((option) => selected.includes(option.value))
      if (filteredOptions) {
        const arrOfIds = filteredOptions.map((option) => option.id)
        return arrOfIds
      } else return null
    } else return null
  }

  const ref = useRef<any>(null)
  const [items, setItems] = useState<SelectOption<T>[] | null>(options)
  const isDesktop = useMediaQuery('(min-width: 768px)')
  const [selectMenuIsOpen, setSelectMenuIsOpen] = useState<boolean>(false)
  const [selectedIds, setSelectedIds] = useState<(string | number)[] | null>(getValueID(selected))

  const [searchFilter, setSearchFilter] = useState<string>('')
  const [dropdownDirection, setDropdownDirection] = useState<'up' | 'down'>('down')

  const inputIdentifier = label.toLowerCase().replace(' ', '_')
  function handleSelect(id: string | number, item: T) {
    var itemsSelected
    var ids = selectedIds ? [...selectedIds] : []
    if (!ids?.includes(id)) {
      ids.push(id)
      itemsSelected = options?.filter((option) => ids?.includes(option.id))
      itemsSelected = itemsSelected?.map((item) => item.value)
    } else {
      let index = ids.indexOf(id)
      ids.splice(index, 1)
      itemsSelected = options?.filter((option) => ids?.includes(option.id))
      itemsSelected = itemsSelected?.map((item) => item.value)
    }
    handleChange(itemsSelected as T[])
    setSelectedIds(ids)
  }
  function handleFilter(value: string) {
    setSearchFilter(value)
    if (!items) return
    if (value.trim().length > 0 && options) {
      let filteredItems = options.filter((item) => item.label.toUpperCase().includes(value.toUpperCase()))
      setItems(filteredItems)
      return
    } else {
      setItems(options)
      return
    }
  }
  function resetState() {
    onReset()
    setSelectedIds(null)
    setSelectMenuIsOpen(false)
  }
  function onClickOutside() {
    setSearchFilter('')
    setSelectMenuIsOpen(false)
  }

  const List = ({ height, width, list }: { height: number | string; width: number | string; list: SelectOption<T>[] }) => (
    <VariableSizeList
      height={height}
      width={width}
      itemCount={list ? list.length : 0}
      itemSize={(index) => 30} // Adjust the item height as needed
    >
      {({ index, style }) => (
        <div
          style={style}
          onClick={() => handleSelect(list[index] ? list[index].id : 0, list[index]?.value)}
          className={`flex w-full cursor-pointer items-center rounded p-1 px-2 hover:bg-primary/20 ${
            selectedIds?.includes(list[index] ? list[index].id : 0) ? 'bg-primary/20' : ''
          }`}
        >
          <p className="grow text-sm font-medium text-primary">{list[index]?.label}</p>
          {selectedIds?.includes(list[index] ? list[index].id : 0) ? <HiCheck style={{ color: '#fead61', fontSize: '20px' }} /> : null}
        </div>
      )}
    </VariableSizeList>
  )

  useEffect(() => {
    // setSelectedIds(getValueID(selected));
    setItems(options)
  }, [options, selected])
  useEffect(() => {
    const handleClickOutside = (event: any) => {
      if (ref.current && !ref.current.contains(event.target) && isDesktop) {
        onClickOutside()
      }
    }
    document.addEventListener('click', (e) => handleClickOutside(e), true)
    return () => {
      document.removeEventListener('click', (e) => handleClickOutside(e), true)
    }
  }, [onClickOutside])
  useEffect(() => {
    if (selectMenuIsOpen && ref.current) {
      const rect = ref.current.getBoundingClientRect()
      const spaceBelow = window.innerHeight - rect.bottom
      const spaceAbove = rect.top

      if (spaceBelow < 250 && spaceAbove > spaceBelow) {
        setDropdownDirection('up')
      } else {
        setDropdownDirection('down')
      }
    }
  }, [selectMenuIsOpen])

  if (isDesktop)
    return (
      <div ref={ref} className={`relative flex w-full flex-col gap-1 lg:w-[${width ? width : '350px'}]`}>
        {showLabel ? (
          <label htmlFor={inputIdentifier} className={labelClassName}>
            {label}
          </label>
        ) : null}

        <div
          className={`flex h-full min-h-[46.6px] w-full items-center justify-between rounded-md border duration-500 ease-in-out ${
            selectMenuIsOpen ? 'border-primary' : 'border-primary/20'
          } bg-[#fff] p-3 text-sm shadow-sm dark:bg-[#121212]`}
        >
          {selectMenuIsOpen ? (
            <input
              type="text"
              autoFocus
              value={searchFilter}
              onChange={(e) => handleFilter(e.target.value)}
              placeholder="Filtre o item desejado..."
              className="h-full w-full text-sm italic outline-none"
            />
          ) : (
            <p onClick={() => setSelectMenuIsOpen((prev) => !prev)} className="grow cursor-pointer text-primary">
              {selectedIds && selectedIds.length > 0 && options
                ? options.filter((item) => selectedIds.includes(item.id)).length > 1
                  ? 'MÚLTIPLAS SELEÇÕES'
                  : options.filter((item) => selectedIds.includes(item.id))[0]?.label
                : 'NÃO DEFINIDO'}
            </p>
          )}
          {selectMenuIsOpen ? (
            <IoMdArrowDropup style={{ cursor: 'pointer' }} onClick={() => setSelectMenuIsOpen((prev) => !prev)} />
          ) : (
            <IoMdArrowDropdown style={{ cursor: 'pointer' }} onClick={() => setSelectMenuIsOpen((prev) => !prev)} />
          )}
        </div>
        {selectMenuIsOpen ? (
          <div
            className={`absolute ${
              dropdownDirection === 'down' ? 'top-[75px]' : 'bottom-[75px]'
            } scrollbar-thin scrollbar-track-gray-100 scrollbar-thumb-gray-300 z-[100] flex h-[250px] max-h-[250px] w-full flex-col self-center overflow-y-auto overscroll-y-auto rounded-md border border-primary/20 bg-[#fff] p-2 py-1 shadow-sm dark:bg-[#121212]`}
          >
            <div
              onClick={() => resetState()}
              className={`flex w-full cursor-pointer items-center rounded p-1 px-2 hover:bg-primary/20 ${!selectedIds ? 'bg-primary/20' : ''}`}
            >
              <p className="grow font-medium text-primary">{selectedItemLabel}</p>
              {!selectedIds ? <HiCheck style={{ color: '#fead61', fontSize: '20px' }} /> : null}
            </div>
            <div className="my-2 h-[1px] w-full bg-gray-200"></div>
            <div className="flex w-full flex-col gap-y-1">
              {items ? (
                <List height={180} width={'100%'} list={items} />
              ) : (
                <p className="w-full text-center text-sm italic text-primary">Sem opções disponíveis.</p>
              )}
            </div>
          </div>
        ) : (
          false
        )}
      </div>
    )
  return (
    <Drawer open={selectMenuIsOpen} onOpenChange={setSelectMenuIsOpen}>
      <div ref={ref} className={`relative flex w-full flex-col gap-1 lg:w-[${width ? width : '350px'}]`}>
        {showLabel ? (
          <label htmlFor={inputIdentifier} className={labelClassName}>
            {label}
          </label>
        ) : null}

        <div
          className={`flex h-full min-h-[46.6px] w-full items-center justify-between rounded-md border duration-500 ease-in-out ${
            selectMenuIsOpen ? 'border-primary' : 'border-primary/20'
          } bg-[#fff] p-3 text-sm shadow-sm dark:bg-[#121212]`}
        >
          <p onClick={() => setSelectMenuIsOpen((prev) => !prev)} className="grow cursor-pointer text-primary">
            {selectedIds && selectedIds.length > 0 && options
              ? options.filter((item) => selectedIds.includes(item.id)).length > 1
                ? 'MÚLTIPLAS SELEÇÕES'
                : options.filter((item) => selectedIds.includes(item.id))[0]?.label
              : 'NÃO DEFINIDO'}
          </p>
          <IoMdArrowDropdown style={{ cursor: 'pointer' }} onClick={() => setSelectMenuIsOpen((prev) => !prev)} />
        </div>
        <DrawerContent className="gap-2 p-2">
          <p className="w-full text-center text-xs tracking-tight text-primary/80">
            {selectedIds && selectedIds.length > 0 && options
              ? options.filter((item) => selectedIds.includes(item.id)).length > 3
                ? 'Múltiplas opções selecionadas.'
                : `Selecionando: ${options
                    .filter((item) => selectedIds.includes(item.id))
                    .map((o) => o.label)
                    .join(',')}.`
              : 'Nenhuma opção selecionada.'}
          </p>
          <input
            type="text"
            autoFocus={true}
            value={searchFilter}
            onChange={(e) => handleFilter(e.target.value)}
            placeholder="Filtre o item desejado..."
            className="w-full bg-transparent p-2 text-sm italic outline-none"
          />

          <div
            onClick={() => resetState()}
            className={`flex w-full cursor-pointer items-center rounded p-1 px-2 hover:bg-primary/20 ${!selectedIds ? 'bg-primary/20' : ''}`}
          >
            <p className="grow font-medium text-primary">{selectedItemLabel}</p>
            {!selectedIds ? <HiCheck style={{ color: '#fead61', fontSize: '20px' }} /> : null}
          </div>
          <div className="my-2 h-[1px] w-full bg-gray-200"></div>
          <div className="scrollbar-thin scrollbar-track-gray-100 scrollbar-thumb-gray-300 flex h-[200px] min-h-[200px] flex-col gap-2 overflow-y-auto overscroll-y-auto lg:h-[350px] lg:max-h-[350px]">
            {items ? (
              <List height={180} width={'100%'} list={items} />
            ) : (
              <p className="w-full text-center text-sm italic text-primary">Sem opções disponíveis.</p>
            )}
          </div>
        </DrawerContent>
      </div>
    </Drawer>
  )
}

export default MultipleSelectInputVirtualized

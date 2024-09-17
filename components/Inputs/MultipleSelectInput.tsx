import React, { useEffect, useRef, useState } from 'react'
import lodash from 'lodash'
import { HiCheck } from 'react-icons/hi'
import { IoMdArrowDropdown, IoMdArrowDropup } from 'react-icons/io'

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
  editable?: boolean
  selectedItemLabel: string
  options: SelectOption<T>[] | null
  handleChange: (value: T[]) => void
  onReset: () => void
}

function MultipleSelectInput<T>({
  width,
  label,
  labelClassName = 'font-sans font-bold  text-[#353432] text-start',
  showLabel = true,
  selected,
  editable = true,
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
  const [selectMenuIsOpen, setSelectMenuIsOpen] = useState<boolean>(false)
  const [selectedIds, setSelectedIds] = useState<(string | number)[] | null>(getValueID(selected))

  const [searchFilter, setSearchFilter] = useState<string>('')
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

  useEffect(() => {
    // setSelectedIds(getValueID(selected));
    setItems(options)
  }, [options, selected])
  useEffect(() => {
    const handleClickOutside = (event: any) => {
      if (ref.current && !ref.current.contains(event.target)) {
        onClickOutside()
      }
    }
    document.addEventListener('click', (e) => handleClickOutside(e), true)
    return () => {
      document.removeEventListener('click', (e) => handleClickOutside(e), true)
    }
  }, [onClickOutside])
  return (
    <div ref={ref} draggable={false} className={`relative flex w-full flex-col gap-1 lg:w-[${width ? width : '350px'}]`}>
      {showLabel ? (
        <label htmlFor={inputIdentifier} className={labelClassName}>
          {label}
        </label>
      ) : null}

      <div className="flex h-[47px] w-full items-center justify-between rounded-md border border-gray-200 bg-[#fff] p-3 text-sm shadow-sm">
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
          <p
            onClick={() => {
              if (editable) setSelectMenuIsOpen((prev) => !prev)
            }}
            className="grow cursor-pointer text-[#353432]"
          >
            {selectedIds && selectedIds.length > 0 && options
              ? options.filter((item) => selectedIds.includes(item.id)).length > 1
                ? 'MÚLTIPLAS SELEÇÕES'
                : options.filter((item) => selectedIds.includes(item.id))[0].label
              : 'NÃO DEFINIDO'}
          </p>
        )}
        {selectMenuIsOpen ? (
          <IoMdArrowDropup
            style={{ cursor: 'pointer' }}
            onClick={() => {
              if (editable) setSelectMenuIsOpen((prev) => !prev)
            }}
          />
        ) : (
          <IoMdArrowDropdown
            style={{ cursor: 'pointer' }}
            onClick={() => {
              if (editable) setSelectMenuIsOpen((prev) => !prev)
            }}
          />
        )}
      </div>
      {selectMenuIsOpen ? (
        <div className="absolute top-[77px] z-[100] flex h-[250px] max-h-[250px] w-full flex-col self-center overflow-y-auto overscroll-y-auto rounded-md border border-gray-200 bg-[#fff] p-2 py-1 shadow-sm scrollbar-thin scrollbar-track-gray-100 scrollbar-thumb-gray-300">
          <div
            onClick={() => resetState()}
            className={`flex w-full cursor-pointer items-center rounded p-1 px-2 hover:bg-gray-100 ${!selectedIds ? 'bg-gray-100' : ''}`}
          >
            <p className="grow font-medium text-[#353432]">{selectedItemLabel}</p>
            {!selectedIds ? <HiCheck style={{ color: '#fead61', fontSize: '20px' }} /> : null}
          </div>
          <div className="my-2 h-[1px] w-full bg-gray-200"></div>
          {items ? (
            items.map((item, index) => (
              <div
                onClick={() => {
                  if (editable) handleSelect(item.id, item.value)
                }}
                key={item.id ? item.id : index}
                className={`flex w-full cursor-pointer items-center rounded p-1 px-2 hover:bg-gray-100 ${selectedIds?.includes(item.id) ? 'bg-gray-100' : ''}`}
              >
                <p className="grow font-medium text-[#353432]">{item.label}</p>
                {selectedIds?.includes(item.id) ? <HiCheck style={{ color: '#fead61', fontSize: '20px' }} /> : null}
              </div>
            ))
          ) : (
            <p className="w-full text-center text-sm italic text-[#353432]">Sem opções disponíveis.</p>
          )}
        </div>
      ) : (
        false
      )}
    </div>
  )
}

export default MultipleSelectInput

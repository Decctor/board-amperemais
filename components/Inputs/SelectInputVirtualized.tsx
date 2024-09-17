import React, { useEffect, useRef, useState } from 'react'

import { HiCheck } from 'react-icons/hi'
import { IoMdArrowDropdown, IoMdArrowDropup } from 'react-icons/io'
import { VariableSizeList } from 'react-window'

type SelectOption<T> = {
  id: string | number
  value: any
  label: string
}
type SelectInputVirtualizedProps<T> = {
  width?: string
  label: string
  labelClassName?: string
  showLabel?: boolean
  value: T | null
  editable?: boolean
  selectedItemLabel: string
  options: SelectOption<T>[] | null
  handleChange: (value: T) => void
  onReset: () => void
}

function SelectInputVirtualized<T>({
  width,
  label,
  labelClassName = 'font-sans font-bold  text-[#353432] text-start',
  showLabel = true,
  value,
  editable = true,
  options,
  selectedItemLabel,
  handleChange,
  onReset,
}: SelectInputVirtualizedProps<T>) {
  function getValueID(value: T | null) {
    if (options && value) {
      // console.log("OPTIONS", options);
      // console.log("VALUE", value);
      const filteredOption = options?.find((option) => option.value === value)
      if (filteredOption) return filteredOption.id
      else return null
    } else return null
  }

  const ref = useRef<any>(null)
  const [items, setItems] = useState<SelectOption<T>[] | null>(options)
  const [selectMenuIsOpen, setSelectMenuIsOpen] = useState<boolean>(false)
  const [selectedId, setSelectedId] = useState<number | string | null>(getValueID(value))

  const [searchFilter, setSearchFilter] = useState<string>('')
  const inputIdentifier = label.toLowerCase().replace(' ', '_')
  function handleSelect(id: string | number, item: T) {
    handleChange(item)
    setSelectedId(id)
    setSelectMenuIsOpen(false)
  }
  function handleFilter(value: string) {
    setSearchFilter(value)
    if (!items || !options) return
    if (value.trim().length > 0) {
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
    setSelectedId(null)
    setSelectMenuIsOpen(false)
  }
  function onClickOutside() {
    setSearchFilter('')
    setSelectMenuIsOpen(false)
  }
  useEffect(() => {
    setSelectedId(getValueID(value))
    setItems(options)
  }, [options, value])
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
          onClick={() => handleSelect(list[index].id, list[index].value)}
          className={`flex w-full cursor-pointer items-center rounded p-1 px-2 hover:bg-gray-100 ${selectedId === list[index].id ? 'bg-gray-100' : ''}`}
        >
          <p className="grow text-sm font-medium text-[#353432]">{list[index].label}</p>
          {selectedId === list[index].id ? <HiCheck style={{ color: '#fead61', fontSize: '20px' }} /> : null}
        </div>
      )}
    </VariableSizeList>
  )

  return (
    <div ref={ref} className={`relative flex w-full flex-col gap-1 lg:w-[${width ? width : '350px'}]`}>
      {showLabel ? (
        <label htmlFor={inputIdentifier} className={labelClassName}>
          {label}
        </label>
      ) : null}
      <div className="flex h-full min-h-[46.6px] w-full items-center justify-between rounded-md border border-gray-200 bg-[#fff] p-3 text-sm shadow-sm">
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
            {selectedId && options ? options.filter((item) => item.id == selectedId)[0].label : selectedItemLabel}
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
      {/** overflow-y-auto overscroll-y-auto scrollbar-thin scrollbar-track-gray-100 scrollbar-thumb-gray-300*/}
      {selectMenuIsOpen ? (
        <div className="absolute top-[75px] z-[100] flex h-[250px] max-h-[250px] w-full flex-col self-center rounded-md border border-gray-200 bg-[#fff] p-2 py-1 shadow-sm">
          <div
            onClick={() => resetState()}
            className={`flex w-full cursor-pointer items-center rounded p-1 px-2 hover:bg-gray-100 ${!selectedId ? 'bg-gray-100' : ''}`}
          >
            <p className="grow font-medium text-[#353432]">{selectedItemLabel}</p>
            {!selectedId ? <HiCheck style={{ color: '#fead61', fontSize: '20px' }} /> : null}
          </div>
          <div className="my-2 h-[1px] w-full bg-gray-200"></div>
          <div className="flex w-full flex-col gap-y-1">
            {items ? (
              <List height={180} width={'100%'} list={items} />
            ) : (
              <p className="w-full text-center text-sm italic text-[#353432]">Sem opções disponíveis.</p>
            )}
          </div>
        </div>
      ) : (
        false
      )}
    </div>
  )
}

export default SelectInputVirtualized

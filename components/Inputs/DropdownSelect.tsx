import React, { useState, useEffect, useRef } from 'react'
import { IoMdArrowDropdown, IoMdArrowDropup } from 'react-icons/io'
import { HiCheck } from 'react-icons/hi'
type DropdownOption<T> = {
  id: string | number
  value: T
  label: string
}
type DropdownSelectProps<T> = {
  selectedItemLabel: string
  options: DropdownOption<T>[] | null
  value: number | string | null
  editable?: boolean
  categoryName: string
  width?: string
  height?: string
  onChange: (value: DropdownOption<T>) => void
  onReset: () => void
}

function DropdownSelect<T extends {}>({
  selectedItemLabel,
  options,
  value,
  editable = true,
  categoryName,
  width,
  height,
  onChange,
  onReset,
}: DropdownSelectProps<T>) {
  const ref = useRef<any>(null)
  const [items, setItems] = useState<DropdownOption<T>[] | null>(options)
  const [selectedId, setSelectedId] = useState<number | string | null>(value)
  const [selectMenuIsOpen, setSelectMenuIsOpen] = useState<boolean>(false)
  const [searchFilter, setSearchFilter] = useState<string>('')

  function handleFilter(value: string) {
    setSearchFilter(value)
    if (!options) return
    if (value.trim().length > 0) {
      let filteredItems = options.filter((item) => item.label.toUpperCase().includes(value.toUpperCase()))
      setItems(filteredItems)
      return
    } else {
      setItems(options)
      return
    }
  }

  function handleSelect(selectedId: string | number, item: DropdownOption<T>) {
    onChange(item)
    setSelectedId(selectedId)
    setSelectMenuIsOpen(false)
  }

  function resetState() {
    onReset()
    setSelectedId(null)
    setSelectMenuIsOpen(false)
  }
  function onClickOutside() {
    setSelectMenuIsOpen(false)
  }
  useEffect(() => {
    setSelectedId(value)
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

  return (
    <div ref={ref} className={`relative flex  items-center ${width ? `w-full lg:w-[${width}]` : 'w-full lg:w-[400px]'}`}>
      <div className="flex min-h-[46.6px] w-full grow items-center justify-between rounded-md border border-gray-200 bg-[#fff] p-2 shadow-sm">
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
            {selectedId != undefined && options ? options.filter((item) => item.id == selectedId)[0]?.label : categoryName}
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
        <div className="absolute top-[55px] z-[100] flex h-[250px] w-full flex-col self-center rounded-md border border-gray-200 bg-[#fff] p-2 shadow-sm">
          <h1 className="w-full border-b border-[#15599a] pb-1 text-center font-medium italic">{categoryName}</h1>
          <div className="overscroll-y my-2 flex w-full grow flex-col gap-1 overflow-y-auto scrollbar-thin scrollbar-track-gray-100 scrollbar-thumb-gray-300">
            <div
              onClick={() => resetState()}
              className={`flex w-full cursor-pointer items-center rounded p-1 px-2 hover:bg-gray-100 ${
                !(selectedId != undefined) ? 'bg-gray-100' : ''
              }`}
            >
              <p className="grow font-medium text-[#353432]">{selectedItemLabel}</p>
              {!(selectedId != undefined) ? <HiCheck style={{ color: '#fead61', fontSize: '20px' }} /> : null}
            </div>
            {items ? (
              items.map((item, index) => (
                <div
                  onClick={() => handleSelect(item.id, item)}
                  key={item.id ? item.id : index}
                  className={`flex w-full cursor-pointer items-center rounded p-1 px-2 hover:bg-gray-100 ${
                    selectedId == item.id ? 'bg-gray-100' : ''
                  }`}
                >
                  <p className="grow font-medium text-[#353432]">{item.label}</p>
                  {selectedId == item.id ? <HiCheck style={{ color: '#fead61', fontSize: '20px' }} /> : null}
                </div>
              ))
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

export default DropdownSelect

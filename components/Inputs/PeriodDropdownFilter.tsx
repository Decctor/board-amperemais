import { formatDateForInput } from '@/utils/methods'
import React, { Dispatch, SetStateAction, useRef, useState } from 'react'
import { AiOutlineSearch } from 'react-icons/ai'
import { IoIosCalendar } from 'react-icons/io'
type DateFilterType = {
  after: string | undefined
  before: string | undefined
}
type PeriodDropdownFilterProps = {
  initialAfter: string | undefined
  initialBefore: string | undefined
  setDateParam: Dispatch<
    SetStateAction<{
      after: string | undefined
      before: string | undefined
    }>
  >
}
function PeriodDropdownFilter({ initialAfter, initialBefore, setDateParam }: PeriodDropdownFilterProps) {
  const ref = useRef<any>(null)
  const [dropdownIsOpen, setDropdownIsOpen] = useState<boolean>(false)
  const [dateFilter, setDateFilter] = useState<DateFilterType>({
    after: initialAfter,
    before: initialBefore,
  })
  const [msg, setMsg] = useState({
    text: '',
    color: '',
  })
  function handleFilter() {
    if (!dateFilter.after) {
      setMsg({
        text: 'Por favor, preencha a data de início.',
        color: 'text-red-500',
      })
      return
    }
    if (!dateFilter.before) {
      setMsg({
        text: 'Por favor, preencha a data de fim.',
        color: 'text-red-500',
      })
      return
    }
    if (new Date(dateFilter.after) > new Date(dateFilter.before)) {
      setMsg({
        text: 'Por favor, preencha um período válido.',
        color: 'text-red-500',
      })
      return
    }
    setMsg({
      text: '',
      color: '',
    })
    setDateParam({ after: dateFilter.after, before: dateFilter.before })
  }
  return (
    <div ref={ref} className="relative flex h-[46.6px] w-[46.6px] justify-end">
      <div
        onClick={() => setDropdownIsOpen((prev) => !prev)}
        className="flex w-[46.6px] cursor-pointer items-center justify-center rounded bg-[#fead61] p-2 shadow-sm duration-300 ease-in-out hover:scale-105 hover:bg-[#eb8423] hover:text-white"
      >
        <IoIosCalendar />
      </div>
      {dropdownIsOpen ? (
        <div className="absolute -right-[400%] top-[45px] z-[100] flex h-[115px] w-[350px] flex-col self-center rounded-md border border-gray-200 bg-[#fff] p-2 shadow-sm">
          <h1 className="text-center text-sm font-medium text-gray-700">SELECIONE UM PERÍODO DE FILTRO</h1>
          <div className="mt-2 flex w-full items-center justify-between">
            <div className="flex flex-col items-start">
              <h3 className="text-xs text-gray-500">DEPOIS DE:</h3>
              <input
                type="date"
                value={dateFilter.after ? formatDateForInput(dateFilter.after) : undefined}
                className="text-xs text-gray-700 outline-none"
                onChange={(e) =>
                  setDateFilter((prev) => ({
                    ...prev,
                    after: e.target.value != '' ? new Date(e.target.value).toISOString() : undefined,
                  }))
                }
              />
            </div>
            <div className="flex flex-col items-end">
              <h3 className="text-xs text-gray-500">ANTES DE:</h3>
              <input
                type="date"
                value={dateFilter.before ? formatDateForInput(dateFilter.before) : undefined}
                className="text-xs text-gray-700 outline-none"
                onChange={(e) =>
                  setDateFilter((prev) => ({
                    ...prev,
                    before: e.target.value != '' ? new Date(e.target.value).toISOString() : undefined,
                  }))
                }
              />
            </div>
          </div>
          <div className="mt-2 flex w-full justify-between">
            {msg.text ? <p className={`text-xs ${msg.color} italic`}>{msg.text}</p> : <div></div>}
            <button
              onClick={handleFilter}
              className="rounded bg-[#fead61] p-1 text-[#15599a] duration-300 ease-in-out hover:scale-105 hover:bg-[#15599a] hover:text-white"
            >
              <AiOutlineSearch />
            </button>
          </div>
        </div>
      ) : null}
    </div>
  )
}

export default PeriodDropdownFilter

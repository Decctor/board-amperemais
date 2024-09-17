import dayjs from 'dayjs'

import ReactDOM from 'react-dom/server'

import { BsCart } from 'react-icons/bs'
import { IconType } from 'react-icons'
import { AiFillFile } from 'react-icons/ai'

export function renderIcon(icon: React.ComponentType | IconType, size: number | undefined = 12) {
  const IconComponent = icon
  return <IconComponent size={size} />
}

export function renderDateDiffText(dueDate?: string) {
  if (!dueDate)
    return <p className={'min-w-[170px] break-keep rounded-md text-start text-[0.65rem] font-medium leading-none text-green-500'}>SEM DATA DE VENCIMENTO</p>
  const diffHours = dayjs(dueDate).diff(undefined, 'hour')
  const diffDays = dayjs(dueDate).diff(undefined, 'days')
  var number
  var param

  if (diffHours > 24) {
    number = Math.abs(diffDays)
    param = number > 1 ? 'DIAS' : 'DIA'
  } else {
    number = Math.abs(diffHours)
    param = number > 1 ? 'HORAS' : 'HORA'
  }
  const preText = diffHours < 0 ? 'VENCIDA HÁ ' : 'VENCE EM '
  const text = preText + number + ' ' + param

  if (diffHours > 24 && diffDays > 1)
    return <p className={'min-w-[170px] break-keep rounded-md text-start text-[0.65rem] font-medium leading-none text-green-500'}>{text}</p>
  if (diffHours > 24 && diffDays < 1)
    return <p className={'min-w-[170px] break-keep rounded-md text-start text-[0.65rem] font-medium leading-none text-orange-500'}>{text}</p>
  return <p className={'min-w-[170px] break-keep rounded-md text-start text-[0.65rem] font-medium leading-none text-red-500'}>{text}</p>
}

export function renderPaginationPageItemsIcons({
  totalPages,
  activePage,
  selectPage,
  disabled,
}: {
  totalPages: number
  activePage: number
  selectPage: (page: number) => void
  disabled: boolean
}) {
  const MAX_RENDER = 5
  var pages: (number | string)[] = []
  if (totalPages <= MAX_RENDER) {
    pages = Array.from({ length: totalPages }, (v, i) => i + 1)
  } else {
    // If active page is around the middle of the total pages
    if (totalPages - activePage > 3 && activePage - 1 > 3) {
      console.log('AQUI 1')
      pages = [1, '...', activePage - 1, activePage, activePage + 1, '...', totalPages]
    } else {
      // if active page is 3 elements from the total page
      if (activePage > 3 && totalPages - activePage < MAX_RENDER - 1)
        pages = [1, '...', ...Array.from({ length: MAX_RENDER }, (v, i) => i + totalPages - MAX_RENDER), totalPages]
      // else, if active page is 3 elements from 1
      else pages = [...Array.from({ length: MAX_RENDER }, (v, i) => i + 1), '...', totalPages]
    }
  }
  return pages.map((p) => (
    <button
      key={p}
      disabled={typeof p != 'number' || disabled}
      onClick={() => {
        if (typeof p != 'number') return
        return selectPage(p)
      }}
      className={`${
        activePage == p ? 'border-black bg-black text-white' : 'border-transparent text-black hover:bg-gray-500'
      } max-w-10 min-w-10 min-h-10 h-10 max-h-10 w-10 rounded-full border text-xs font-medium`}
    >
      {p}
    </button>
  ))
}

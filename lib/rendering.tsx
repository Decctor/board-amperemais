import dayjs from 'dayjs'

import ReactDOM from 'react-dom/server'

import { BsCart } from 'react-icons/bs'
import { IconType } from 'react-icons'
import { AiFillFile } from 'react-icons/ai'
import { cn } from './utils'
import { cva } from 'class-variance-authority'

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
  pageIconSize = 'default',
}: {
  totalPages: number
  activePage: number
  selectPage: (page: number) => void
  disabled: boolean
  pageIconSize?: 'default' | 'sm' | 'xs'
}) {
  const MAX_RENDER = 5

  const pageButtonVariants = cva('rounded-full border font-medium', {
    variants: {
      size: {
        default: 'min-h-8 min-w-8 max-w-10 lg:min-h-10 lg:min-w-10 h-8 max-h-10 w-8 lg:h-10 lg:w-10 text-xs',
        sm: 'min-h-7 min-w-7 max-w-9 lg:min-h-9 lg:min-w-9 h-7 max-h-9 w-7 lg:h-9 lg:w-9 text-[0.7rem]',
        xs: 'min-h-6 min-w-6 max-w-8 lg:min-h-8 lg:min-w-8 h-6 max-h-8 w-6 lg:h-8 lg:w-8 text-[0.65rem]',
      },
    },
    defaultVariants: {
      size: 'default',
    },
  })
  var pages: (number | string)[] = []
  if (totalPages <= MAX_RENDER) {
    pages = Array.from({ length: totalPages }, (v, i) => i + 1)
  } else {
    // If active page is around the middle of the total pages
    if (totalPages - activePage > 3 && activePage - 1 > 3) {
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
      className={cn(
        pageButtonVariants({ size: pageIconSize, className: '' }),
        activePage == p ? 'border-primary bg-primary text-secondary' : 'border-transparent text-primary hover:bg-primary/10'
      )}
    >
      {p}
    </button>
  ))
}

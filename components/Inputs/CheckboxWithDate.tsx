import { cn } from '@/lib/utils'
import React from 'react'
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover'
import { Button } from '../ui/button'
import { BsCalendarCheck, BsCheck } from 'react-icons/bs'
import { Calendar } from '../ui/calendar'
import { ptBR } from 'date-fns/locale'
import { formatDateAsLocale } from '@/lib/methods/formatting'
type CheckboxWithDateProps = {
  date: Date | string | null
  labelTrue: string
  labelFalse: string
  showDate?: boolean
  handleChange: (value: string | null | undefined) => void
  editable?: boolean
}
function CheckboxWithDate({ date, labelTrue, labelFalse, showDate = true, handleChange, editable = true }: CheckboxWithDateProps) {
  return (
    <Popover>
      <PopoverTrigger disabled={!editable} asChild className="flex flex-col border-0 hover:bg-transparent">
        <Button variant={'outline'} className={cn('flex flex-col gap-1', !date && 'text-muted-foreground')}>
          <div className="flex items-center gap-2">
            <div className={`flex h-[16px] w-[16px] items-center justify-center rounded-full border border-black`}>
              {date ? <BsCheck style={{ color: 'black' }} /> : null}
            </div>
            <p className={'text-xs font-medium leading-none'}>{!!date ? labelTrue : labelFalse}</p>
          </div>

          {date && showDate ? (
            <div className="flex min-h-[10px] items-center gap-1">
              <BsCalendarCheck size={10} />
              <p className={'text-[0.6rem] font-medium leading-none'}>{formatDateAsLocale(date)}</p>
            </div>
          ) : null}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="z-[120] w-auto p-0" align="center">
        <Calendar
          mode="single"
          selected={date ? new Date(date) : undefined}
          defaultMonth={date ? new Date(date) : undefined}
          onSelect={(value) => handleChange(value?.toISOString() || null)}
          initialFocus={true}
          locale={ptBR}
        />
      </PopoverContent>
    </Popover>
  )
}

export default CheckboxWithDate

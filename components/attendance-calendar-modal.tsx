'use client'

import { useEffect, useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { X, ChevronLeft, ChevronRight } from 'lucide-react'

type AttendanceStatus = 'PRESENT' | 'ABSENT'

type AttendanceItem = {
  date: string
  status: AttendanceStatus
}

interface AttendanceCalendarModalProps {
  clientDni: string
  clientName: string
  isOpen: boolean
  onClose: () => void
}

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1)
}

function addMonths(date: Date, delta: number) {
  return new Date(date.getFullYear(), date.getMonth() + delta, 1)
}

function daysInMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate()
}

function toIsoDate(date: Date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function weekdayIndexMondayFirst(date: Date) {
  // JS: 0=Sunday..6=Saturday => want 0=Monday..6=Sunday
  return (date.getDay() + 6) % 7
}

const monthLabels = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']
const weekdayLabels = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']

export function AttendanceCalendarModal({ clientDni, clientName, isOpen, onClose }: AttendanceCalendarModalProps) {
  const [cursorMonth, setCursorMonth] = useState(() => startOfMonth(new Date()))
  const [items, setItems] = useState<AttendanceItem[]>([])
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (!isOpen) return

    const controller = new AbortController()

    const fetchMonth = async () => {
      setIsLoading(true)
      try {
        const year = cursorMonth.getFullYear()
        const month = cursorMonth.getMonth() + 1
        const res = await fetch(`/api/attendance/${encodeURIComponent(clientDni)}?year=${year}&month=${month}`, {
          signal: controller.signal,
        })
        if (!res.ok) throw new Error('Error')
        const data = await res.json()
        setItems(Array.isArray(data) ? data : [])
      } catch (e) {
        if ((e as { name?: string }).name !== 'AbortError') {
          setItems([])
        }
      } finally {
        setIsLoading(false)
      }
    }

    fetchMonth()

    return () => controller.abort()
  }, [clientDni, cursorMonth, isOpen])

  const attendanceByDate = useMemo(() => {
    const map = new Map<string, AttendanceStatus>()
    for (const item of items) {
      map.set(item.date, item.status)
    }
    return map
  }, [items])

  const year = cursorMonth.getFullYear()
  const monthIndex = cursorMonth.getMonth()

  const days = useMemo(() => {
    const first = startOfMonth(cursorMonth)
    const leadingBlanks = weekdayIndexMondayFirst(first)
    const totalDays = daysInMonth(cursorMonth)

    const cells: Array<{ key: string; date?: Date }> = []
    for (let i = 0; i < leadingBlanks; i += 1) {
      cells.push({ key: `blank-${i}` })
    }
    for (let d = 1; d <= totalDays; d += 1) {
      const date = new Date(year, monthIndex, d)
      cells.push({ key: toIsoDate(date), date })
    }

    // pad to full weeks
    while (cells.length % 7 !== 0) {
      cells.push({ key: `pad-${cells.length}` })
    }

    return cells
  }, [cursorMonth, monthIndex, year])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl border-border bg-card">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-foreground">Asistencia</CardTitle>
            <CardDescription className="text-muted-foreground">
              {clientName} · DNI {clientDni}
            </CardDescription>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Button
              variant="outline"
              size="icon"
              onClick={() => setCursorMonth((d) => addMonths(d, -1))}
              disabled={isLoading}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>

            <div className="text-sm font-medium text-foreground">
              {monthLabels[monthIndex]} {year}
            </div>

            <Button
              variant="outline"
              size="icon"
              onClick={() => setCursorMonth((d) => addMonths(d, 1))}
              disabled={isLoading}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          <div className="grid grid-cols-7 gap-2">
            {weekdayLabels.map((label) => (
              <div key={label} className="text-xs text-muted-foreground text-center font-medium">
                {label}
              </div>
            ))}

            {days.map((cell) => {
              if (!cell.date) {
                return <div key={cell.key} className="h-10" />
              }

              const iso = toIsoDate(cell.date)
              const status = attendanceByDate.get(iso)

              const base = 'h-10 rounded-lg flex items-center justify-center text-sm border'
              const cls =
                status === 'PRESENT'
                  ? `${base} bg-[#26DE81]/15 border-[#26DE81]/30 text-[#26DE81]`
                  : status === 'ABSENT'
                    ? `${base} bg-[#FF6B6B]/15 border-[#FF6B6B]/30 text-[#FF6B6B]`
                    : `${base} bg-secondary/30 border-border text-muted-foreground`

              const title =
                status === 'PRESENT'
                  ? `${iso}: Vino a entrenar`
                  : status === 'ABSENT'
                    ? `${iso}: No vino`
                    : `${iso}: Sin registro`

              return (
                <div key={cell.key} className={cls} title={title}>
                  {cell.date.getDate()}
                </div>
              )
            })}
          </div>

          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <div className="flex items-center gap-2">
              <span className="h-3 w-3 rounded-sm bg-[#26DE81]/25 border border-[#26DE81]/30" />
              Vino
            </div>
            <div className="flex items-center gap-2">
              <span className="h-3 w-3 rounded-sm bg-[#FF6B6B]/25 border border-[#FF6B6B]/30" />
              No vino (registrado)
            </div>
            <div className="flex items-center gap-2">
              <span className="h-3 w-3 rounded-sm bg-secondary/40 border border-border" />
              Sin registro
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

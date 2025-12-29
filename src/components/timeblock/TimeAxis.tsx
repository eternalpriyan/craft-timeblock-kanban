'use client'

interface TimeAxisProps {
  startHour: number
  endHour: number
  hourHeight: number
}

function formatHour(hour: number): string {
  if (hour === 0) return '12 AM'
  if (hour === 12) return '12 PM'
  if (hour < 12) return `${hour} AM`
  return `${hour - 12} PM`
}

export default function TimeAxis({ startHour, endHour, hourHeight }: TimeAxisProps) {
  const hours = []
  for (let hour = startHour; hour <= endHour; hour++) {
    hours.push(hour)
  }

  return (
    <div className="absolute left-0 top-0 bottom-0 w-12">
      {hours.map((hour) => (
        <div
          key={hour}
          className="absolute right-3 text-[11px] font-medium text-slate-400 dark:text-slate-500 -translate-y-1/2"
          style={{ top: (hour - startHour) * hourHeight }}
        >
          {formatHour(hour)}
        </div>
      ))}
    </div>
  )
}

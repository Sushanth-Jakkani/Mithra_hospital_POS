import { formatDateTime } from '@/lib/utils'
import { cn } from '@/lib/utils'

interface TimelineItem {
  id: string
  time: string
  title: string
  description?: string
  type?: 'default' | 'success' | 'warning' | 'error' | 'info'
}

interface TimelineProps {
  items: TimelineItem[]
  className?: string
}

const dotColors = {
  default: 'bg-gray-400',
  success: 'bg-green-500',
  warning: 'bg-yellow-500',
  error: 'bg-red-500',
  info: 'bg-blue-500',
}

export default function Timeline({ items, className }: TimelineProps) {
  if (items.length === 0) {
    return <p className="text-sm text-gray-400 py-4 text-center">No activity yet.</p>
  }

  return (
    <div className={cn('space-y-0', className)}>
      {items.map((item, index) => (
        <div key={item.id} className="flex gap-3 pb-4 last:pb-0">
          <div className="flex flex-col items-center">
            <div className={cn('w-2.5 h-2.5 rounded-full mt-1.5 flex-shrink-0', dotColors[item.type || 'default'])} />
            {index < items.length - 1 && <div className="w-px flex-1 bg-gray-200 mt-1" />}
          </div>
          <div className="flex-1 min-w-0 pb-1">
            <p className="text-sm text-gray-900">{item.title}</p>
            {item.description && <p className="text-xs text-gray-500 mt-0.5">{item.description}</p>}
            <p className="text-[10px] text-gray-400 mt-0.5">{formatDateTime(item.time)}</p>
          </div>
        </div>
      ))}
    </div>
  )
}

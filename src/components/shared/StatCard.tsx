import { cn } from '@/lib/utils'
import { LucideIcon } from 'lucide-react'

interface StatCardProps {
  title: string
  value: string | number
  change?: string
  changeType?: 'positive' | 'negative' | 'neutral'
  icon: LucideIcon
  iconColor?: string
  iconBg?: string
  className?: string
}

export default function StatCard({
  title,
  value,
  change,
  changeType = 'neutral',
  icon: Icon,
  iconColor = 'text-teal-600',
  iconBg = 'bg-teal-50',
  className,
}: StatCardProps) {
  return (
    <div className={cn('bg-white rounded-xl border border-gray-100 p-5', className)}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">{title}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
          {change && (
            <p
              className={cn(
                'text-xs mt-1',
                changeType === 'positive' && 'text-green-600',
                changeType === 'negative' && 'text-red-600',
                changeType === 'neutral' && 'text-gray-500'
              )}
            >
              {change}
            </p>
          )}
        </div>
        <div className={cn('p-2.5 rounded-lg', iconBg)}>
          <Icon className={cn('w-5 h-5', iconColor)} />
        </div>
      </div>
    </div>
  )
}

import { cn } from '@/lib/utils'

const statusStyles: Record<string, { bg: string; text: string }> = {
  // Appointment statuses
  scheduled: { bg: 'bg-blue-50', text: 'text-blue-700' },
  confirmed: { bg: 'bg-green-50', text: 'text-green-700' },
  checked_in: { bg: 'bg-indigo-50', text: 'text-indigo-700' },
  in_consultation: { bg: 'bg-purple-50', text: 'text-purple-700' },
  completed: { bg: 'bg-emerald-50', text: 'text-emerald-700' },
  cancelled: { bg: 'bg-red-50', text: 'text-red-700' },
  no_show: { bg: 'bg-gray-100', text: 'text-gray-600' },
  // Payment statuses
  paid: { bg: 'bg-green-50', text: 'text-green-700' },
  partially_paid: { bg: 'bg-yellow-50', text: 'text-yellow-700' },
  pending: { bg: 'bg-orange-50', text: 'text-orange-700' },
  refunded: { bg: 'bg-red-50', text: 'text-red-700' },
  // Prescription statuses
  draft: { bg: 'bg-gray-100', text: 'text-gray-600' },
  issued: { bg: 'bg-blue-50', text: 'text-blue-700' },
  partially_dispensed: { bg: 'bg-yellow-50', text: 'text-yellow-700' },
  dispensed: { bg: 'bg-green-50', text: 'text-green-700' },
  // PO statuses
  ordered: { bg: 'bg-blue-50', text: 'text-blue-700' },
  received: { bg: 'bg-green-50', text: 'text-green-700' },
  // Inventory
  in_stock: { bg: 'bg-green-50', text: 'text-green-700' },
  low_stock: { bg: 'bg-yellow-50', text: 'text-yellow-700' },
  out_of_stock: { bg: 'bg-red-50', text: 'text-red-700' },
  expired: { bg: 'bg-red-50', text: 'text-red-700' },
  expiring_soon: { bg: 'bg-orange-50', text: 'text-orange-700' },
  // Severity
  info: { bg: 'bg-blue-50', text: 'text-blue-700' },
  warning: { bg: 'bg-yellow-50', text: 'text-yellow-700' },
  critical: { bg: 'bg-red-50', text: 'text-red-700' },
  // Generic
  active: { bg: 'bg-green-50', text: 'text-green-700' },
  inactive: { bg: 'bg-gray-100', text: 'text-gray-600' },
}

interface StatusBadgeProps {
  status: string
  className?: string
}

export default function StatusBadge({ status, className }: StatusBadgeProps) {
  const style = statusStyles[status.toLowerCase()] || statusStyles.pending
  const displayLabel = status.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())

  return (
    <span
      className={cn(
        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
        style.bg,
        style.text,
        className
      )}
    >
      {displayLabel}
    </span>
  )
}

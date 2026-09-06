export default function LoadingState({ message = 'Loading...' }: { message?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16">
      <div className="w-8 h-8 border-2 border-teal-600 border-t-transparent rounded-full animate-spin mb-3" />
      <p className="text-sm text-gray-500">{message}</p>
    </div>
  )
}

export function TableSkeleton({ rows = 5, cols = 5 }: { rows?: number; cols?: number }) {
  return (
    <div className="animate-pulse">
      <div className="bg-gray-50 border-b border-gray-200 px-4 py-3 flex gap-4">
        {Array.from({ length: cols }).map((_, i) => (
          <div key={i} className="h-3 bg-gray-200 rounded flex-1" />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, row) => (
        <div key={row} className="px-4 py-3 border-b border-gray-100 flex gap-4">
          {Array.from({ length: cols }).map((_, col) => (
            <div key={col} className="h-3 bg-gray-100 rounded flex-1" />
          ))}
        </div>
      ))}
    </div>
  )
}

export function CardSkeleton() {
  return (
    <div className="bg-white rounded-xl border border-gray-100 p-5 animate-pulse">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="h-3 bg-gray-100 rounded w-24 mb-2" />
          <div className="h-7 bg-gray-100 rounded w-16" />
        </div>
        <div className="w-10 h-10 bg-gray-100 rounded-lg" />
      </div>
    </div>
  )
}

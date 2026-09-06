import TopHeader from '@/components/layout/TopHeader'
import { cn } from '@/lib/utils'

interface PageHeaderProps {
  title: string
  subtitle?: string
  actions?: React.ReactNode
  children?: React.ReactNode
  className?: string
}

export default function PageHeader({ title, subtitle, actions, children, className }: PageHeaderProps) {
  return (
    <>
      <TopHeader title={title} subtitle={subtitle} actions={actions} />
      {children && (
        <div className={cn('px-6 py-3 border-b border-gray-100 bg-white', className)}>
          {children}
        </div>
      )}
    </>
  )
}

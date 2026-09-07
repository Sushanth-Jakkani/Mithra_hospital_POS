import React, { useState } from 'react'
import PageHeader from '@/components/shared/PageHeader'
import CategoryManager from './CategoryManager'
import LogoUploader from './LogoUploader'
import {
  Layers,
  Image as ImageIcon,
  ShieldCheck,
} from 'lucide-react'
import { cn } from '@/lib/utils'

type AdminTab = 'categories' | 'logo'

const tabs: { key: AdminTab; label: string; icon: React.ElementType; description: string }[] = [
  { key: 'categories', label: 'Categories', icon: Layers, description: 'Manage medicine categories' },
  { key: 'logo', label: 'Logo & Branding', icon: ImageIcon, description: 'Upload hospital logo' },
]

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState<AdminTab>('categories')

  return (
    <div className="pb-24 lg:pb-12">
      <PageHeader
        title="Admin Panel"
        subtitle="Manage categories, logo, and system settings"
        actions={
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-teal-700 bg-teal-50 border border-teal-200 rounded-lg">
            <ShieldCheck className="w-3.5 h-3.5" />
            Admin Access
          </div>
        }
      />

      <div className="px-4 sm:px-6 py-4 space-y-4">
        {/* Tab Navigation */}
        <div className="flex items-center gap-1 p-1 bg-gray-100/80 rounded-xl w-fit">
          {tabs.map((tab) => {
            const Icon = tab.icon
            const isActive = activeTab === tab.key
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={cn(
                  'flex items-center gap-2 px-4 py-2.5 text-xs font-medium rounded-lg transition-all duration-200',
                  isActive
                    ? 'bg-white text-teal-700 shadow-sm font-bold'
                    : 'text-gray-500 hover:text-gray-700'
                )}
              >
                <Icon className="w-4 h-4" />
                <span className="hidden sm:inline">{tab.label}</span>
                <span className="sm:hidden">{tab.label.split(' ')[0]}</span>
              </button>
            )
          })}
        </div>

        {/* Tab Content */}
        <div className="bg-white rounded-2xl border border-gray-100 p-4 sm:p-6 shadow-sm">
          {activeTab === 'categories' && <CategoryManager />}
          {activeTab === 'logo' && <LogoUploader />}
        </div>
      </div>
    </div>
  )
}

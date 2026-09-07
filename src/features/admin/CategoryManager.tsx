import React, { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import {
  Plus,
  Trash2,
  Search,
  Package,
  X,
  AlertTriangle,
  Edit2,
  Layers,
  CheckCircle2,
} from 'lucide-react'

interface Category {
  id: string
  name: string
  description?: string
  created_at: string
  medicine_count?: number
}

export default function CategoryManager() {
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null)

  // Add/Edit modal state
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingCategory, setEditingCategory] = useState<Category | null>(null)
  const [formName, setFormName] = useState('')
  const [formDescription, setFormDescription] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  // Delete confirmation state
  const [deletingCategory, setDeletingCategory] = useState<Category | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  useEffect(() => {
    fetchCategories()
  }, [])

  const fetchCategories = async () => {
    try {
      setLoading(true)

      // Fetch categories
      const { data: cats, error: catError } = await supabase
        .from('medicine_categories')
        .select('*')
        .order('name')

      if (catError) throw catError

      // Count medicines per category
      const { data: medicines } = await supabase
        .from('medicines')
        .select('id, category_id')
        .is('deleted_at', null)

      const countMap: Record<string, number> = {}
      ;(medicines || []).forEach((m: any) => {
        if (m.category_id) {
          countMap[m.category_id] = (countMap[m.category_id] || 0) + 1
        }
      })

      const enriched = (cats || []).map(c => ({
        ...c,
        medicine_count: countMap[c.id] || 0,
      }))

      setCategories(enriched)
    } catch (err) {
      console.error('Error fetching categories:', err)
    } finally {
      setLoading(false)
    }
  }

  // --- Add / Edit ---
  const openAddModal = () => {
    setEditingCategory(null)
    setFormName('')
    setFormDescription('')
    setIsModalOpen(true)
  }

  const openEditModal = (cat: Category) => {
    setEditingCategory(cat)
    setFormName(cat.name)
    setFormDescription(cat.description || '')
    setIsModalOpen(true)
  }

  const handleSave = async () => {
    if (!formName.trim()) return
    try {
      setIsSaving(true)
      if (editingCategory) {
        const { error } = await supabase
          .from('medicine_categories')
          .update({ name: formName.trim(), description: formDescription.trim() || null })
          .eq('id', editingCategory.id)
        if (error) throw error
      } else {
        const { error } = await supabase
          .from('medicine_categories')
          .insert({ name: formName.trim(), description: formDescription.trim() || null })
        if (error) throw error
      }
      setIsModalOpen(false)
      fetchCategories()
    } catch (err: any) {
      alert('Error saving category: ' + err.message)
    } finally {
      setIsSaving(false)
    }
  }

  // --- Delete ---
  const handleDelete = async () => {
    if (!deletingCategory) return
    try {
      setIsDeleting(true)

      // Check if medicines are assigned
      const { count } = await supabase
        .from('medicines')
        .select('*', { count: 'exact', head: true })
        .eq('category_id', deletingCategory.id)
        .is('deleted_at', null)

      if (count && count > 0) {
        alert(`Cannot delete "${deletingCategory.name}" — ${count} medicine(s) are still assigned to this category. Please reassign them first.`)
        setDeletingCategory(null)
        return
      }

      const { error } = await supabase
        .from('medicine_categories')
        .delete()
        .eq('id', deletingCategory.id)

      if (error) throw error
      setDeletingCategory(null)
      if (selectedCategoryId === deletingCategory.id) {
        setSelectedCategoryId(null)
      }
      fetchCategories()
    } catch (err: any) {
      alert('Error deleting category: ' + err.message)
    } finally {
      setIsDeleting(false)
    }
  }

  const filteredCategories = categories.filter(c =>
    !searchQuery || c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.description?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const selectedCategory = categories.find(c => c.id === selectedCategoryId)

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-6 h-6 border-2 border-teal-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header actions */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-bold text-gray-900">Medicine Categories</h3>
          <p className="text-xs text-gray-500 mt-0.5">{categories.length} categories total</p>
        </div>
        <button
          onClick={openAddModal}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white bg-teal-600 hover:bg-teal-700 rounded-xl transition-all shadow-sm active:scale-95"
        >
          <Plus className="w-3.5 h-3.5" />
          Add Category
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search categories..."
          className="w-full pl-9 pr-3 py-2 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-400 focus:bg-white transition-all"
        />
      </div>

      {/* Categories Grid — cards on mobile, table-like on desktop */}
      {filteredCategories.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-14 h-14 bg-gray-100 rounded-2xl flex items-center justify-center mb-3">
            <Layers className="w-7 h-7 text-gray-300" />
          </div>
          <p className="text-sm font-medium text-gray-500">No categories found</p>
          <p className="text-xs text-gray-400 mt-1">Add your first medicine category to get started.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
          {filteredCategories.map((cat) => {
            const isSelected = selectedCategoryId === cat.id

            return (
              <div
                key={cat.id}
                onClick={() => setSelectedCategoryId(isSelected ? null : cat.id)}
                className={`relative p-4 rounded-xl border cursor-pointer transition-all duration-200 group ${
                  isSelected
                    ? 'bg-teal-50/80 border-teal-300 shadow-md shadow-teal-100/50 ring-1 ring-teal-200'
                    : 'bg-white border-gray-100 hover:border-teal-200 hover:shadow-sm'
                }`}
              >
                {/* Selection indicator */}
                {isSelected && (
                  <div className="absolute top-3 right-3">
                    <CheckCircle2 className="w-4.5 h-4.5 text-teal-600" />
                  </div>
                )}

                <div className="flex items-start gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors ${
                    isSelected ? 'bg-teal-600 text-white' : 'bg-gray-100 text-gray-500 group-hover:bg-teal-50 group-hover:text-teal-600'
                  }`}>
                    <Package className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-bold text-gray-900 truncate">{cat.name}</h4>
                    {cat.description && (
                      <p className="text-[11px] text-gray-500 mt-0.5 line-clamp-2">{cat.description}</p>
                    )}
                    <div className="flex items-center gap-2 mt-2">
                      <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                        (cat.medicine_count || 0) > 0
                          ? 'bg-blue-50 text-blue-700'
                          : 'bg-gray-50 text-gray-500'
                      }`}>
                        <Package className="w-3 h-3" />
                        {cat.medicine_count || 0} medicines
                      </span>
                    </div>
                  </div>
                </div>

                {/* Action buttons */}
                <div className="flex items-center justify-end gap-1.5 mt-3 pt-3 border-t border-gray-100">
                  <button
                    onClick={(e) => { e.stopPropagation(); openEditModal(cat) }}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-medium text-gray-600 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <Edit2 className="w-3 h-3" />
                    Edit
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); setDeletingCategory(cat) }}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-3 h-3" />
                    Delete
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Selected Category Detail Banner */}
      {selectedCategory && (
        <div className="p-4 bg-gradient-to-r from-teal-50 to-cyan-50 border border-teal-200 rounded-xl">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-teal-900">Selected: {selectedCategory.name}</p>
              <p className="text-[11px] text-teal-700 mt-0.5">
                {selectedCategory.medicine_count || 0} medicines assigned • Created {new Date(selectedCategory.created_at).toLocaleDateString()}
              </p>
            </div>
            <button
              onClick={() => setSelectedCategoryId(null)}
              className="p-1.5 rounded-lg text-teal-600 hover:bg-teal-100 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Add/Edit Category Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 w-full max-w-md p-5 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100 mb-4">
              <h3 className="text-sm font-bold text-gray-900">
                {editingCategory ? 'Edit Category' : 'Add New Category'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded text-gray-400 hover:text-gray-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-[11px] font-semibold text-gray-700 mb-1">Category Name *</label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="e.g. Antibiotics, Pain Relief..."
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-400 transition-all"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-gray-700 mb-1">Description (Optional)</label>
                <textarea
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="Brief description of this category..."
                  rows={3}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-400 transition-all resize-none"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 mt-5 pt-3 border-t border-gray-100">
              <button
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 text-xs font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={isSaving || !formName.trim()}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-teal-600 hover:bg-teal-700 rounded-xl transition-all shadow-sm disabled:opacity-50 active:scale-95"
              >
                {isSaving ? (
                  <>
                    <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    {editingCategory ? 'Update Category' : 'Create Category'}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      {deletingCategory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 w-full max-w-sm p-5 animate-in fade-in zoom-in-95">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-gray-900">Delete Category</h3>
                <p className="text-xs text-gray-500 mt-0.5">This action cannot be undone.</p>
              </div>
            </div>

            <div className="p-3 bg-red-50 border border-red-200 rounded-xl mb-4">
              <p className="text-xs text-red-800">
                Are you sure you want to delete <strong>"{deletingCategory.name}"</strong>?
                {(deletingCategory.medicine_count || 0) > 0 && (
                  <span className="block mt-1 font-semibold">
                    ⚠️ This category has {deletingCategory.medicine_count} medicine(s) assigned. Deletion will be blocked until they are reassigned.
                  </span>
                )}
              </p>
            </div>

            <div className="flex items-center justify-end gap-2">
              <button
                onClick={() => setDeletingCategory(null)}
                className="px-4 py-2 text-xs font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-red-600 hover:bg-red-700 rounded-xl transition-all shadow-sm disabled:opacity-50 active:scale-95"
              >
                {isDeleting ? (
                  <>
                    <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    Delete Category
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

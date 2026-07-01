'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAppStore } from '@/lib/store'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Search, Plus, BookOpen, Loader2 } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

interface Subject {
  id: string
  name: string
  code?: string
  gradeLevel?: string
  category?: string
  color?: string
  isActive: boolean
  _count: { batches: number }
}

const gradeLevelOptions = ['O/L', 'A/L', 'Grade 1-5', 'Grade 6-9', 'University', 'Professional']
const categoryOptions = ['Science', 'Mathematics', 'Languages', 'Technology', 'Arts', 'Commerce', 'Other']

const defaultColors = [
  '#10b981', '#14b8a6', '#f59e0b', '#ef4444', '#0ea5e9',
  '#f97316', '#ec4899', '#8b5cf6', '#06b6d4', '#84cc16',
]

function getColorBg(color: string) {
  return { backgroundColor: color, opacity: 0.15, color }
}

export default function SubjectsView() {
  const { currentInstitute } = useAppStore()
  const { toast } = useToast()
  const instituteId = currentInstitute?.id

  const [subjects, setSubjects] = useState<Subject[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [creating, setCreating] = useState(false)
  const [form, setForm] = useState({
    name: '',
    code: '',
    gradeLevel: '',
    category: '',
    color: defaultColors[0],
  })

  const fetchSubjects = useCallback(async () => {
    if (!instituteId) return
    setLoading(true)
    try {
      const res = await fetch(`/api/subjects?instituteId=${instituteId}`)
      if (res.ok) {
        const data = await res.json()
        setSubjects(data.subjects || [])
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [instituteId])

  useEffect(() => {
    fetchSubjects()
  }, [fetchSubjects])

  const filtered = subjects.filter(
    (s) =>
      search === '' ||
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      (s.code || '').toLowerCase().includes(search.toLowerCase()) ||
      (s.category || '').toLowerCase().includes(search.toLowerCase())
  )

  const handleCreate = async () => {
    if (!form.name.trim() || !instituteId) return
    setCreating(true)
    try {
      const res = await fetch('/api/subjects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          instituteId,
          name: form.name.trim(),
          code: form.code.trim() || undefined,
          gradeLevel: form.gradeLevel || undefined,
          category: form.category || undefined,
          color: form.color,
        }),
      })
      if (res.ok) {
        toast({ title: 'Subject created', description: `${form.name} has been added` })
        setDialogOpen(false)
        setForm({ name: '', code: '', gradeLevel: '', category: '', color: defaultColors[0] })
        fetchSubjects()
      } else {
        const err = await res.json()
        toast({ title: 'Error', description: err.error || 'Failed to create subject', variant: 'destructive' })
      }
    } catch (err) {
      console.error(err)
      toast({ title: 'Error', description: 'Failed to create subject', variant: 'destructive' })
    } finally {
      setCreating(false)
    }
  }

  const batchCountLabel = (count: number) =>
    count === 0 ? 'No batches' : count === 1 ? '1 batch' : `${count} batches`

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Subjects</h1>
          <p className="text-sm text-muted-foreground">
            {subjects.length} subject{subjects.length !== 1 ? 's' : ''} total
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" /> Add Subject
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Subject</DialogTitle>
              <DialogDescription>Create a new subject for your institute</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Subject Name *</Label>
                <Input
                  placeholder="e.g., Physics"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Code</Label>
                  <Input
                    placeholder="e.g., PHYS"
                    value={form.code}
                    onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Category</Label>
                  <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent>
                      {categoryOptions.map((c) => (
                        <SelectItem key={c} value={c}>
                          {c}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Grade Level</Label>
                  <Select value={form.gradeLevel} onValueChange={(v) => setForm({ ...form, gradeLevel: v })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent>
                      {gradeLevelOptions.map((g) => (
                        <SelectItem key={g} value={g}>
                          {g}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Color</Label>
                  <div className="flex gap-2 flex-wrap mt-1">
                    {defaultColors.map((c) => (
                      <button
                        key={c}
                        type="button"
                        className={`w-7 h-7 rounded-full border-2 transition-transform ${
                          form.color === c ? 'border-foreground scale-110' : 'border-transparent'
                        }`}
                        style={{ backgroundColor: c }}
                        onClick={() => setForm({ ...form, color: c })}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreate} disabled={creating || !form.name.trim()}>
                {creating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Add Subject
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search subjects..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Loading */}
      {loading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-lg" />
          ))}
        </div>
      ) : subjects.length === 0 ? (
        /* No subjects empty state */
        <div className="text-center py-16">
          <BookOpen className="h-12 w-12 mx-auto mb-3 text-muted-foreground/30" />
          <p className="font-medium text-muted-foreground">No subjects yet</p>
          <p className="text-sm text-muted-foreground mt-1">
            Add your first subject to get started
          </p>
        </div>
      ) : filtered.length === 0 ? (
        /* No match empty state */
        <div className="text-center py-16">
          <Search className="h-12 w-12 mx-auto mb-3 text-muted-foreground/30" />
          <p className="font-medium text-muted-foreground">No matching subjects</p>
          <p className="text-sm text-muted-foreground mt-1">
            Try a different search term
          </p>
        </div>
      ) : (
        /* Subject cards */
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((subject) => (
            <Card key={subject.id} className="hover:shadow-md transition-shadow cursor-pointer">
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-lg flex items-center justify-center"
                      style={getColorBg(subject.color || '#10b981')}
                    >
                      <BookOpen className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-semibold text-sm truncate">{subject.name}</h3>
                      <div className="flex items-center gap-1.5">
                        {subject.code && (
                          <span className="text-[10px] font-mono bg-muted px-1.5 py-0.5 rounded">
                            {subject.code}
                          </span>
                        )}
                        {subject.category && (
                          <span className="text-[10px] text-muted-foreground">
                            {subject.category}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <Badge
                    className={`text-[10px] shrink-0 ${
                      subject.isActive
                        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                        : 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400'
                    }`}
                  >
                    {subject.isActive ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
                <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t">
                  <span>{subject.gradeLevel || 'All levels'}</span>
                  <span>{batchCountLabel(subject._count?.batches || 0)}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
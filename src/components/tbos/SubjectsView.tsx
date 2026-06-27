'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Search, Plus, BookOpen, Users } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { useAppStore } from '@/lib/store'

interface Subject {
  id: string
  name: string
  code?: string | null
  nameSinhala?: string | null
  nameTamil?: string | null
  description?: string | null
  gradeLevel?: string | null
  category?: string | null
  color?: string | null
  isActive: boolean
  createdAt: string
  _count: { batches: number }
}

const CATEGORY_COLORS: Record<string, string> = {
  Science: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
  Languages: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300',
  Technology: 'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300',
  Arts: 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300',
  Commerce: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
}

const DEFAULT_ACCENT = 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'

function getAccentClasses(category?: string | null): string {
  if (!category) return DEFAULT_ACCENT
  return CATEGORY_COLORS[category] || DEFAULT_ACCENT
}

export default function SubjectsView() {
  const { toast } = useToast()
  const currentInstitute = useAppStore((s) => s.currentInstitute)

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
    color: '',
  })

  const fetchSubjects = useCallback(async () => {
    if (!currentInstitute?.id) return
    setLoading(true)
    try {
      const res = await fetch(`/api/subjects?instituteId=${currentInstitute.id}`)
      if (res.ok) {
        const data = await res.json()
        setSubjects(data.subjects || [])
      } else {
        toast({ title: 'Error', description: 'Failed to load subjects', variant: 'destructive' })
      }
    } catch {
      toast({ title: 'Error', description: 'Network error while loading subjects', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }, [currentInstitute?.id, toast])

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
    if (!form.name.trim()) {
      toast({ title: 'Validation Error', description: 'Subject name is required', variant: 'destructive' })
      return
    }
    if (!currentInstitute?.id) return

    setCreating(true)
    try {
      const res = await fetch('/api/subjects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          instituteId: currentInstitute.id,
          name: form.name.trim(),
          code: form.code.trim() || undefined,
          gradeLevel: form.gradeLevel.trim() || undefined,
          category: form.category || undefined,
          color: form.color.trim() || undefined,
        }),
      })

      if (res.ok) {
        toast({ title: 'Subject created', description: `${form.name} has been added successfully` })
        setDialogOpen(false)
        setForm({ name: '', code: '', gradeLevel: '', category: '', color: '' })
        fetchSubjects()
      } else {
        const data = await res.json()
        toast({ title: 'Error', description: data.error || 'Failed to create subject', variant: 'destructive' })
      }
    } catch {
      toast({ title: 'Error', description: 'Network error while creating subject', variant: 'destructive' })
    } finally {
      setCreating(false)
    }
  }

  // Guard: no institute selected
  if (!currentInstitute?.id) {
    return (
      <div className="space-y-4">
        <div>
          <h1 className="text-2xl font-bold">Subjects</h1>
          <p className="text-sm text-muted-foreground">Loading institute details...</p>
        </div>
        <div className="flex items-center justify-center py-16">
          <Skeleton className="h-8 w-48" />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Subjects</h1>
          <p className="text-sm text-muted-foreground">
            {loading ? 'Loading...' : `${subjects.length} subject${subjects.length !== 1 ? 's' : ''}`}
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
              <DialogDescription>Create a new subject for your institute.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label htmlFor="subj-name">Subject Name *</Label>
                <Input
                  id="subj-name"
                  placeholder="e.g., Physics"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="subj-code">Code</Label>
                  <Input
                    id="subj-code"
                    placeholder="e.g., PHYS"
                    value={form.code}
                    onChange={(e) => setForm({ ...form, code: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="subj-category">Category</Label>
                  <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                    <SelectTrigger id="subj-category">
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Science">Science</SelectItem>
                      <SelectItem value="Languages">Languages</SelectItem>
                      <SelectItem value="Technology">Technology</SelectItem>
                      <SelectItem value="Arts">Arts</SelectItem>
                      <SelectItem value="Commerce">Commerce</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="subj-grade">Grade Levels</Label>
                <Input
                  id="subj-grade"
                  placeholder="e.g., O/L, A/L"
                  value={form.gradeLevel}
                  onChange={(e) => setForm({ ...form, gradeLevel: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="subj-color">Color</Label>
                <Input
                  id="subj-color"
                  placeholder="e.g., emerald"
                  value={form.color}
                  onChange={(e) => setForm({ ...form, color: e.target.value })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={creating}>
                Cancel
              </Button>
              <Button onClick={handleCreate} disabled={creating || !form.name.trim()}>
                {creating ? 'Creating...' : 'Add Subject'}
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

      {/* Loading Skeletons */}
      {loading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <Skeleton className="h-10 w-10 rounded-lg" />
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-28" />
                      <Skeleton className="h-3 w-20" />
                    </div>
                  </div>
                  <Skeleton className="h-5 w-16 rounded-full" />
                </div>
                <div className="flex items-center justify-between">
                  <Skeleton className="h-3 w-24" />
                  <Skeleton className="h-3 w-16" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!loading && filtered.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="rounded-full bg-muted p-4 mb-4">
            <BookOpen className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold mb-1">
            {search ? 'No subjects found' : 'No subjects yet'}
          </h3>
          <p className="text-sm text-muted-foreground max-w-sm">
            {search
              ? `No subjects match "${search}". Try a different search term.`
              : 'Add your first subject to get started'}
          </p>
          {!search && (
            <Button className="mt-4 gap-2" onClick={() => setDialogOpen(true)}>
              <Plus className="h-4 w-4" /> Add Subject
            </Button>
          )}
        </div>
      )}

      {/* Subject Cards */}
      {!loading && filtered.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((subject) => {
            const accent = getAccentClasses(subject.category)
            return (
              <Card key={subject.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-10 h-10 rounded-lg ${accent} flex items-center justify-center flex-shrink-0`}
                      >
                        <BookOpen className="h-5 w-5" />
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-semibold text-sm truncate">{subject.name}</h3>
                        <p className="text-xs text-muted-foreground truncate">
                          {[subject.code, subject.category].filter(Boolean).join(' \u00B7 ')}
                        </p>
                      </div>
                    </div>
                    <Badge
                      variant="secondary"
                      className={
                        subject.isActive
                          ? 'bg-emerald-100 text-emerald-700 text-xs dark:bg-emerald-900/40 dark:text-emerald-300'
                          : 'bg-gray-100 text-gray-500 text-xs dark:bg-gray-800 dark:text-gray-400'
                      }
                    >
                      {subject.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t border-border/50">
                    <span className="truncate">{subject.gradeLevel || 'All levels'}</span>
                    <span className="flex items-center gap-1 flex-shrink-0 ml-2">
                      <Users className="h-3 w-3" />
                      {subject._count.batches} batch{subject._count.batches !== 1 ? 'es' : ''}
                    </span>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
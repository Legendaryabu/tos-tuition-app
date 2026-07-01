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
import { Search, Plus, Users, Layers, Loader2, DollarSign } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

interface BatchSubject {
  id: string
  name: string
  code?: string
  color?: string
}

interface BatchTeacher {
  id: string
  firstName?: string
  lastName?: string
}

interface BatchBranch {
  name?: string
}

interface Batch {
  id: string
  name: string
  gradeLevel?: string
  classType: string
  status: string
  maxStudents?: number
  monthlyFee?: number
  subject: BatchSubject | null
  teacher: BatchTeacher | null
  branch: BatchBranch | null
  _count: { students: number }
}

interface SubjectOption {
  id: string
  name: string
  code?: string
}

interface TeacherOption {
  id: string
  user: { firstName?: string; lastName?: string } | null
}

const typeColors: Record<string, string> = {
  online: 'bg-sky-100 text-sky-700 border-sky-200 dark:bg-sky-900/30 dark:text-sky-400 dark:border-sky-800',
  physical: 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800',
  hybrid: 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800',
}

const statusColors: Record<string, string> = {
  active: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  upcoming: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  completed: 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400',
  cancelled: 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400',
}

function formatLKR(amount?: number | null): string {
  if (!amount) return '-'
  return `Rs. ${amount.toLocaleString('en-LK')}`
}

export default function BatchesView() {
  const { currentInstitute, setActiveView, setSelectedBatchId } = useAppStore()
  const { toast } = useToast()
  const instituteId = currentInstitute?.id

  const [batches, setBatches] = useState<Batch[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [creating, setCreating] = useState(false)

  // For the Add Batch dialog dropdowns
  const [subjects, setSubjects] = useState<SubjectOption[]>([])
  const [teachers, setTeachers] = useState<TeacherOption[]>([])

  const [form, setForm] = useState({
    name: '',
    subjectId: '',
    teacherId: '',
    classType: 'physical',
    maxStudents: '30',
    monthlyFee: '',
  })

  const fetchBatches = useCallback(async () => {
    if (!instituteId) return
    setLoading(true)
    try {
      const res = await fetch(`/api/batches?instituteId=${instituteId}`)
      if (res.ok) {
        const data = await res.json()
        setBatches(data.batches || [])
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [instituteId])

  const fetchDropdowns = useCallback(async () => {
    if (!instituteId) return
    try {
      const [sRes, tRes] = await Promise.all([
        fetch(`/api/subjects?instituteId=${instituteId}`),
        fetch(`/api/teachers?instituteId=${instituteId}`),
      ])
      if (sRes.ok) setSubjects((await sRes.json()).subjects || [])
      if (tRes.ok) setTeachers((await tRes.json()).teachers || [])
    } catch (err) {
      console.error(err)
    }
  }, [instituteId])

  useEffect(() => {
    fetchBatches()
  }, [fetchBatches])

  useEffect(() => {
    if (dialogOpen) fetchDropdowns()
  }, [dialogOpen, fetchDropdowns])

  const filtered = batches.filter((b) => {
    const q = search.toLowerCase()
    const nameMatch = b.name.toLowerCase().includes(q)
    const subjectMatch = b.subject?.name?.toLowerCase().includes(q)
    const teacherMatch =
      b.teacher
        ? `${b.teacher.firstName || ''} ${b.teacher.lastName || ''}`.toLowerCase().includes(q)
        : false
    const matchSearch = q === '' || nameMatch || subjectMatch || teacherMatch
    const matchType = typeFilter === 'all' || b.classType === typeFilter
    const matchStatus = statusFilter === 'all' || b.status === statusFilter
    return matchSearch && matchType && matchStatus
  })

  const handleViewBatch = (id: string) => {
    setSelectedBatchId(id)
    setActiveView('batch-detail')
  }

  const handleCreate = async () => {
    if (!form.name.trim() || !form.subjectId || !instituteId) return
    setCreating(true)
    try {
      const res = await fetch('/api/batches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          instituteId,
          name: form.name.trim(),
          subjectId: form.subjectId,
          teacherId: form.teacherId || undefined,
          classType: form.classType,
          maxStudents: form.maxStudents ? parseInt(form.maxStudents) : undefined,
          monthlyFee: form.monthlyFee ? parseFloat(form.monthlyFee) : undefined,
        }),
      })
      if (res.ok) {
        toast({ title: 'Batch created', description: `${form.name} has been created` })
        setDialogOpen(false)
        setForm({
          name: '',
          subjectId: '',
          teacherId: '',
          classType: 'physical',
          maxStudents: '30',
          monthlyFee: '',
        })
        fetchBatches()
      } else {
        const err = await res.json()
        toast({
          title: 'Error',
          description: err.error || 'Failed to create batch',
          variant: 'destructive',
        })
      }
    } catch (err) {
      console.error(err)
      toast({ title: 'Error', description: 'Failed to create batch', variant: 'destructive' })
    } finally {
      setCreating(false)
    }
  }

  const onlineCount = batches.filter((b) => b.classType === 'online' || b.classType === 'hybrid').length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Batches</h1>
          <p className="text-sm text-muted-foreground">
            {batches.length} batch{batches.length !== 1 ? 'es' : ''} &middot; {onlineCount} online/hybrid
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" /> Create Batch
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Create New Batch</DialogTitle>
              <DialogDescription>Add a new class batch to your institute</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Batch Name *</Label>
                <Input
                  placeholder="e.g., A/L Physics - 2025"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Subject *</Label>
                  <Select
                    value={form.subjectId}
                    onValueChange={(v) => setForm({ ...form, subjectId: v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select subject" />
                    </SelectTrigger>
                    <SelectContent>
                      {subjects.map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.name} {s.code ? `(${s.code})` : ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Teacher</Label>
                  <Select
                    value={form.teacherId}
                    onValueChange={(v) => setForm({ ...form, teacherId: v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select teacher" />
                    </SelectTrigger>
                    <SelectContent>
                      {teachers.map((t) => (
                        <SelectItem key={t.id} value={t.id}>
                          {t.user?.firstName} {t.user?.lastName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Class Type</Label>
                  <Select
                    value={form.classType}
                    onValueChange={(v) => setForm({ ...form, classType: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="physical">Physical</SelectItem>
                      <SelectItem value="online">Online</SelectItem>
                      <SelectItem value="hybrid">Hybrid</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Max Students</Label>
                  <Input
                    type="number"
                    min="1"
                    value={form.maxStudents}
                    onChange={(e) => setForm({ ...form, maxStudents: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Monthly Fee</Label>
                  <Input
                    type="number"
                    min="0"
                    step="100"
                    placeholder="5000"
                    value={form.monthlyFee}
                    onChange={(e) => setForm({ ...form, monthlyFee: e.target.value })}
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleCreate}
                disabled={creating || !form.name.trim() || !form.subjectId}
              >
                {creating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Create Batch
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search batches..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex gap-1 flex-wrap">
          {['all', 'physical', 'online', 'hybrid'].map((type) => (
            <Button
              key={type}
              variant={typeFilter === type ? 'default' : 'outline'}
              size="sm"
              onClick={() => setTypeFilter(type)}
            >
              {type === 'all' ? 'All Types' : type.charAt(0).toUpperCase() + type.slice(1)}
            </Button>
          ))}
          <span className="w-px bg-border mx-1 hidden sm:block" />
          {['all', 'active', 'upcoming'].map((s) => (
            <Button
              key={s}
              variant={statusFilter === s ? 'default' : 'outline'}
              size="sm"
              onClick={() => setStatusFilter(s)}
            >
              {s === 'all' ? 'All Status' : s.charAt(0).toUpperCase() + s.slice(1)}
            </Button>
          ))}
        </div>
      </div>

      {/* Loading */}
      {loading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-44 rounded-lg" />
          ))}
        </div>
      ) : batches.length === 0 ? (
        /* No batches empty state */
        <div className="text-center py-16">
          <Layers className="h-12 w-12 mx-auto mb-3 text-muted-foreground/30" />
          <p className="font-medium text-muted-foreground">No batches yet</p>
          <p className="text-sm text-muted-foreground mt-1">
            Create your first batch to get started
          </p>
        </div>
      ) : filtered.length === 0 ? (
        /* No match empty state */
        <div className="text-center py-16">
          <Search className="h-12 w-12 mx-auto mb-3 text-muted-foreground/30" />
          <p className="font-medium text-muted-foreground">No matching batches</p>
          <p className="text-sm text-muted-foreground mt-1">
            Try a different search or filter
          </p>
        </div>
      ) : (
        /* Batch cards */
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((batch) => (
            <Card
              key={batch.id}
              className="cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => handleViewBatch(batch.id)}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="min-w-0 flex-1">
                    <h3 className="font-semibold text-sm truncate">{batch.name}</h3>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      {batch.subject && (
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                          <span
                            className="w-2.5 h-2.5 rounded-full shrink-0"
                            style={{ backgroundColor: batch.subject.color || '#10b981' }}
                          />
                          {batch.subject.name}
                        </span>
                      )}
                      {batch.teacher && (
                        <span className="text-xs text-muted-foreground">
                          &middot; {batch.teacher.firstName} {batch.teacher.lastName}
                        </span>
                      )}
                    </div>
                  </div>
                  <Badge
                    variant="outline"
                    className={`text-[10px] shrink-0 ml-2 ${typeColors[batch.classType] || ''}`}
                  >
                    {batch.classType}
                  </Badge>
                </div>

                <div className="flex items-center gap-4 text-xs text-muted-foreground mb-3">
                  <span className="flex items-center gap-1">
                    <Users className="h-3 w-3" />
                    {batch._count?.students || 0}
                    {batch.maxStudents ? `/${batch.maxStudents}` : ''}
                  </span>
                  <span className="flex items-center gap-1">
                    <DollarSign className="h-3 w-3" />
                    {formatLKR(batch.monthlyFee)}
                  </span>
                </div>

                <div className="flex items-center justify-between pt-2 border-t">
                  {batch.gradeLevel && (
                    <span className="text-xs text-muted-foreground">{batch.gradeLevel}</span>
                  )}
                  {!batch.gradeLevel && <span />}
                  <Badge
                    className={`text-[10px] ${statusColors[batch.status] || 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'}`}
                  >
                    {batch.status}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAppStore } from '@/lib/store'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Search,
  Plus,
  Clock,
  Users,
  Layers,
  Loader2,
  ChevronLeft,
  ChevronRight,
  MoreHorizontal,
  Eye,
  Pencil,
  Archive,
  GraduationCap,
  X,
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const DAY_INDICES = [1, 2, 3, 4, 5, 6]

interface ApiBatch {
  id: string
  uuid: string
  instituteId: string
  subjectId: string
  teacherId: string | null
  name: string
  code: string
  description: string | null
  gradeLevel: string | null
  academicYear: string | null
  medium: string | null
  classType: 'physical' | 'online' | 'hybrid'
  maxStudents: number
  currentStudents: number
  monthlyFee: number | null
  registrationFee: number | null
  daysOfWeek: string
  startTime: string | null
  endTime: string | null
  typicalDurationMin: number | null
  onlinePlatform: string | null
  onlineMeetingUrl: string | null
  status: string
  isVisibleToStudents: boolean
  isEnrollmentOpen: boolean
  subject: { id: string; name: string; code: string; color: string | null } | null
  teacher: { id: string; firstName: string; lastName: string } | null
  branch: { id: string; name: string; city: string | null } | null
  _count: { students: number }
}

interface ApiSubject {
  id: string
  name: string
  code: string
}

interface ApiTeacher {
  id: string
  firstName: string
  lastName: string
}

interface Pagination {
  page: number
  limit: number
  total: number
  totalPages: number
}

const typeColors: Record<string, string> = {
  online: 'bg-sky-100 text-sky-700 border-sky-200 dark:bg-sky-950 dark:text-sky-300 dark:border-sky-800',
  physical: 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800',
  hybrid: 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-800',
}

const PAGE_SIZE = 12

function parseSchedule(daysOfWeekStr: string | null | undefined, startTime: string | null | undefined, endTime: string | null | undefined): string {
  try {
    const days: number[] = daysOfWeekStr ? JSON.parse(daysOfWeekStr) : []
    const dayPart = days.map(d => DAY_NAMES[d - 1] || '').filter(Boolean).join(', ')
    const timePart = startTime ? `${startTime}${endTime ? ` - ${endTime}` : ''}` : ''
    if (dayPart && timePart) return `${dayPart} · ${timePart}`
    return dayPart || timePart || 'No schedule set'
  } catch {
    return 'No schedule set'
  }
}

export default function BatchesView() {
  const { currentInstitute, setActiveView, setSelectedBatchId } = useAppStore()
  const { toast } = useToast()

  const [batches, setBatches] = useState<ApiBatch[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [subjectFilter, setSubjectFilter] = useState<string>('all')
  const [teacherFilter, setTeacherFilter] = useState<string>('all')
  const [page, setPage] = useState(1)
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: PAGE_SIZE, total: 0, totalPages: 1 })
  const [dialogOpen, setDialogOpen] = useState(false)

  // Archive confirmation
  const [archiveBatch, setArchiveBatch] = useState<ApiBatch | null>(null)
  const [archiving, setArchiving] = useState(false)

  // Filter dropdown data (subjects & teachers for filter dropdowns)
  const [filterSubjects, setFilterSubjects] = useState<ApiSubject[]>([])
  const [filterTeachers, setFilterTeachers] = useState<ApiTeacher[]>([])
  const [filterDataLoading, setFilterDataLoading] = useState(false)

  // Create form state
  const [form, setForm] = useState({
    name: '',
    subjectId: '',
    teacherId: '',
    classType: 'physical',
    maxStudents: '30',
    daysOfWeek: [] as number[],
    startTime: '',
    endTime: '',
    gradeLevel: '',
    academicYear: '',
    monthlyFee: '',
    registrationFee: '',
    description: '',
    medium: 'english',
  })
  const [subjects, setSubjects] = useState<ApiSubject[]>([])
  const [teachers, setTeachers] = useState<ApiTeacher[]>([])
  const [formLoading, setFormLoading] = useState(false)
  const [creating, setCreating] = useState(false)

  // Active filters check
  const hasActiveFilters = search || typeFilter !== 'all' || statusFilter !== 'all' || subjectFilter !== 'all' || teacherFilter !== 'all'

  const fetchBatches = useCallback(async (
    searchVal?: string,
    typeVal?: string,
    statusVal?: string,
    subjectVal?: string,
    teacherVal?: string,
    pageVal?: number
  ) => {
    if (!currentInstitute?.id) return
    setLoading(true)
    try {
      const params = new URLSearchParams({
        instituteId: currentInstitute.id,
        limit: String(PAGE_SIZE),
        page: String(pageVal ?? page),
      })
      if (searchVal || search) params.set('search', searchVal ?? search)
      const t = typeVal ?? typeFilter
      if (t !== 'all') params.set('classType', t)
      const s = statusVal ?? statusFilter
      if (s !== 'all') params.set('status', s)
      const sub = subjectVal ?? subjectFilter
      if (sub !== 'all') params.set('subjectId', sub)
      const teach = teacherVal ?? teacherFilter
      if (teach !== 'all') params.set('teacherId', teach)

      const res = await fetch(`/api/batches?${params.toString()}`)
      if (res.ok) {
        const data = await res.json()
        setBatches(data.batches || [])
        setPagination(data.pagination || { page: 1, limit: PAGE_SIZE, total: 0, totalPages: 1 })
      } else {
        toast({ title: 'Error', description: 'Failed to fetch batches', variant: 'destructive' })
      }
    } catch {
      toast({ title: 'Error', description: 'Network error fetching batches', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }, [currentInstitute?.id, toast, search, typeFilter, statusFilter, subjectFilter, teacherFilter, page])

  useEffect(() => {
    fetchBatches()
  }, [fetchBatches])

  // Fetch subjects & teachers for filter dropdowns on mount
  const fetchFilterData = useCallback(async () => {
    if (!currentInstitute?.id) return
    setFilterDataLoading(true)
    try {
      const [subjectsRes, teachersRes] = await Promise.all([
        fetch(`/api/subjects?instituteId=${currentInstitute.id}`),
        fetch(`/api/teachers?instituteId=${currentInstitute.id}`),
      ])
      if (subjectsRes.ok) {
        const sData = await subjectsRes.json()
        setFilterSubjects(sData.subjects || [])
      }
      if (teachersRes.ok) {
        const tData = await teachersRes.json()
        setFilterTeachers(tData.teachers || [])
      }
    } catch {
      // silent
    } finally {
      setFilterDataLoading(false)
    }
  }, [currentInstitute?.id])

  useEffect(() => {
    fetchFilterData()
  }, [fetchFilterData])

  const fetchFormData = useCallback(async () => {
    if (!currentInstitute?.id) return
    setFormLoading(true)
    try {
      const [subjectsRes, teachersRes] = await Promise.all([
        fetch(`/api/subjects?instituteId=${currentInstitute.id}`),
        fetch(`/api/teachers?instituteId=${currentInstitute.id}`),
      ])
      if (subjectsRes.ok) {
        const sData = await subjectsRes.json()
        setSubjects(sData.subjects || [])
      }
      if (teachersRes.ok) {
        const tData = await teachersRes.json()
        setTeachers(tData.teachers || [])
      }
    } catch {
      // silent fail - user can still type
    } finally {
      setFormLoading(false)
    }
  }, [currentInstitute?.id])

  useEffect(() => {
    if (dialogOpen) {
      fetchFormData()
    }
  }, [dialogOpen, fetchFormData])

  // Clear all filters
  const clearAllFilters = () => {
    setSearch('')
    setTypeFilter('all')
    setStatusFilter('all')
    setSubjectFilter('all')
    setTeacherFilter('all')
    setPage(1)
  }

  // Debounced search handler
  const [searchTimer, setSearchTimer] = useState<ReturnType<typeof setTimeout> | null>(null)
  const handleSearchChange = (value: string) => {
    setSearch(value)
    if (searchTimer) clearTimeout(searchTimer)
    setSearchTimer(setTimeout(() => {
      setPage(1)
      fetchBatches(value, typeFilter, statusFilter, subjectFilter, teacherFilter, 1)
    }, 300))
  }

  const handleTypeFilterChange = (type: string) => {
    setTypeFilter(type)
    setPage(1)
    fetchBatches(search, type, statusFilter, subjectFilter, teacherFilter, 1)
  }

  const handleStatusFilterChange = (status: string) => {
    setStatusFilter(status)
    setPage(1)
    fetchBatches(search, typeFilter, status, subjectFilter, teacherFilter, 1)
  }

  const handleSubjectFilterChange = (subjectId: string) => {
    setSubjectFilter(subjectId)
    setPage(1)
    fetchBatches(search, typeFilter, statusFilter, subjectId, teacherFilter, 1)
  }

  const handleTeacherFilterChange = (teacherId: string) => {
    setTeacherFilter(teacherId)
    setPage(1)
    fetchBatches(search, typeFilter, statusFilter, subjectFilter, teacherId, 1)
  }

  const handlePageChange = (newPage: number) => {
    setPage(newPage)
    fetchBatches(search, typeFilter, statusFilter, subjectFilter, teacherFilter, newPage)
  }

  const handleViewBatch = (id: string) => {
    setSelectedBatchId(id)
    setActiveView('batch-detail')
  }

  const handleArchive = async () => {
    if (!archiveBatch) return
    setArchiving(true)
    try {
      const res = await fetch(`/api/batches/${archiveBatch.id}`, { method: 'DELETE' })
      if (res.ok) {
        toast({ title: 'Batch archived', description: `"${archiveBatch.name}" has been archived` })
        setArchiveBatch(null)
        fetchBatches(search, typeFilter, statusFilter, subjectFilter, teacherFilter, page)
      } else {
        const errData = await res.json().catch(() => ({}))
        toast({ title: 'Error', description: errData.error || 'Failed to archive', variant: 'destructive' })
      }
    } catch {
      toast({ title: 'Error', description: 'Network error', variant: 'destructive' })
    } finally {
      setArchiving(false)
    }
  }

  const resetForm = () => {
    setForm({
      name: '',
      subjectId: '',
      teacherId: '',
      classType: 'physical',
      maxStudents: '30',
      daysOfWeek: [],
      startTime: '',
      endTime: '',
      gradeLevel: '',
      academicYear: '',
      monthlyFee: '',
      registrationFee: '',
      description: '',
      medium: 'english',
    })
  }

  const handleCreate = async () => {
    if (!currentInstitute?.id) return
    if (!form.name.trim()) {
      toast({ title: 'Validation Error', description: 'Batch name is required', variant: 'destructive' })
      return
    }
    if (!form.subjectId) {
      toast({ title: 'Validation Error', description: 'Please select a subject', variant: 'destructive' })
      return
    }

    setCreating(true)
    try {
      const body: Record<string, unknown> = {
        instituteId: currentInstitute.id,
        subjectId: form.subjectId,
        name: form.name.trim(),
        classType: form.classType,
        daysOfWeek: form.daysOfWeek,
        medium: form.medium,
      }
      if (form.teacherId) body.teacherId = form.teacherId
      if (form.maxStudents) body.maxStudents = parseInt(form.maxStudents, 10) || undefined
      if (form.startTime) body.startTime = form.startTime
      if (form.endTime) body.endTime = form.endTime
      if (form.gradeLevel) body.gradeLevel = form.gradeLevel
      if (form.academicYear) body.academicYear = form.academicYear
      if (form.monthlyFee) body.monthlyFee = parseFloat(form.monthlyFee) || undefined
      if (form.registrationFee) body.registrationFee = parseFloat(form.registrationFee) || 0
      if (form.description) body.description = form.description

      const res = await fetch('/api/batches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (res.ok) {
        toast({ title: 'Batch created', description: `${form.name} has been created successfully` })
        setDialogOpen(false)
        resetForm()
        fetchBatches(search, typeFilter, statusFilter, subjectFilter, teacherFilter, 1)
      } else {
        const errData = await res.json().catch(() => ({}))
        toast({ title: 'Error creating batch', description: errData.error || 'Something went wrong', variant: 'destructive' })
      }
    } catch {
      toast({ title: 'Error', description: 'Network error creating batch', variant: 'destructive' })
    } finally {
      setCreating(false)
    }
  }

  // Pagination page numbers (max 5 visible with ellipsis logic)
  const getPageNumbers = () => {
    const total = pagination.totalPages
    const current = pagination.page
    if (total <= 5) return Array.from({ length: total }, (_, i) => i + 1)
    const pages: (number | '...')[] = []
    if (current <= 3) {
      for (let i = 1; i <= 4; i++) pages.push(i)
      pages.push('...')
      pages.push(total)
    } else if (current >= total - 2) {
      pages.push(1)
      pages.push('...')
      for (let i = total - 3; i <= total; i++) pages.push(i)
    } else {
      pages.push(1)
      pages.push('...')
      for (let i = current - 1; i <= current + 1; i++) pages.push(i)
      pages.push('...')
      pages.push(total)
    }
    return pages
  }

  // Guard: no institute
  if (!currentInstitute?.id) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="text-center text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
          <p className="text-sm">Loading institute...</p>
        </div>
      </div>
    )
  }

  const onlineCount = batches.filter(b => b.classType === 'online').length

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Batches</h1>
          <p className="text-sm text-muted-foreground">
            {loading ? 'Loading...' : `${pagination.total} batch${pagination.total !== 1 ? 'es' : ''} · ${onlineCount} online`}
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm() }}>
          <DialogTrigger asChild>
            <Button className="gap-2"><Plus className="h-4 w-4" /> Create Batch</Button>
          </DialogTrigger>
          <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>Create New Batch</DialogTitle>
              <DialogDescription>Add a new class batch to your institute</DialogDescription>
            </DialogHeader>
            <ScrollArea className="max-h-[70vh] overflow-y-auto pr-2">
              <div className="space-y-4 py-2">
                {/* Basic Info */}
                <div className="space-y-3">
                  <h4 className="text-sm font-semibold">Basic Information</h4>
                  <div className="space-y-2">
                    <Label>Batch Name *</Label>
                    <Input
                      placeholder="e.g., A/L Physics - 2025"
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label>Subject *</Label>
                      {formLoading ? (
                        <Skeleton className="h-9 w-full" />
                      ) : (
                        <Select value={form.subjectId} onValueChange={(v) => setForm({ ...form, subjectId: v })}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select subject" />
                          </SelectTrigger>
                          <SelectContent>
                            {subjects.length === 0 && (
                              <SelectItem value="__none" disabled>No subjects found</SelectItem>
                            )}
                            {subjects.map((s) => (
                              <SelectItem key={s.id} value={s.id}>{s.name}{s.code ? ` (${s.code})` : ''}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label>Teacher</Label>
                      {formLoading ? (
                        <Skeleton className="h-9 w-full" />
                      ) : (
                        <Select value={form.teacherId} onValueChange={(v) => setForm({ ...form, teacherId: v })}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select teacher" />
                          </SelectTrigger>
                          <SelectContent>
                            {teachers.length === 0 && (
                              <SelectItem value="__none" disabled>No teachers found</SelectItem>
                            )}
                            {teachers.map((t) => (
                              <SelectItem key={t.id} value={t.id}>{t.firstName} {t.lastName}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label>Class Type</Label>
                      <Select value={form.classType} onValueChange={(v) => setForm({ ...form, classType: v })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
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
                        min={1}
                        value={form.maxStudents}
                        onChange={(e) => setForm({ ...form, maxStudents: e.target.value })}
                      />
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Schedule */}
                <div className="space-y-3">
                  <h4 className="text-sm font-semibold">Schedule</h4>
                  <div className="space-y-2">
                    <Label>Days of Week</Label>
                    <div className="flex flex-wrap gap-3">
                      {DAY_INDICES.map((dayIdx) => {
                        const isChecked = form.daysOfWeek.includes(dayIdx)
                        return (
                          <label key={dayIdx} className="flex items-center gap-1.5 cursor-pointer">
                            <Checkbox
                              checked={isChecked}
                              onCheckedChange={(checked) => {
                                const next = checked
                                  ? [...form.daysOfWeek, dayIdx]
                                  : form.daysOfWeek.filter((d) => d !== dayIdx)
                                setForm({ ...form, daysOfWeek: next })
                              }}
                            />
                            <span className="text-sm">{DAY_NAMES[dayIdx - 1]}</span>
                          </label>
                        )
                      })}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label>Start Time</Label>
                      <Input
                        type="time"
                        value={form.startTime}
                        onChange={(e) => setForm({ ...form, startTime: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>End Time</Label>
                      <Input
                        type="time"
                        value={form.endTime}
                        onChange={(e) => setForm({ ...form, endTime: e.target.value })}
                      />
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Academic */}
                <div className="space-y-3">
                  <h4 className="text-sm font-semibold">Academic</h4>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label>Grade Level</Label>
                      <Select value={form.gradeLevel} onValueChange={(v) => setForm({ ...form, gradeLevel: v })}>
                        <SelectTrigger><SelectValue placeholder="Select grade" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">—</SelectItem>
                          {['Grade 6', 'Grade 7', 'Grade 8', 'Grade 9', 'Grade 10', 'Grade 11', 'O/L', 'A/L'].map((g) => (
                            <SelectItem key={g} value={g}>{g}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Academic Year</Label>
                      <Input
                        value={form.academicYear}
                        onChange={(e) => setForm({ ...form, academicYear: e.target.value })}
                        placeholder="2025"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Medium</Label>
                    <Select value={form.medium} onValueChange={(v) => setForm({ ...form, medium: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="english">English</SelectItem>
                        <SelectItem value="sinhala">Sinhala</SelectItem>
                        <SelectItem value="tamil">Tamil</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <Separator />

                {/* Fees */}
                <div className="space-y-3">
                  <h4 className="text-sm font-semibold">Fees (Optional)</h4>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label>Monthly Fee (LKR)</Label>
                      <Input
                        type="number"
                        min={0}
                        step={0.01}
                        value={form.monthlyFee}
                        onChange={(e) => setForm({ ...form, monthlyFee: e.target.value })}
                        placeholder="0.00"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Registration Fee (LKR)</Label>
                      <Input
                        type="number"
                        min={0}
                        step={0.01}
                        value={form.registrationFee}
                        onChange={(e) => setForm({ ...form, registrationFee: e.target.value })}
                        placeholder="0.00"
                      />
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Description */}
                <div className="space-y-3">
                  <h4 className="text-sm font-semibold">Additional</h4>
                  <div className="space-y-2">
                    <Label>Description</Label>
                    <Textarea
                      value={form.description}
                      onChange={(e) => setForm({ ...form, description: e.target.value })}
                      placeholder="Optional batch description..."
                      rows={3}
                    />
                  </div>
                </div>
              </div>
            </ScrollArea>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleCreate} disabled={creating}>
                {creating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Create Batch
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search + Filters */}
      <div className="space-y-3">
        {/* Row 1: Search bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search batches by name or code..."
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Row 2: Filter buttons + dropdowns - stacks on mobile */}
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
          {/* Type filter buttons */}
          <div className="flex gap-1">
            {(['all', 'physical', 'online', 'hybrid'] as const).map(type => (
              <Button
                key={type}
                variant={typeFilter === type ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleTypeFilterChange(type)}
              >
                {type === 'all' ? 'All' : type.charAt(0).toUpperCase() + type.slice(1)}
              </Button>
            ))}
          </div>

          {/* Status filter buttons */}
          <div className="flex gap-1">
            {(['all', 'active', 'upcoming'] as const).map(status => (
              <Button
                key={status}
                variant={statusFilter === status ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleStatusFilterChange(status)}
              >
                {status === 'all' ? 'All Status' : status.charAt(0).toUpperCase() + status.slice(1)}
              </Button>
            ))}
          </div>

          {/* Subject & Teacher dropdowns - hidden on mobile */}
          <div className="hidden sm:flex gap-2">
            <Select value={subjectFilter} onValueChange={handleSubjectFilterChange}>
              <SelectTrigger className="w-[160px] h-9">
                <SelectValue placeholder="All Subjects" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Subjects</SelectItem>
                {filterSubjects.map((s) => (
                  <SelectItem key={s.id} value={s.id}>{s.name}{s.code ? ` (${s.code})` : ''}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={teacherFilter} onValueChange={handleTeacherFilterChange}>
              <SelectTrigger className="w-[160px] h-9">
                <SelectValue placeholder="All Teachers" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Teachers</SelectItem>
                {filterTeachers.map((t) => (
                  <SelectItem key={t.id} value={t.id}>{t.firstName} {t.lastName}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Row 3: Active filter pills */}
        {hasActiveFilters && (
          <div className="flex items-center gap-1.5 flex-wrap">
            <Button variant="ghost" size="sm" className="h-7 text-xs text-muted-foreground" onClick={clearAllFilters}>
              <X className="h-3 w-3 mr-1" />Clear all
            </Button>
            {search && (
              <Badge variant="secondary" className="gap-1 text-xs">
                Search: &quot;{search}&quot;
                <button onClick={() => { setSearch(''); setPage(1); fetchBatches('', typeFilter, statusFilter, subjectFilter, teacherFilter, 1) }}><X className="h-3 w-3 ml-0.5" /></button>
              </Badge>
            )}
            {typeFilter !== 'all' && (
              <Badge variant="secondary" className="gap-1 text-xs">
                Type: {typeFilter}
                <button onClick={() => handleTypeFilterChange('all')}><X className="h-3 w-3 ml-0.5" /></button>
              </Badge>
            )}
            {statusFilter !== 'all' && (
              <Badge variant="secondary" className="gap-1 text-xs">
                Status: {statusFilter}
                <button onClick={() => handleStatusFilterChange('all')}><X className="h-3 w-3 ml-0.5" /></button>
              </Badge>
            )}
            {subjectFilter !== 'all' && (
              <Badge variant="secondary" className="gap-1 text-xs">
                Subject: {filterSubjects.find(s => s.id === subjectFilter)?.name || '—'}
                <button onClick={() => handleSubjectFilterChange('all')}><X className="h-3 w-3 ml-0.5" /></button>
              </Badge>
            )}
            {teacherFilter !== 'all' && (
              <Badge variant="secondary" className="gap-1 text-xs">
                Teacher: {filterTeachers.find(t => t.id === teacherFilter) ? `${filterTeachers.find(t => t.id === teacherFilter)!.firstName} ${filterTeachers.find(t => t.id === teacherFilter)!.lastName}` : '—'}
                <button onClick={() => handleTeacherFilterChange('all')}><X className="h-3 w-3 ml-0.5" /></button>
              </Badge>
            )}
          </div>
        )}
      </div>

      {/* Batch Cards */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <div className="space-y-2 flex-1">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                  <Skeleton className="h-5 w-14 rounded-full" />
                </div>
                <Skeleton className="h-3 w-2/3" />
                <div className="flex items-center justify-between">
                  <Skeleton className="h-3 w-20" />
                  <Skeleton className="h-5 w-14 rounded-full" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : batches.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <div className="flex flex-col items-center gap-3">
              <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
                <GraduationCap className="h-8 w-8 text-muted-foreground/50" />
              </div>
              <div>
                {search || typeFilter !== 'all' || statusFilter !== 'all' || subjectFilter !== 'all' || teacherFilter !== 'all' ? (
                  <>
                    <p className="font-medium text-muted-foreground">No batches match your filters</p>
                    <p className="text-xs text-muted-foreground mt-1">Try adjusting your search or filter criteria</p>
                  </>
                ) : (
                  <>
                    <p className="font-medium text-muted-foreground">No batches yet</p>
                    <p className="text-xs text-muted-foreground mt-1">Create your first batch to start organizing classes</p>
                  </>
                )}
              </div>
              {!hasActiveFilters && (
                <Button size="sm" onClick={() => setDialogOpen(true)}>
                  <Plus className="h-4 w-4 mr-1.5" />Create Batch
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {batches.map(batch => {
              const studentCount = batch._count?.students || batch.currentStudents || 0
              const schedule = parseSchedule(batch.daysOfWeek, batch.startTime, batch.endTime)
              const teacherName = batch.teacher
                ? `${batch.teacher.firstName} ${batch.teacher.lastName}`
                : 'Unassigned'

              return (
                <Card
                  key={batch.id}
                  className="cursor-pointer hover:shadow-md transition-shadow relative"
                  onClick={() => handleViewBatch(batch.id)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="min-w-0 flex-1">
                        <h3 className="font-semibold text-sm truncate">{batch.name}</h3>
                        <p className="text-xs text-muted-foreground truncate">
                          {batch.subject?.name || 'No subject'} &middot; {teacherName}
                        </p>
                      </div>
                      <div className="flex items-center gap-1 shrink-0 ml-2">
                        <Badge
                          variant="outline"
                          className={`text-[10px] ${typeColors[batch.classType] || ''}`}
                        >
                          {batch.classType}
                        </Badge>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-40">
                            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleViewBatch(batch.id) }}>
                              <Eye className="h-4 w-4 mr-2" />View Details
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={(e) => {
                              e.stopPropagation()
                              setSelectedBatchId(batch.id)
                              setActiveView('batch-detail')
                              toast({ title: 'Edit mode', description: 'Open the batch to edit its details' })
                            }}>
                              <Pencil className="h-4 w-4 mr-2" />Edit
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-destructive focus:text-destructive"
                              onClick={(e) => { e.stopPropagation(); setArchiveBatch(batch) }}
                            >
                              <Archive className="h-4 w-4 mr-2" />Archive
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 text-xs text-muted-foreground mb-3">
                      <Clock className="h-3 w-3 shrink-0" />
                      <span className="truncate">{schedule}</span>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1 text-xs">
                        <Users className="h-3 w-3 text-muted-foreground" />
                        <span>
                          {studentCount}{batch.maxStudents ? `/${batch.maxStudents}` : ''} students
                        </span>
                      </div>
                      <Badge
                        className={`text-xs ${batch.status === 'active'
                          ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                          : batch.status === 'upcoming'
                          ? 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
                          : 'bg-gray-100 text-gray-500 dark:bg-gray-900 dark:text-gray-400'
                        }`}
                      >
                        {batch.status}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">
                Showing {(pagination.page - 1) * pagination.limit + 1}-{Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total}
              </p>
              <div className="flex items-center gap-1">
                <Button variant="outline" size="icon" className="h-8 w-8" disabled={pagination.page <= 1} onClick={() => handlePageChange(pagination.page - 1)}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                {getPageNumbers().map((p, i) =>
                  p === '...' ? (
                    <span key={`ellipsis-${i}`} className="px-1 text-xs text-muted-foreground">...</span>
                  ) : (
                    <Button
                      key={p}
                      variant={pagination.page === p ? 'default' : 'outline'}
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => handlePageChange(p)}
                    >
                      {p}
                    </Button>
                  )
                )}
                <Button variant="outline" size="icon" className="h-8 w-8" disabled={pagination.page >= pagination.totalPages} onClick={() => handlePageChange(pagination.page + 1)}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Archive Confirmation Dialog */}
      <AlertDialog open={!!archiveBatch} onOpenChange={(open) => { if (!open) setArchiveBatch(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Archive &quot;{archiveBatch?.name}&quot;?</AlertDialogTitle>
            <AlertDialogDescription>
              This will archive the batch and deactivate all enrolled students. You can restore it later from the archive. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={archiving}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleArchive}
              disabled={archiving}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {archiving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Archive
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
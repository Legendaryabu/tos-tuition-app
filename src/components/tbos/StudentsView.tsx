'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useAppStore } from '@/lib/store'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Checkbox } from '@/components/ui/checkbox'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Separator } from '@/components/ui/separator'
import {
  Search, Plus, MoreHorizontal, Eye, GraduationCap, UserPlus,
  ChevronLeft, ChevronRight, Download, LayoutGrid, List,
  Edit3, Trash2, X, ChevronDown, Users, Phone, Mail,
  AlertTriangle, CheckCircle, MessageSquare, ArrowUpDown,
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

// ─── Interfaces ──────────────────────────────────────────────
interface Student {
  id: string
  studentNumber: string
  fullName: string
  gender?: string
  grade?: string
  schoolName?: string
  status: string
  outstandingBalance: number
  totalPaid: number
  mobile?: string
  district?: string
  user?: { email?: string; profilePhoto?: string } | null
  branch?: { name?: string; city?: string } | null
}

interface Pagination {
  page: number
  limit: number
  total: number
  totalPages: number
}

interface BatchOption {
  id: string
  name: string
  subjectId?: string
  subject?: { name?: string; code?: string } | null
  classType?: string
}

interface DuplicateStudent {
  id: string
  fullName: string
  mobile?: string
  studentNumber: string
}

// ─── Helpers ─────────────────────────────────────────────────
function formatLKR(amount: number): string {
  return `Rs. ${amount.toLocaleString('en-LK')}`
}

function getInitials(name: string): string {
  return name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
}

function getAvatarColor(name: string): string {
  const colors = [
    'bg-rose-100 text-rose-700',
    'bg-amber-100 text-amber-700',
    'bg-emerald-100 text-emerald-700',
    'bg-sky-100 text-sky-700',
    'bg-violet-100 text-violet-700',
    'bg-teal-100 text-teal-700',
    'bg-orange-100 text-orange-700',
    'bg-pink-100 text-pink-700',
  ]
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash)
  return colors[Math.abs(hash) % colors.length]
}

const GRADE_OPTIONS = [
  'Grade 6', 'Grade 7', 'Grade 8', 'Grade 9', 'Grade 10', 'Grade 11', 'O/L', 'A/L',
]

const STREAM_OPTIONS = ['Maths', 'Bio', 'Commerce', 'Arts', 'Technology']

const EMPTY_FORM = {
  firstName: '', lastName: '', gender: '', dob: '', grade: '', schoolName: '',
  mobile: '', whatsapp: '', email: '', address: '', city: '', district: '',
  stream: '', examYear: '', batchIds: [] as string[],
}

// ─── Student Form Component ─────────────────────────────────
function StudentForm({
  form,
  setForm,
  batches,
  mode,
}: {
  form: typeof EMPTY_FORM
  setForm: (f: typeof EMPTY_FORM) => void
  batches: BatchOption[]
  mode: 'add' | 'edit'
}) {
  const update = (key: string, value: string) => setForm({ ...form, [key]: value })

  return (
    <div className="space-y-5 max-h-[60vh] overflow-y-auto pr-1">
      {/* Personal Info */}
      <div>
        <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">Personal Information</h4>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>First Name <span className="text-destructive">*</span></Label>
            <Input placeholder="Kasun" value={form.firstName} onChange={(e) => update('firstName', e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Last Name <span className="text-destructive">*</span></Label>
            <Input placeholder="Madusanka" value={form.lastName} onChange={(e) => update('lastName', e.target.value)} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 mt-3">
          <div className="space-y-1.5">
            <Label>Gender</Label>
            <Select value={form.gender} onValueChange={(v) => update('gender', v)}>
              <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Male">Male</SelectItem>
                <SelectItem value="Female">Female</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Date of Birth</Label>
            <Input type="date" value={form.dob} onChange={(e) => update('dob', e.target.value)} />
          </div>
        </div>
      </div>

      <Separator />

      {/* Contact Info */}
      <div>
        <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">Contact Information</h4>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>Mobile</Label>
            <Input placeholder="077 123 4567" value={form.mobile} onChange={(e) => update('mobile', e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>WhatsApp</Label>
            <Input placeholder="Same as mobile" value={form.whatsapp} onChange={(e) => update('whatsapp', e.target.value)} />
          </div>
        </div>
        <div className="space-y-1.5 mt-3">
          <Label>Email</Label>
          <Input type="email" placeholder="student@example.lk" value={form.email} onChange={(e) => update('email', e.target.value)} />
        </div>
        <div className="space-y-1.5 mt-3">
          <Label>Address</Label>
          <Input placeholder="No. 42, Galle Road" value={form.address} onChange={(e) => update('address', e.target.value)} />
        </div>
        <div className="grid grid-cols-2 gap-3 mt-3">
          <div className="space-y-1.5">
            <Label>City</Label>
            <Input placeholder="Colombo" value={form.city} onChange={(e) => update('city', e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>District</Label>
            <Input placeholder="Colombo" value={form.district} onChange={(e) => update('district', e.target.value)} />
          </div>
        </div>
      </div>

      <Separator />

      {/* Academic Info */}
      <div>
        <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">Academic Information</h4>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>Grade Level</Label>
            <Select value={form.grade} onValueChange={(v) => update('grade', v)}>
              <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
              <SelectContent>
                {GRADE_OPTIONS.map((g) => <SelectItem key={g} value={g}>{g}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Exam Year</Label>
            <Input type="number" placeholder="2025" value={form.examYear} onChange={(e) => update('examYear', e.target.value)} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 mt-3">
          <div className="space-y-1.5">
            <Label>School</Label>
            <Input placeholder="Royal College" value={form.schoolName} onChange={(e) => update('schoolName', e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Stream (A/L)</Label>
            <Select value={form.stream} onValueChange={(v) => update('stream', v)}>
              <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
              <SelectContent>
                {STREAM_OPTIONS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Batch Enrollment (only for add mode) */}
      {mode === 'add' && batches.length > 0 && (
        <>
          <Separator />
          <div>
            <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
              Enroll in Batches <span className="text-xs font-normal text-muted-foreground">(optional)</span>
            </h4>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {batches.map((batch) => (
                <label
                  key={batch.id}
                  className="flex items-center gap-3 p-2 rounded-md hover:bg-muted/50 cursor-pointer"
                >
                  <Checkbox
                    checked={form.batchIds.includes(batch.id)}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setForm({ ...form, batchIds: [...form.batchIds, batch.id] })
                      } else {
                        setForm({ ...form, batchIds: form.batchIds.filter((b) => b !== batch.id) })
                      }
                    }}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{batch.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {batch.subject?.name || batch.subject?.code || ''}
                      {batch.classType ? ` · ${batch.classType}` : ''}
                    </p>
                  </div>
                </label>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}

// ─── Main Component ──────────────────────────────────────────
export default function StudentsView() {
  const { currentInstitute, setActiveView, setSelectedStudentId } = useAppStore()
  const { toast } = useToast()

  // Data state
  const [students, setStudents] = useState<Student[]>([])
  const [loading, setLoading] = useState(true)
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 20, total: 0, totalPages: 0 })
  const [page, setPage] = useState(1)

  // Filter state
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [gradeFilter, setGradeFilter] = useState<string>('all')
  const [districtFilter, setDistrictFilter] = useState<string>('all')
  const [sortBy, setSortBy] = useState<string>('createdAt')
  const [sortOrder, setSortOrder] = useState<string>('desc')

  // Available filter options from server
  const [availableGrades, setAvailableGrades] = useState<string[]>([])
  const [availableDistricts, setAvailableDistricts] = useState<string[]>([])

  // View state
  const [viewMode, setViewMode] = useState<'table' | 'card'>('table')

  // Selection state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  // Dialogs
  const [addDialogOpen, setAddDialogOpen] = useState(false)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [studentToDelete, setStudentToDelete] = useState<Student | null>(null)
  const [duplicateDialogOpen, setDuplicateDialogOpen] = useState(false)
  const [duplicateStudents, setDuplicateStudents] = useState<DuplicateStudent[]>([])
  const [pendingAddBody, setPendingAddBody] = useState<any>(null)

  // Loading states
  const [addLoading, setAddLoading] = useState(false)
  const [editLoading, setEditLoading] = useState(false)
  const [deleteLoading, setDeleteLoading] = useState(false)

  // Quick add state
  const [quickAddOpen, setQuickAddOpen] = useState(false)
  const [quickAddForm, setQuickAddForm] = useState({ firstName: '', mobile: '', grade: '' })
  const [quickAddLoading, setQuickAddLoading] = useState(false)

  // Form state
  const [addForm, setAddForm] = useState({ ...EMPTY_FORM })
  const [editForm, setEditForm] = useState({ ...EMPTY_FORM })
  const [editingStudent, setEditingStudent] = useState<Student | null>(null)

  // Batches for enrollment
  const [batches, setBatches] = useState<BatchOption[]>([])

  // ─── Fetch students ──────────────────────────────────────
  const fetchStudents = useCallback(async (p: number = 1, s: string = '') => {
    if (!currentInstitute?.id) return
    setLoading(true)
    try {
      const params = new URLSearchParams({
        instituteId: currentInstitute.id,
        page: String(p),
        limit: '20',
        sortBy,
        sortOrder,
      })
      if (s) params.set('search', s)
      if (statusFilter !== 'all') params.set('status', statusFilter)
      if (gradeFilter !== 'all') params.set('grade', gradeFilter)
      if (districtFilter !== 'all') params.set('district', districtFilter)

      const res = await fetch(`/api/students?${params}`)
      if (res.ok) {
        const data = await res.json()
        setStudents(data.students || [])
        setPagination(data.pagination || { page: 1, limit: 20, total: 0, totalPages: 0 })
        if (data.filters) {
          setAvailableGrades(data.filters.grades || [])
          setAvailableDistricts(data.filters.districts || [])
        }
      } else {
        setStudents([])
        setPagination({ page: 1, limit: 20, total: 0, totalPages: 0 })
      }
    } catch {
      setStudents([])
    } finally {
      setLoading(false)
    }
  }, [currentInstitute?.id, statusFilter, gradeFilter, districtFilter, sortBy, sortOrder])

  useEffect(() => {
    fetchStudents(page, search)
  }, [page, statusFilter, gradeFilter, districtFilter, sortBy, sortOrder, fetchStudents, search])

  // Fetch batches for enrollment
  const fetchBatches = useCallback(async () => {
    if (!currentInstitute?.id) return
    try {
      const res = await fetch(`/api/batches?instituteId=${currentInstitute.id}&status=active`)
      if (res.ok) {
        const data = await res.json()
        setBatches((data.batches || data || []).slice(0, 20).map((b: any) => ({
          id: b.id,
          name: b.name,
          subjectId: b.subjectId,
          subject: b.subject || null,
          classType: b.classType,
        })))
      }
    } catch { /* ignore */ }
  }, [currentInstitute?.id])

  // ─── Computed ────────────────────────────────────────────
  const hasActiveFilters = search || statusFilter !== 'all' || gradeFilter !== 'all' || districtFilter !== 'all'
  const allSelected = students.length > 0 && selectedIds.size === students.length
  const someSelected = selectedIds.size > 0

  const clearFilters = () => {
    setSearch('')
    setStatusFilter('all')
    setGradeFilter('all')
    setDistrictFilter('all')
    setPage(1)
  }

  // ─── Handlers ────────────────────────────────────────────
  const handleViewStudent = (id: string) => {
    setSelectedStudentId(id)
    setActiveView('student-detail')
  }

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(students.map(s => s.id)))
    }
  }

  const toggleSelect = (id: string) => {
    const next = new Set(selectedIds)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    setSelectedIds(next)
  }

  const openEditDialog = (student: Student, e?: React.MouseEvent) => {
    e?.stopPropagation()
    const parts = student.fullName.split(' ')
    setEditingStudent(student)
    setEditForm({
      firstName: parts[0] || '',
      lastName: parts.slice(1).join(' ') || '',
      gender: student.gender || '',
      dob: student.dateOfBirth ? new Date(student.dateOfBirth).toISOString().split('T')[0] : '',
      grade: student.grade || '',
      schoolName: student.schoolName || '',
      mobile: student.mobile || '',
      whatsapp: '',
      email: student.user?.email || student.email || '',
      address: '',
      city: student.city || '',
      district: student.district || '',
      stream: student.stream || '',
      examYear: student.examYear ? String(student.examYear) : '',
      batchIds: [],
    })
    setEditDialogOpen(true)
  }

  const openDeleteDialog = (student: Student, e?: React.MouseEvent) => {
    e?.stopPropagation()
    setStudentToDelete(student)
    setDeleteDialogOpen(true)
  }

  // ─── Add student ─────────────────────────────────────────
  const handleAddStudent = async (force: boolean = false) => {
    if (!addForm.firstName || !addForm.lastName) {
      toast({ title: 'Missing fields', description: 'First name and last name are required', variant: 'destructive' })
      return
    }

    const body = {
      instituteId: currentInstitute?.id,
      firstName: addForm.firstName,
      lastName: addForm.lastName,
      gender: addForm.gender || undefined,
      dateOfBirth: addForm.dob || undefined,
      grade: addForm.grade || undefined,
      schoolName: addForm.schoolName || undefined,
      stream: addForm.stream || undefined,
      examYear: addForm.examYear ? parseInt(addForm.examYear) : undefined,
      mobile: addForm.mobile || undefined,
      whatsapp: addForm.whatsapp || undefined,
      email: addForm.email || undefined,
      addressLine1: addForm.address || undefined,
      city: addForm.city || undefined,
      district: addForm.district || undefined,
      batchIds: addForm.batchIds.length > 0 ? addForm.batchIds : undefined,
    }

    setAddLoading(true)
    try {
      const res = await fetch('/api/students', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (res.status === 409) {
        const data = await res.json()
        if (data.duplicates && !force) {
          setDuplicateStudents(data.duplicates)
          setPendingAddBody(body)
          setDuplicateDialogOpen(true)
          return
        }
      }

      if (res.ok) {
        toast({ title: 'Student added', description: `${addForm.firstName} ${addForm.lastName} has been enrolled` })
        setAddDialogOpen(false)
        setAddForm({ ...EMPTY_FORM })
        fetchStudents(1, '')
        setSearch('')
        setPage(1)
        setSelectedIds(new Set())
      } else {
        const err = await res.json().catch(() => ({}))
        toast({ title: 'Failed to add student', description: err.error || 'Unknown error', variant: 'destructive' })
      }
    } catch {
      toast({ title: 'Connection error', description: 'Could not connect to server', variant: 'destructive' })
    } finally {
      setAddLoading(false)
    }
  }

  const handleForceAdd = async () => {
    setDuplicateDialogOpen(false)
    setAddLoading(true)
    try {
      const res = await fetch('/api/students', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...pendingAddBody, forceDuplicate: true }),
      })
      if (res.ok) {
        toast({ title: 'Student added', description: `${pendingAddBody.firstName} ${pendingAddBody.lastName} has been enrolled` })
        setAddDialogOpen(false)
        setAddForm({ ...EMPTY_FORM })
        fetchStudents(1, '')
        setSearch('')
        setPage(1)
      }
    } catch { /* ignore */ }
    finally { setAddLoading(false) }
  }

  // ─── Edit student ────────────────────────────────────────
  const handleEditStudent = async () => {
    if (!editingStudent) return
    if (!editForm.firstName || !editForm.lastName) {
      toast({ title: 'Missing fields', description: 'First name and last name are required', variant: 'destructive' })
      return
    }

    setEditLoading(true)
    try {
      const res = await fetch(`/api/students/${editingStudent.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: editForm.firstName,
          lastName: editForm.lastName,
          gender: editForm.gender || undefined,
          dateOfBirth: editForm.dob || undefined,
          grade: editForm.grade || undefined,
          schoolName: editForm.schoolName || undefined,
          stream: editForm.stream || undefined,
          examYear: editForm.examYear ? parseInt(editForm.examYear) : undefined,
          mobile: editForm.mobile || undefined,
          whatsapp: editForm.whatsapp || undefined,
          email: editForm.email || undefined,
          addressLine1: editForm.address || undefined,
          city: editForm.city || undefined,
          district: editForm.district || undefined,
        }),
      })
      if (res.ok) {
        toast({ title: 'Student updated', description: `${editForm.firstName} ${editForm.lastName}'s profile has been updated` })
        setEditDialogOpen(false)
        setEditingStudent(null)
        fetchStudents(page, search)
      } else {
        const err = await res.json().catch(() => ({}))
        toast({ title: 'Update failed', description: err.error || 'Unknown error', variant: 'destructive' })
      }
    } catch {
      toast({ title: 'Connection error', variant: 'destructive' })
    } finally {
      setEditLoading(false)
    }
  }

  // ─── Delete student ──────────────────────────────────────
  const handleDeleteStudent = async () => {
    if (!studentToDelete) return
    setDeleteLoading(true)
    try {
      const res = await fetch(`/api/students/${studentToDelete.id}`, { method: 'DELETE' })
      if (res.ok) {
        toast({ title: 'Student deactivated', description: `${studentToDelete.fullName} has been deactivated` })
        setDeleteDialogOpen(false)
        setStudentToDelete(null)
        setSelectedIds(prev => { const n = new Set(prev); n.delete(studentToDelete.id); return n })
        fetchStudents(page, search)
      } else {
        const err = await res.json().catch(() => ({}))
        toast({ title: 'Failed to deactivate', description: err.error || 'Unknown error', variant: 'destructive' })
      }
    } catch {
      toast({ title: 'Connection error', variant: 'destructive' })
    } finally {
      setDeleteLoading(false)
    }
  }

  // ─── Quick add ───────────────────────────────────────────
  const handleQuickAdd = async () => {
    if (!quickAddForm.firstName) {
      toast({ title: 'Name required', description: 'Please enter the student name', variant: 'destructive' })
      return
    }
    setQuickAddLoading(true)
    try {
      const parts = quickAddForm.firstName.trim().split(/\s+/)
      const res = await fetch('/api/students', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          instituteId: currentInstitute?.id,
          firstName: parts[0],
          lastName: parts.slice(1).join(' ') || '',
          mobile: quickAddForm.mobile || undefined,
          grade: quickAddForm.grade || undefined,
        }),
      })
      if (res.ok) {
        toast({ title: 'Student added', description: `${quickAddForm.firstName} has been enrolled` })
        setQuickAddForm({ firstName: '', mobile: '', grade: '' })
        setQuickAddOpen(false)
        fetchStudents(1, '')
        setPage(1)
      } else {
        const err = await res.json().catch(() => ({}))
        toast({ title: 'Failed', description: err.error || 'Unknown error', variant: 'destructive' })
      }
    } catch {
      toast({ title: 'Connection error', variant: 'destructive' })
    } finally {
      setQuickAddLoading(false)
    }
  }

  // ─── Bulk actions ────────────────────────────────────────
  const handleBulkExport = () => {
    const ids = Array.from(selectedIds).join(',')
    window.open(`/api/export?type=students&instituteId=${currentInstitute?.id}&studentIds=${ids}`, '_blank')
    setSelectedIds(new Set())
  }

  const handleBulkDeactivate = async () => {
    const count = selectedIds.size
    let success = 0
    for (const id of selectedIds) {
      try {
        const res = await fetch(`/api/students/${id}`, { method: 'DELETE' })
        if (res.ok) success++
      } catch { /* skip */ }
    }
    toast({ title: `Bulk deactivation`, description: `${success} of ${count} students deactivated` })
    setSelectedIds(new Set())
    fetchStudents(page, search)
  }

  // ─── Open add dialog ─────────────────────────────────────
  const openAddDialog = () => {
    setAddForm({ ...EMPTY_FORM })
    fetchBatches()
    setAddDialogOpen(true)
  }

  // ─── Sort cycle ──────────────────────────────────────────
  const cycleSort = (field: string) => {
    if (sortBy === field) {
      setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')
    } else {
      setSortBy(field)
      setSortOrder('asc')
    }
  }

  // ─── Render helpers ──────────────────────────────────────
  const StudentCard = ({ student }: { student: Student }) => (
    <Card
      className={`cursor-pointer hover:shadow-md transition-all ${selectedIds.has(student.id) ? 'ring-2 ring-primary' : ''} ${student.status === 'inactive' ? 'opacity-60' : ''}`}
      onClick={() => handleViewStudent(student.id)}
    >
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className="flex items-center gap-2 shrink-0">
            <Checkbox
              checked={selectedIds.has(student.id)}
              onCheckedChange={() => toggleSelect(student.id)}
              onClick={(e) => e.stopPropagation()}
            />
            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${getAvatarColor(student.fullName)}`}>
              {getInitials(student.fullName)}
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <p className="font-medium text-sm truncate">{student.fullName}</p>
              <DropdownMenu>
                <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                  <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleViewStudent(student.id) }}>
                    <Eye className="h-4 w-4 mr-2" />View Details
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={(e) => openEditDialog(student, e)}>
                    <Edit3 className="h-4 w-4 mr-2" />Edit
                  </DropdownMenuItem>
                  {student.status === 'active' && (
                    <DropdownMenuItem onClick={(e) => openDeleteDialog(student, e)} className="text-destructive">
                      <Trash2 className="h-4 w-4 mr-2" />Deactivate
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            <p className="text-xs text-muted-foreground font-mono">{student.studentNumber}</p>
            <div className="flex flex-wrap items-center gap-1.5 mt-2">
              {student.grade && <Badge variant="outline" className="text-[10px] px-1.5 py-0">{student.grade}</Badge>}
              <Badge
                className={`text-[10px] px-1.5 py-0 ${student.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}
              >
                {student.status}
              </Badge>
            </div>
            {student.mobile && (
              <p className="text-xs text-muted-foreground mt-1.5 flex items-center gap-1">
                <Phone className="h-3 w-3" />{student.mobile}
              </p>
            )}
            {student.outstandingBalance > 0 && (
              <p className="text-xs text-destructive font-medium mt-1">{formatLKR(student.outstandingBalance)} outstanding</p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )

  // ─── Main Render ─────────────────────────────────────────
  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Students</h1>
          <p className="text-sm text-muted-foreground">
            {pagination.total} student{pagination.total !== 1 ? 's' : ''}
            {someSelected && ` · ${selectedIds.size} selected`}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {someSelected && (
            <div className="flex items-center gap-1 mr-2">
              <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={handleBulkExport}>
                <Download className="h-3.5 w-3.5" />Export Selected
              </Button>
              <Button variant="outline" size="sm" className="gap-1.5 text-xs text-destructive hover:text-destructive" onClick={handleBulkDeactivate}>
                <Trash2 className="h-3.5 w-3.5" />Deactivate
              </Button>
              <Button variant="ghost" size="sm" className="text-xs" onClick={() => setSelectedIds(new Set())}>
                <X className="h-3.5 w-3.5 mr-1" />Clear
              </Button>
            </div>
          )}
          <Button variant="outline" className="gap-2" onClick={() => setQuickAddOpen(!quickAddOpen)}>
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">Quick Add</span>
          </Button>
          <Button
            variant="outline"
            className="gap-2"
            onClick={() => window.open(`/api/export?type=students&instituteId=${currentInstitute?.id}`, '_blank')}
          >
            <Download className="h-4 w-4" />
            <span className="hidden sm:inline">Export</span>
          </Button>
          <Button className="gap-2" onClick={openAddDialog}>
            <UserPlus className="h-4 w-4" />
            Add Student
          </Button>
        </div>
      </div>

      {/* Quick Add Inline Form */}
      {quickAddOpen && (
        <Card className="border-dashed">
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row items-end gap-3">
              <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-3 w-full">
                <div className="space-y-1">
                  <Label className="text-xs">Full Name *</Label>
                  <Input
                    placeholder="Enter student name"
                    value={quickAddForm.firstName}
                    onChange={(e) => setQuickAddForm({ ...quickAddForm, firstName: e.target.value })}
                    onKeyDown={(e) => e.key === 'Enter' && handleQuickAdd()}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Mobile</Label>
                  <Input
                    placeholder="077 123 4567"
                    value={quickAddForm.mobile}
                    onChange={(e) => setQuickAddForm({ ...quickAddForm, mobile: e.target.value })}
                    onKeyDown={(e) => e.key === 'Enter' && handleQuickAdd()}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Grade</Label>
                  <Select value={quickAddForm.grade} onValueChange={(v) => setQuickAddForm({ ...quickAddForm, grade: v })}>
                    <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>
                      {GRADE_OPTIONS.map((g) => <SelectItem key={g} value={g}>{g}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex gap-2 shrink-0">
                <Button size="sm" onClick={handleQuickAdd} disabled={quickAddLoading}>
                  {quickAddLoading ? 'Adding...' : 'Add'}
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setQuickAddOpen(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, student number, mobile, school..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1) }}
            className="pl-9"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1) }}>
            <SelectTrigger className="w-[130px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
            </SelectContent>
          </Select>
          <Select value={gradeFilter} onValueChange={(v) => { setGradeFilter(v); setPage(1) }}>
            <SelectTrigger className="w-[130px]">
              <SelectValue placeholder="Grade" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Grades</SelectItem>
              {availableGrades.map((g) => (
                <SelectItem key={g} value={g!}>{g}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={districtFilter} onValueChange={(v) => { setDistrictFilter(v); setPage(1) }}>
            <SelectTrigger className="w-[130px]">
              <SelectValue placeholder="District" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Districts</SelectItem>
              {availableDistricts.map((d) => (
                <SelectItem key={d} value={d!}>{d}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={`${sortBy}-${sortOrder}`}
            onValueChange={(v) => {
              const [field, order] = v.split('-')
              setSortBy(field)
              setSortOrder(order)
            }}
          >
            <SelectTrigger className="w-[130px]">
              <ArrowUpDown className="h-3.5 w-3.5 mr-1" />
              <SelectValue placeholder="Sort" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="createdAt-desc">Newest First</SelectItem>
              <SelectItem value="createdAt-asc">Oldest First</SelectItem>
              <SelectItem value="fullName-asc">Name A-Z</SelectItem>
              <SelectItem value="fullName-desc">Name Z-A</SelectItem>
              <SelectItem value="outstandingBalance-desc">Highest Owed</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Active filter pills + view toggle */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 flex-wrap">
          {hasActiveFilters && (
            <Button variant="ghost" size="sm" className="h-7 text-xs text-muted-foreground" onClick={clearFilters}>
              <X className="h-3 w-3 mr-1" />Clear all
            </Button>
          )}
          {search && (
            <Badge variant="secondary" className="gap-1 text-xs">
              Search: &quot;{search}&quot;
              <button onClick={() => { setSearch(''); setPage(1) }}><X className="h-3 w-3 ml-0.5" /></button>
            </Badge>
          )}
          {statusFilter !== 'all' && (
            <Badge variant="secondary" className="gap-1 text-xs">
              Status: {statusFilter}
              <button onClick={() => { setStatusFilter('all'); setPage(1) }}><X className="h-3 w-3 ml-0.5" /></button>
            </Badge>
          )}
          {gradeFilter !== 'all' && (
            <Badge variant="secondary" className="gap-1 text-xs">
              Grade: {gradeFilter}
              <button onClick={() => { setGradeFilter('all'); setPage(1) }}><X className="h-3 w-3 ml-0.5" /></button>
            </Badge>
          )}
          {districtFilter !== 'all' && (
            <Badge variant="secondary" className="gap-1 text-xs">
              District: {districtFilter}
              <button onClick={() => { setDistrictFilter('all'); setPage(1) }}><X className="h-3 w-3 ml-0.5" /></button>
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant={viewMode === 'table' ? 'default' : 'ghost'}
            size="icon"
            className="h-8 w-8"
            onClick={() => setViewMode('table')}
          >
            <List className="h-4 w-4" />
          </Button>
          <Button
            variant={viewMode === 'card' ? 'default' : 'ghost'}
            size="icon"
            className="h-8 w-8"
            onClick={() => setViewMode('card')}
          >
            <LayoutGrid className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* TABLE VIEW */}
      {viewMode === 'table' && (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10">
                      <Checkbox checked={allSelected} onCheckedChange={toggleSelectAll} />
                    </TableHead>
                    <TableHead className="w-28 cursor-pointer select-none" onClick={() => cycleSort('studentNumber')}>
                      <div className="flex items-center gap-1">No. <ArrowUpDown className="h-3 w-3" /></div>
                    </TableHead>
                    <TableHead className="cursor-pointer select-none" onClick={() => cycleSort('fullName')}>
                      <div className="flex items-center gap-1">Name <ArrowUpDown className="h-3 w-3" /></div>
                    </TableHead>
                    <TableHead className="hidden sm:table-cell cursor-pointer select-none" onClick={() => cycleSort('grade')}>
                      <div className="flex items-center gap-1">Grade <ArrowUpDown className="h-3 w-3" /></div>
                    </TableHead>
                    <TableHead className="hidden md:table-cell">School</TableHead>
                    <TableHead className="hidden lg:table-cell">District</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right hidden sm:table-cell cursor-pointer select-none" onClick={() => cycleSort('outstandingBalance')}>
                      <div className="flex items-center justify-end gap-1">Outstanding <ArrowUpDown className="h-3 w-3" /></div>
                    </TableHead>
                    <TableHead className="w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <TableRow key={i}>
                        <TableCell><Skeleton className="h-4 w-4" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                        <TableCell className="hidden sm:table-cell"><Skeleton className="h-4 w-12" /></TableCell>
                        <TableCell className="hidden md:table-cell"><Skeleton className="h-4 w-24" /></TableCell>
                        <TableCell className="hidden lg:table-cell"><Skeleton className="h-4 w-16" /></TableCell>
                        <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                        <TableCell className="hidden sm:table-cell"><Skeleton className="h-4 w-20" /></TableCell>
                      </TableRow>
                    ))
                  ) : students.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center py-16">
                        <div className="flex flex-col items-center gap-3">
                          <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
                            <GraduationCap className="h-8 w-8 text-muted-foreground/50" />
                          </div>
                          <div>
                            <p className="font-medium text-muted-foreground">
                              {pagination.total === 0 ? 'No students yet' : 'No students match your filters'}
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                              {pagination.total === 0
                                ? 'Add your first student to get started'
                                : 'Try adjusting your search or filters'}
                            </p>
                          </div>
                          {pagination.total === 0 && (
                            <div className="flex gap-2 mt-1">
                              <Button size="sm" onClick={openAddDialog}>
                                <UserPlus className="h-4 w-4 mr-1.5" />Add Student
                              </Button>
                            </div>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    students.map((student) => (
                      <TableRow
                        key={student.id}
                        className={`cursor-pointer hover:bg-muted/50 ${selectedIds.has(student.id) ? 'bg-primary/5' : ''} ${student.status === 'inactive' ? 'opacity-60' : ''}`}
                        onClick={() => handleViewStudent(student.id)}
                      >
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          <Checkbox checked={selectedIds.has(student.id)} onCheckedChange={() => toggleSelect(student.id)} />
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground font-mono">{student.studentNumber}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${getAvatarColor(student.fullName)}`}>
                              {getInitials(student.fullName)}
                            </div>
                            <div className="min-w-0">
                              <p className="font-medium text-sm truncate">{student.fullName}</p>
                              <p className="text-xs text-muted-foreground hidden sm:block">{student.mobile || student.user?.email || ''}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="hidden sm:table-cell">
                          {student.grade ? <Badge variant="outline" className="text-xs">{student.grade}</Badge> : <span className="text-xs text-muted-foreground">-</span>}
                        </TableCell>
                        <TableCell className="hidden md:table-cell text-sm text-muted-foreground max-w-[160px] truncate">
                          {student.schoolName || '-'}
                        </TableCell>
                        <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">
                          {student.district || '-'}
                        </TableCell>
                        <TableCell>
                          <Badge
                            className={`text-xs ${student.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}
                          >
                            {student.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right hidden sm:table-cell">
                          <span className={student.outstandingBalance > 0 ? 'text-destructive font-medium text-sm' : 'text-muted-foreground text-sm'}>
                            {student.outstandingBalance > 0 ? formatLKR(student.outstandingBalance) : '-'}
                          </span>
                        </TableCell>
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleViewStudent(student.id)}>
                                <Eye className="h-4 w-4 mr-2" />View Details
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={(e) => openEditDialog(student, e)}>
                                <Edit3 className="h-4 w-4 mr-2" />Edit
                              </DropdownMenuItem>
                              {student.status === 'active' && (
                                <>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem onClick={(e) => openDeleteDialog(student, e)} className="text-destructive">
                                    <Trash2 className="h-4 w-4 mr-2" />Deactivate
                                  </DropdownMenuItem>
                                </>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Pagination */}
            {pagination.totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t">
                <p className="text-xs text-muted-foreground">
                  Showing {(pagination.page - 1) * pagination.limit + 1}-{Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total}
                </p>
                <div className="flex items-center gap-1">
                  <Button variant="outline" size="icon" className="h-8 w-8" disabled={pagination.page <= 1} onClick={() => setPage(p => p - 1)}>
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  {Array.from({ length: Math.min(pagination.totalPages, 5) }, (_, i) => {
                    let pageNum: number
                    if (pagination.totalPages <= 5) pageNum = i + 1
                    else if (pagination.page <= 3) pageNum = i + 1
                    else if (pagination.page >= pagination.totalPages - 2) pageNum = pagination.totalPages - 4 + i
                    else pageNum = pagination.page - 2 + i
                    return (
                      <Button key={pageNum} variant={pagination.page === pageNum ? 'default' : 'outline'} size="icon" className="h-8 w-8" onClick={() => setPage(pageNum)}>
                        {pageNum}
                      </Button>
                    )
                  })}
                  <Button variant="outline" size="icon" className="h-8 w-8" disabled={pagination.page >= pagination.totalPages} onClick={() => setPage(p => p + 1)}>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* CARD VIEW */}
      {viewMode === 'card' && (
        <>
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <Card key={i}><CardContent className="p-4"><Skeleton className="h-20 w-full" /></CardContent></Card>
              ))}
            </div>
          ) : students.length === 0 ? (
            <Card>
              <CardContent className="py-16 text-center">
                <div className="flex flex-col items-center gap-3">
                  <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
                    <GraduationCap className="h-8 w-8 text-muted-foreground/50" />
                  </div>
                  <div>
                    <p className="font-medium text-muted-foreground">
                      {pagination.total === 0 ? 'No students yet' : 'No students match your filters'}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {pagination.total === 0 ? 'Add your first student to get started' : 'Try adjusting your search or filters'}
                    </p>
                  </div>
                  {pagination.total === 0 && (
                    <Button size="sm" onClick={openAddDialog}>
                      <UserPlus className="h-4 w-4 mr-1.5" />Add Student
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {students.map((student) => <StudentCard key={student.id} student={student} />)}
            </div>
          )}

          {/* Card pagination */}
          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">
                Showing {(pagination.page - 1) * pagination.limit + 1}-{Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total}
              </p>
              <div className="flex items-center gap-1">
                <Button variant="outline" size="icon" className="h-8 w-8" disabled={pagination.page <= 1} onClick={() => setPage(p => p - 1)}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                {Array.from({ length: Math.min(pagination.totalPages, 5) }, (_, i) => {
                  let pageNum: number
                  if (pagination.totalPages <= 5) pageNum = i + 1
                  else if (pagination.page <= 3) pageNum = i + 1
                  else if (pagination.page >= pagination.totalPages - 2) pageNum = pagination.totalPages - 4 + i
                  else pageNum = pagination.page - 2 + i
                  return (
                    <Button key={pageNum} variant={pagination.page === pageNum ? 'default' : 'outline'} size="icon" className="h-8 w-8" onClick={() => setPage(pageNum)}>
                      {pageNum}
                    </Button>
                  )
                })}
                <Button variant="outline" size="icon" className="h-8 w-8" disabled={pagination.page >= pagination.totalPages} onClick={() => setPage(p => p + 1)}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      {/* ─── ADD STUDENT DIALOG ─── */}
      <Dialog open={addDialogOpen} onOpenChange={(open) => { setAddDialogOpen(open); if (!open) setAddForm({ ...EMPTY_FORM }) }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Add New Student</DialogTitle>
            <DialogDescription>Enroll a new student to your institute</DialogDescription>
          </DialogHeader>
          <StudentForm form={addForm} setForm={setAddForm} batches={batches} mode="add" />
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddDialogOpen(false)}>Cancel</Button>
            <Button onClick={() => handleAddStudent(false)} disabled={addLoading}>
              {addLoading ? 'Adding...' : 'Add Student'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── EDIT STUDENT DIALOG ─── */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Student</DialogTitle>
            <DialogDescription>Update student information</DialogDescription>
          </DialogHeader>
          <StudentForm form={editForm} setForm={setEditForm} batches={[]} mode="edit" />
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleEditStudent} disabled={editLoading}>
              {editLoading ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── DELETE CONFIRMATION DIALOG ─── */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Deactivate Student</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to deactivate <strong>{studentToDelete?.fullName}</strong>?
              <br /><br />
              This will deactivate the student and their batch enrollments. All payment and attendance history will be preserved.
              The student can be reactivated later if needed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteStudent}
              disabled={deleteLoading}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteLoading ? 'Deactivating...' : 'Deactivate Student'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ─── DUPLICATE DETECTION DIALOG ─── */}
      <Dialog open={duplicateDialogOpen} onOpenChange={setDuplicateDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Possible Duplicate Found
            </DialogTitle>
            <DialogDescription>
              A student with a similar mobile number already exists. Please review below.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            {duplicateStudents.map((dup) => (
              <div key={dup.id} className="flex items-center justify-between p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <div>
                  <p className="font-medium text-sm">{dup.fullName}</p>
                  <p className="text-xs text-muted-foreground">{dup.studentNumber} · {dup.mobile}</p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setDuplicateDialogOpen(false)
                    handleViewStudent(dup.id)
                  }}
                >
                  View
                </Button>
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDuplicateDialogOpen(false)}>Go Back</Button>
            <Button onClick={handleForceAdd}>Continue Adding</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
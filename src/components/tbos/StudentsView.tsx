'use client'

import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { useAppStore } from '@/lib/store'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
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
  Search,
  Plus,
  MoreHorizontal,
  Eye,
  Pencil,
  Trash2,
  GraduationCap,
  Download,
  UserPlus,
  ChevronLeft,
  ChevronRight,
  Loader2,
  X,
  LayoutGrid,
  List,
  ArrowUpDown,
  Keyboard,
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

// ── Types ───────────────────────────────────────────────────────────────────

interface StudentUser {
  id: string
  email: string
  profilePhoto: string | null
}

interface StudentBranch {
  id: string
  name: string
  city: string
}

interface Student {
  id: string
  studentNumber: string
  fullName: string
  gender: string | null
  grade: string | null
  schoolName: string | null
  district: string | null
  status: string
  mobile: string | null
  email: string | null
  outstandingBalance: number
  branchId: string | null
  userId: string | null
  user: StudentUser | null
  branch: StudentBranch | null
  createdAt: string
}

interface Pagination {
  page: number
  limit: number
  total: number
  totalPages: number
}

interface AddForm {
  firstName: string
  lastName: string
  gender: string
  dateOfBirth: string
  mobile: string
  whatsapp: string
  email: string
  addressLine1: string
  city: string
  district: string
  schoolName: string
  grade: string
  stream: string
  examYear: string
}

const EMPTY_FORM: AddForm = {
  firstName: '',
  lastName: '',
  gender: '',
  dateOfBirth: '',
  mobile: '',
  whatsapp: '',
  email: '',
  addressLine1: '',
  city: '',
  district: '',
  schoolName: '',
  grade: '',
  stream: '',
  examYear: '',
}

const GRADE_OPTIONS = [
  'Grade 6',
  'Grade 7',
  'Grade 8',
  'Grade 9',
  'Grade 10',
  'Grade 11',
  'O/L',
  'A/L',
]

const STREAM_OPTIONS = ['Maths', 'Bio', 'Commerce', 'Arts', 'Technology']
const PAGE_SIZE = 20

type SortOption = 'newest' | 'oldest' | 'name-asc' | 'name-desc'
type ViewMode = 'list' | 'grid'

// ── Helper: page numbers with ellipsis ──────────────────────────────────────

function getPageNumbers(current: number, total: number): (number | -1)[] {
  if (total <= 5) return Array.from({ length: total }, (_, i) => i + 1)
  if (current <= 3) return [1, 2, 3, 4, -1, total]
  if (current >= total - 2) return [1, -1, total - 3, total - 2, total - 1, total]
  return [1, -1, current - 1, current, current + 1, -1, total]
}

// ── Component ───────────────────────────────────────────────────────────────

export default function StudentsView() {
  const { currentInstitute, setActiveView, setSelectedStudentId } = useAppStore()
  const { toast } = useToast()
  const instituteId = currentInstitute?.id

  // Data state
  const [students, setStudents] = useState<Student[]>([])
  const [loading, setLoading] = useState(true)
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: PAGE_SIZE,
    total: 0,
    totalPages: 0,
  })
  const [allGrades, setAllGrades] = useState<string[]>([])
  const [allDistricts, setAllDistricts] = useState<string[]>([])

  // Filter state
  const [searchInput, setSearchInput] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [gradeFilter, setGradeFilter] = useState<string>('all')
  const [districtFilter, setDistrictFilter] = useState<string>('all')
  const [sortBy, setSortBy] = useState<SortOption>('newest')
  const [page, setPage] = useState(1)

  // Selection state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  // View mode
  const [viewMode, setViewMode] = useState<ViewMode>('list')

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false)
  const [formTab, setFormTab] = useState('personal')
  const [addForm, setAddForm] = useState<AddForm>(EMPTY_FORM)
  const [submitting, setSubmitting] = useState(false)

  // Debounce timer ref
  const debounceRef = useRef<NodeJS.Timeout | null>(null)

  // ── Fetch students from API ─────────────────────────────────────────────

  const fetchStudents = useCallback(async () => {
    if (!instituteId) return
    setLoading(true)
    try {
      const params = new URLSearchParams({
        instituteId,
        page: String(page),
        limit: String(PAGE_SIZE),
      })
      if (searchQuery) params.set('search', searchQuery)
      if (statusFilter !== 'all') params.set('status', statusFilter)

      const res = await fetch(`/api/students?${params.toString()}`)
      if (res.ok) {
        const data = await res.json()
        const fetched: Student[] = data.students || []
        setStudents(fetched)
        setPagination(data.pagination || { page: 1, limit: PAGE_SIZE, total: 0, totalPages: 0 })

        // Accumulate unique grades and districts
        setAllGrades((prev) => {
          const existing = new Set(prev)
          const newGrades = fetched
            .map((s) => s.grade)
            .filter((g): g is string => Boolean(g) && !existing.has(g))
          return [...new Set([...prev, ...newGrades])]
        })
        setAllDistricts((prev) => {
          const existing = new Set(prev)
          const newDistricts = fetched
            .map((s) => s.district)
            .filter((d): d is string => Boolean(d) && !existing.has(d))
          return [...new Set([...prev, ...newDistricts])]
        })
      }
    } catch {
      toast({ title: 'Error', description: 'Failed to load students', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }, [instituteId, searchQuery, statusFilter, page, toast])

  // Re-fetch when filters/page change
  useEffect(() => {
    fetchStudents()
  }, [fetchStudents])

  // Debounce search input
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      setSearchQuery(searchInput)
      setPage(1)
    }, 400)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [searchInput])

  // Reset page when filters change
  useEffect(() => { setPage(1) }, [statusFilter])

  // ── Client-side grade + district filtering + sorting ────────────────────

  const displayedStudents = useMemo(() => {
    let result = students
    if (gradeFilter !== 'all') {
      result = result.filter((s) => s.grade === gradeFilter)
    }
    if (districtFilter !== 'all') {
      result = result.filter((s) => s.district === districtFilter)
    }
    // Client-side sort
    switch (sortBy) {
      case 'oldest':
        result = [...result].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
        break
      case 'name-asc':
        result = [...result].sort((a, b) => a.fullName.localeCompare(b.fullName))
        break
      case 'name-desc':
        result = [...result].sort((a, b) => b.fullName.localeCompare(a.fullName))
        break
      case 'newest':
      default:
        // already sorted newest from API
        break
    }
    return result
  }, [students, gradeFilter, districtFilter, sortBy])

  const hasActiveFilters =
    searchQuery !== '' || statusFilter !== 'all' || gradeFilter !== 'all' || districtFilter !== 'all'

  const effectiveTotal = gradeFilter !== 'all' || districtFilter !== 'all'
    ? displayedStudents.length
    : pagination.total

  const effectiveTotalPages = gradeFilter !== 'all' || districtFilter !== 'all'
    ? 1
    : pagination.totalPages

  const startIdx = (page - 1) * PAGE_SIZE + 1
  const endIdx = Math.min(page * PAGE_SIZE, effectiveTotal)

  // ── Selection ────────────────────────────────────────────────────────────

  const allSelected = displayedStudents.length > 0 &&
    displayedStudents.every((s) => selectedIds.has(s.id))

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(displayedStudents.map((s) => s.id)))
    }
  }

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const clearSelection = () => setSelectedIds(new Set())

  // ── Actions ─────────────────────────────────────────────────────────────

  const handleViewStudent = (id: string) => {
    setSelectedStudentId(id)
    setActiveView('student-detail')
  }

  const handleEditStudent = (id: string) => {
    setSelectedStudentId(id)
    setActiveView('student-detail')
  }

  const handleDeactivateStudent = async (id: string) => {
    try {
      const res = await fetch(`/api/students/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'inactive' }),
      })
      if (res.ok) {
        toast({ title: 'Student deactivated' })
        fetchStudents()
      }
    } catch {
      toast({ title: 'Error', description: 'Failed to deactivate student', variant: 'destructive' })
    }
  }

  const handleBulkDeactivate = async () => {
    if (selectedIds.size === 0) return
    try {
      await Promise.all(
        Array.from(selectedIds).map((id) =>
          fetch(`/api/students/${id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: 'inactive' }),
          })
        )
      )
      toast({ title: `${selectedIds.size} student(s) deactivated` })
      setSelectedIds(new Set())
      fetchStudents()
    } catch {
      toast({ title: 'Error', description: 'Bulk deactivation failed', variant: 'destructive' })
    }
  }

  const clearFilters = () => {
    setSearchInput('')
    setSearchQuery('')
    setStatusFilter('all')
    setGradeFilter('all')
    setDistrictFilter('all')
    setSortBy('newest')
    setPage(1)
  }

  // ── Export CSV ───────────────────────────────────────────────────────────

  const exportCSV = (exportSelected = false) => {
    const dataToExport = exportSelected
      ? displayedStudents.filter((s) => selectedIds.has(s.id))
      : displayedStudents

    if (dataToExport.length === 0) {
      toast({ title: 'No data to export' })
      return
    }

    const rows = dataToExport.map((s) => [
      s.studentNumber,
      s.fullName,
      s.gender || '',
      s.grade || '',
      s.schoolName || '',
      s.district || '',
      s.mobile || '',
      s.email || '',
      s.status,
      s.outstandingBalance?.toFixed(2) || '0.00',
    ])
    const header = ['Student No.', 'Name', 'Gender', 'Grade', 'School', 'District', 'Mobile', 'Email', 'Status', 'Outstanding']
      .map((cell) => `"${cell}"`)
      .join(',')
    const dataRows = rows.map((row) =>
      row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')
    )
    const csvContent = [header, ...dataRows].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `students_${new Date().toISOString().slice(0, 10)}.csv`
    link.click()
    URL.revokeObjectURL(url)
    toast({ title: 'Export complete' })
  }

  // ── Add Student ─────────────────────────────────────────────────────────

  const handleAddStudent = async () => {
    if (!addForm.firstName || !addForm.lastName) {
      toast({ title: 'Missing fields', description: 'First name and last name are required', variant: 'destructive' })
      return
    }
    setSubmitting(true)
    try {
      const res = await fetch('/api/students', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...addForm, instituteId }),
      })
      if (res.ok) {
        toast({ title: 'Student added successfully' })
        setDialogOpen(false)
        setAddForm(EMPTY_FORM)
        setFormTab('personal')
        fetchStudents()
      } else {
        const err = await res.json()
        toast({ title: 'Error', description: err.error || 'Failed to add student', variant: 'destructive' })
      }
    } catch {
      toast({ title: 'Error', description: 'Failed to add student', variant: 'destructive' })
    } finally {
      setSubmitting(false)
    }
  }

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="space-y-4">
      {/* Page Header */}
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold tracking-tight">Students</h1>
        <p className="text-sm text-muted-foreground">
          {pagination.total} student{pagination.total !== 1 ? 's' : ''}
          {selectedIds.size > 0 && (
            <span className="text-primary font-medium"> · {selectedIds.size} selected</span>
          )}
        </p>
      </div>

      {/* Bulk action bar (shown when items selected) */}
      {selectedIds.size > 0 && (
        <div className="flex items-center gap-2 p-2 rounded-lg bg-primary/5 border border-primary/20">
          <Button
            variant="ghost"
            size="sm"
            className="gap-1.5 text-sm"
            onClick={() => exportCSV(true)}
          >
            <Download className="h-4 w-4" />
            Export Selected
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="gap-1.5 text-sm text-destructive hover:text-destructive"
            onClick={handleBulkDeactivate}
          >
            <Trash2 className="h-4 w-4" />
            Deactivate
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="gap-1.5 text-sm"
            onClick={clearSelection}
          >
            <X className="h-4 w-4" />
            Clear
          </Button>
        </div>
      )}

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        {/* Action buttons */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setDialogOpen(true)}>
            <Plus className="h-4 w-4" />
            Quick Add
          </Button>
          <Button variant="outline" size="sm" className="gap-1.5" onClick={() => exportCSV(false)}>
            <Download className="h-4 w-4" />
            Export
          </Button>
          <Button size="sm" className="gap-1.5" onClick={() => setDialogOpen(true)}>
            <UserPlus className="h-4 w-4" />
            Add Student
          </Button>
        </div>

        <div className="flex-1 w-full sm:w-auto" />

        {/* View toggle */}
        <div className="flex items-center border rounded-md">
          <Button
            variant={viewMode === 'list' ? 'secondary' : 'ghost'}
            size="icon"
            className="h-8 w-8"
            onClick={() => setViewMode('list')}
          >
            <List className="h-4 w-4" />
          </Button>
          <Button
            variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
            size="icon"
            className="h-8 w-8"
            onClick={() => setViewMode('grid')}
          >
            <LayoutGrid className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
        <div className="relative flex-1 w-full sm:max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, student number, mobile, school..."
            className="pl-9 h-9"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1) }}>
            <SelectTrigger className="w-[130px] h-9">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
            </SelectContent>
          </Select>
          <Select value={gradeFilter} onValueChange={(v) => { setGradeFilter(v); setPage(1) }}>
            <SelectTrigger className="w-[130px] h-9">
              <SelectValue placeholder="Grade" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Grades</SelectItem>
              {[...new Set(allGrades)].map((g) => (
                <SelectItem key={`grade-filter-${g}`} value={g}>
                  {g}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={districtFilter} onValueChange={(v) => { setDistrictFilter(v); setPage(1) }}>
            <SelectTrigger className="w-[140px] h-9">
              <SelectValue placeholder="District" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Districts</SelectItem>
              {[...new Set(allDistricts)].map((d) => (
                <SelectItem key={`district-filter-${d}`} value={d}>
                  {d}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortOption)}>
            <SelectTrigger className="w-[120px] h-9">
              <ArrowUpDown className="h-3.5 w-3.5 mr-1 text-muted-foreground" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">Newest</SelectItem>
              <SelectItem value="oldest">Oldest</SelectItem>
              <SelectItem value="name-asc">Name A-Z</SelectItem>
              <SelectItem value="name-desc">Name Z-A</SelectItem>
            </SelectContent>
          </Select>
          {hasActiveFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters} className="text-xs gap-1">
              <X className="h-3 w-3" />
              Clear
            </Button>
          )}
        </div>
      </div>

      {/* ── LIST VIEW ──────────────────────────────────────────────────────── */}
      {viewMode === 'list' && (
        <Card>
          <CardContent className="p-0">
            <div className="max-h-[520px] overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[40px] pl-4">
                      <Checkbox
                        checked={allSelected}
                        onCheckedChange={toggleSelectAll}
                        aria-label="Select all"
                      />
                    </TableHead>
                    <TableHead className="w-[90px]">No.</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead className="hidden sm:table-cell">Grade</TableHead>
                    <TableHead className="hidden lg:table-cell">School</TableHead>
                    <TableHead className="hidden md:table-cell">District</TableHead>
                    <TableHead className="hidden sm:table-cell">Status</TableHead>
                    <TableHead className="hidden md:table-cell text-right">Outstanding</TableHead>
                    <TableHead className="w-10"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    Array.from({ length: 8 }).map((_, i) => (
                      <TableRow key={`skeleton-${i}`}>
                        <TableCell><Skeleton className="h-4 w-4" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Skeleton className="h-8 w-8 rounded-full shrink-0" />
                            <div className="space-y-1">
                              <Skeleton className="h-4 w-28" />
                              <Skeleton className="h-3 w-20" />
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="hidden sm:table-cell"><Skeleton className="h-5 w-14" /></TableCell>
                        <TableCell className="hidden lg:table-cell"><Skeleton className="h-4 w-24" /></TableCell>
                        <TableCell className="hidden md:table-cell"><Skeleton className="h-4 w-16" /></TableCell>
                        <TableCell className="hidden sm:table-cell"><Skeleton className="h-5 w-14" /></TableCell>
                        <TableCell className="hidden md:table-cell"><Skeleton className="h-4 w-16 text-right" /></TableCell>
                        <TableCell><Skeleton className="h-8 w-8" /></TableCell>
                      </TableRow>
                    ))
                  ) : displayedStudents.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center py-12">
                        <GraduationCap className="h-10 w-10 mx-auto mb-2 text-muted-foreground/30" />
                        <p className="text-sm font-medium text-muted-foreground">
                          {hasActiveFilters ? 'No matching students' : 'No students yet'}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {hasActiveFilters
                            ? 'Try adjusting your search or filters'
                            : 'Click "Add Student" to enroll your first student'}
                        </p>
                        {hasActiveFilters && (
                          <Button variant="outline" size="sm" className="mt-3" onClick={clearFilters}>
                            Clear Filters
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ) : (
                    displayedStudents.map((student) => {
                      const initials = student.fullName
                        .split(' ')
                        .map((n) => n[0])
                        .join('')
                        .slice(0, 2)
                        .toUpperCase()

                      return (
                        <TableRow
                          key={student.id}
                          className="cursor-pointer hover:bg-muted/50"
                          onClick={() => handleViewStudent(student.id)}
                        >
                          <TableCell className="pl-4" onClick={(e) => e.stopPropagation()}>
                            <Checkbox
                              checked={selectedIds.has(student.id)}
                              onCheckedChange={() => toggleSelect(student.id)}
                              aria-label={`Select ${student.fullName}`}
                            />
                          </TableCell>
                          <TableCell className="font-mono text-xs text-muted-foreground">
                            {student.studentNumber}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-bold shrink-0">
                                {initials}
                              </div>
                              <div className="min-w-0">
                                <p className="font-medium text-sm truncate">{student.fullName}</p>
                                <p className="text-xs text-muted-foreground hidden sm:block truncate">
                                  {student.branch?.name || student.user?.email || ''}
                                </p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="hidden sm:table-cell">
                            {student.grade ? (
                              <Badge variant="outline" className="text-xs font-medium">
                                {student.grade}
                              </Badge>
                            ) : (
                              <span className="text-sm text-muted-foreground">—</span>
                            )}
                          </TableCell>
                          <TableCell className="hidden lg:table-cell">
                            <span className="text-sm text-muted-foreground truncate block max-w-[160px]">
                              {student.schoolName || '—'}
                            </span>
                          </TableCell>
                          <TableCell className="hidden md:table-cell">
                            <span className="text-sm text-muted-foreground">
                              {student.district || '—'}
                            </span>
                          </TableCell>
                          <TableCell className="hidden sm:table-cell">
                            <Badge
                              variant={student.status === 'active' ? 'default' : 'secondary'}
                              className={`text-xs capitalize ${
                                student.status === 'active'
                                  ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                                  : 'bg-muted text-muted-foreground'
                              }`}
                            >
                              {student.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="hidden md:table-cell text-right">
                            <span className={`text-sm font-medium ${
                              (student.outstandingBalance ?? 0) > 0
                                ? 'text-destructive'
                                : 'text-muted-foreground'
                            }`}>
                              {(student.outstandingBalance ?? 0) > 0
                                ? `Rs. ${student.outstandingBalance.toLocaleString()}`
                                : '—'}
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
                                  <Eye className="h-4 w-4 mr-2" />
                                  View Details
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleEditStudent(student.id)}>
                                  <Pencil className="h-4 w-4 mr-2" />
                                  Edit
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onClick={() => handleDeactivateStudent(student.id)}
                                  className="text-destructive focus:text-destructive"
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Deactivate
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      )
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── GRID VIEW ──────────────────────────────────────────────────────── */}
      {viewMode === 'grid' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {loading ? (
            Array.from({ length: 8 }).map((_, i) => (
              <Card key={`grid-skeleton-${i}`}>
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center gap-3">
                    <Skeleton className="h-10 w-10 rounded-full shrink-0" />
                    <div className="space-y-1.5 flex-1">
                      <Skeleton className="h-4 w-28" />
                      <Skeleton className="h-3 w-20" />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Skeleton className="h-5 w-12" />
                    <Skeleton className="h-5 w-16" />
                  </div>
                </CardContent>
              </Card>
            ))
          ) : displayedStudents.length === 0 ? (
            <div className="col-span-full text-center py-12">
              <GraduationCap className="h-10 w-10 mx-auto mb-2 text-muted-foreground/30" />
              <p className="text-sm font-medium text-muted-foreground">
                {hasActiveFilters ? 'No matching students' : 'No students yet'}
              </p>
            </div>
          ) : (
            displayedStudents.map((student) => {
              const initials = student.fullName
                .split(' ')
                .map((n) => n[0])
                .join('')
                .slice(0, 2)
                .toUpperCase()

              return (
                <Card
                  key={student.id}
                  className="cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => handleViewStudent(student.id)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-bold shrink-0">
                          {initials}
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium text-sm truncate">{student.fullName}</p>
                          <p className="text-xs text-muted-foreground font-mono">{student.studentNumber}</p>
                        </div>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                          <Button variant="ghost" size="icon" className="h-7 w-7">
                            <MoreHorizontal className="h-3.5 w-3.5" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleViewStudent(student.id) }}>
                            <Eye className="h-4 w-4 mr-2" />
                            View
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleEditStudent(student.id) }}>
                            <Pencil className="h-4 w-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={(e) => { e.stopPropagation(); handleDeactivateStudent(student.id) }}
                            className="text-destructive focus:text-destructive"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Deactivate
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {student.grade && (
                        <Badge variant="outline" className="text-xs">{student.grade}</Badge>
                      )}
                      {student.district && (
                        <Badge variant="secondary" className="text-xs">{student.district}</Badge>
                      )}
                      <Badge
                        className={`text-xs capitalize ${
                          student.status === 'active'
                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                            : 'bg-muted text-muted-foreground'
                        }`}
                      >
                        {student.status}
                      </Badge>
                    </div>
                    {(student.outstandingBalance ?? 0) > 0 && (
                      <p className="text-xs text-destructive mt-2 font-medium">
                        Outstanding: Rs. {student.outstandingBalance.toLocaleString()}
                      </p>
                    )}
                  </CardContent>
                </Card>
              )
            })
          )}
        </div>
      )}

      {/* Pagination (list view) */}
      {!loading && effectiveTotal > 0 && viewMode === 'list' && gradeFilter === 'all' && districtFilter === 'all' && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground">
            Showing{' '}
            <span className="font-medium text-foreground">{startIdx}–{endIdx}</span>
            {' '}of{' '}
            <span className="font-medium text-foreground">{effectiveTotal}</span> students
          </p>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            {getPageNumbers(page, effectiveTotalPages).map((p, idx) =>
              p < 0 ? (
                <span key={`ellipsis-${idx}`} className="px-1 text-muted-foreground text-sm">
                  ...
                </span>
              ) : (
                <Button
                  key={`page-${p}`}
                  variant={page === p ? 'default' : 'outline'}
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setPage(p)}
                >
                  {p}
                </Button>
              )
            )}
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              disabled={page >= effectiveTotalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Client-side filter indicator */}
      {!loading && (gradeFilter !== 'all' || districtFilter !== 'all') && displayedStudents.length > 0 && (
        <p className="text-sm text-muted-foreground text-center">
          Showing {displayedStudents.length} student{displayedStudents.length !== 1 ? 's' : ''}
          {gradeFilter !== 'all' && (
            <> in <Badge variant="outline" className="text-xs mx-1">{gradeFilter}</Badge></>
          )}
          {districtFilter !== 'all' && (
            <> from <Badge variant="outline" className="text-xs mx-1">{districtFilter}</Badge></>
          )}
          {hasActiveFilters && (
            <button className="text-primary hover:underline ml-1 text-sm" onClick={clearFilters}>
              Clear filters
            </button>
          )}
        </p>
      )}

      {/* ── Add Student Dialog ─────────────────────────────────────────────── */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add New Student</DialogTitle>
            <DialogDescription>
              Fill in the student details. Fields marked with * are required.
            </DialogDescription>
          </DialogHeader>

          <Tabs value={formTab} onValueChange={setFormTab}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="personal">Personal</TabsTrigger>
              <TabsTrigger value="academic">Academic</TabsTrigger>
              <TabsTrigger value="contact">Contact</TabsTrigger>
            </TabsList>

            {/* Personal Tab */}
            <TabsContent value="personal" className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>First Name *</Label>
                  <Input
                    placeholder="e.g. Hiruni"
                    value={addForm.firstName}
                    onChange={(e) => setAddForm({ ...addForm, firstName: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Last Name *</Label>
                  <Input
                    placeholder="e.g. Dissanayake"
                    value={addForm.lastName}
                    onChange={(e) => setAddForm({ ...addForm, lastName: e.target.value })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Gender</Label>
                  <Select
                    value={addForm.gender}
                    onValueChange={(v) => setAddForm({ ...addForm, gender: v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="male">Male</SelectItem>
                      <SelectItem value="female">Female</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Date of Birth</Label>
                  <Input
                    type="date"
                    value={addForm.dateOfBirth}
                    onChange={(e) => setAddForm({ ...addForm, dateOfBirth: e.target.value })}
                  />
                </div>
              </div>
            </TabsContent>

            {/* Academic Tab */}
            <TabsContent value="academic" className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Grade Level</Label>
                  <Select
                    value={addForm.grade}
                    onValueChange={(v) => setAddForm({ ...addForm, grade: v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent>
                      {GRADE_OPTIONS.map((g) => (
                        <SelectItem key={`form-grade-${g}`} value={g}>
                          {g}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Stream</Label>
                  <Select
                    value={addForm.stream}
                    onValueChange={(v) => setAddForm({ ...addForm, stream: v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent>
                      {STREAM_OPTIONS.map((s) => (
                        <SelectItem key={`form-stream-${s}`} value={s}>
                          {s}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>School Name</Label>
                  <Input
                    placeholder="e.g. Royal College"
                    value={addForm.schoolName}
                    onChange={(e) => setAddForm({ ...addForm, schoolName: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Exam Year</Label>
                  <Input
                    type="number"
                    placeholder="2025"
                    value={addForm.examYear}
                    onChange={(e) => setAddForm({ ...addForm, examYear: e.target.value })}
                  />
                </div>
              </div>
            </TabsContent>

            {/* Contact Tab */}
            <TabsContent value="contact" className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Mobile</Label>
                  <Input
                    placeholder="07X XXX XXXX"
                    value={addForm.mobile}
                    onChange={(e) => setAddForm({ ...addForm, mobile: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>WhatsApp</Label>
                  <Input
                    placeholder="07X XXX XXXX"
                    value={addForm.whatsapp}
                    onChange={(e) => setAddForm({ ...addForm, whatsapp: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input
                  type="email"
                  placeholder="student@example.com"
                  value={addForm.email}
                  onChange={(e) => setAddForm({ ...addForm, email: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Address</Label>
                <Input
                  placeholder="Street address"
                  value={addForm.addressLine1}
                  onChange={(e) => setAddForm({ ...addForm, addressLine1: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>City</Label>
                  <Input
                    placeholder="e.g. Colombo"
                    value={addForm.city}
                    onChange={(e) => setAddForm({ ...addForm, city: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>District</Label>
                  <Input
                    placeholder="e.g. Colombo"
                    value={addForm.district}
                    onChange={(e) => setAddForm({ ...addForm, district: e.target.value })}
                  />
                </div>
              </div>
            </TabsContent>
          </Tabs>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddStudent} disabled={submitting}>
              {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Add Student
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
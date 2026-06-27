'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAppStore } from '@/lib/store'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Separator } from '@/components/ui/separator'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  ArrowLeft,
  Video,
  Plus,
  Users,
  Clock,
  ExternalLink,
  Loader2,
  Pencil,
  Trash2,
  Play,
  Search,
  AlertCircle,
  RefreshCw,
  MessageCircle,
  CalendarDays,
  DollarSign,
  GraduationCap,
  X,
  UserMinus,
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

// --- Interfaces ---

interface BatchDetail {
  id: string
  name: string
  code?: string
  description?: string
  gradeLevel?: string
  academicYear?: string
  medium?: string
  classType: string
  maxStudents?: number
  currentStudents: number
  monthlyFee?: number
  registrationFee?: number
  daysOfWeek: string
  startTime?: string
  endTime?: string
  typicalDurationMin?: number
  onlinePlatform?: string
  onlineMeetingUrl?: string
  status: string
  isVisibleToStudents: boolean
  isEnrollmentOpen: boolean
  notes?: string
  whatsappGroupLink?: string
  createdAt: string
  updatedAt: string
  subject: { id: string; name: string; code: string; color?: string } | null
  teacher: { id: string; userId: string; user?: { firstName: string; lastName: string; mobile?: string; email?: string } } | null
  branch: { id: string; name: string; city?: string } | null
  enrolledStudents: Array<{ id: string; fullName: string; studentNumber: string; mobile?: string; status: string; schoolName?: string }>
  sessions: Array<any>
  timetableSlots: Array<any>
  feeStructures: Array<any>
  exams: Array<any>
  _count: { students: number; sessions: number }
}

interface ApiSubject {
  id: string; name: string; code: string
}
interface ApiTeacher {
  id: string; firstName: string; lastName: string
}

const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const DAY_INDICES = [1, 2, 3, 4, 5, 6] // ISO day of week

const typeColors: Record<string, string> = {
  online: 'bg-sky-100 text-sky-700 border-sky-200 dark:bg-sky-950 dark:text-sky-300 dark:border-sky-800',
  physical: 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800',
  hybrid: 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-800',
}

const statusColors: Record<string, string> = {
  active: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300',
  upcoming: 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300',
  archived: 'bg-gray-100 text-gray-500 dark:bg-gray-900 dark:text-gray-400',
  completed: 'bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300',
}

function parseDaysOfWeek(daysStr: string | null | undefined): number[] {
  try { return daysStr ? JSON.parse(daysStr) : [] } catch { return [] }
}

function formatDays(days: number[]): string {
  return days.map(d => DAY_NAMES[d - 1] || '').filter(Boolean).join(', ') || 'Not set'
}

function parseSchedule(daysOfWeekStr: string, startTime?: string | null, endTime?: string | null): string {
  const days = parseDaysOfWeek(daysOfWeekStr)
  const dayPart = formatDays(days)
  const timePart = startTime ? `${startTime}${endTime ? ` - ${endTime}` : ''}` : ''
  if (dayPart && timePart) return `${dayPart} · ${timePart}`
  return dayPart || timePart || 'No schedule set'
}

// --- Component ---

export default function BatchDetailView() {
  const { goBack, setActiveView, selectedBatchId, setSelectedBatchId, currentInstitute } = useAppStore()
  const { toast } = useToast()

  const [batch, setBatch] = useState<BatchDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Edit dialog
  const [editOpen, setEditOpen] = useState(false)
  const [editForm, setEditForm] = useState<Record<string, unknown>>({})
  const [editLoading, setEditLoading] = useState(false)
  const [subjects, setSubjects] = useState<ApiSubject[]>([])
  const [teachers, setTeachers] = useState<ApiTeacher[]>([])

  // Delete dialog
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)

  // Add student dialog
  const [addStudentOpen, setAddStudentOpen] = useState(false)
  const [studentSearch, setStudentSearch] = useState('')
  const [availableStudents, setAvailableStudents] = useState<Array<{ id: string; fullName: string; studentNumber: string; schoolName?: string }>>([])
  const [studentsLoading, setStudentsLoading] = useState(false)
  const [enrolling, setEnrolling] = useState<string | null>(null)
  const [removingStudent, setRemovingStudent] = useState<string | null>(null)

  const fetchBatch = useCallback(async () => {
    if (!selectedBatchId) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/batches/${selectedBatchId}`)
      if (!res.ok) throw new Error(`Failed to fetch batch (${res.status})`)
      const data = await res.json()
      setBatch(data)
    } catch (err: any) {
      setError(err.message || 'Failed to load batch')
    } finally {
      setLoading(false)
    }
  }, [selectedBatchId])

  useEffect(() => { fetchBatch() }, [fetchBatch])

  // Fetch subjects + teachers for edit form
  const fetchFormOptions = useCallback(async () => {
    if (!currentInstitute?.id) return
    try {
      const [sRes, tRes] = await Promise.all([
        fetch(`/api/subjects?instituteId=${currentInstitute.id}`),
        fetch(`/api/teachers?instituteId=${currentInstitute.id}`),
      ])
      if (sRes.ok) { const d = await sRes.json(); setSubjects(d.subjects || []) }
      if (tRes.ok) { const d = await tRes.json(); setTeachers(d.teachers || []) }
    } catch { /* silent */ }
  }, [currentInstitute?.id])

  // Fetch available students for add dialog
  const fetchAvailableStudents = useCallback(async (search: string) => {
    if (!currentInstitute?.id || !selectedBatchId) return
    setStudentsLoading(true)
    try {
      const url = `/api/students?instituteId=${currentInstitute.id}&status=active${search ? `&search=${encodeURIComponent(search)}` : ''}&limit=20`
      const res = await fetch(url)
      if (res.ok) {
        const data = await res.json()
        const enrolledIds = new Set(batch?.enrolledStudents.map(s => s.id) || [])
        setAvailableStudents((data.students || []).filter((s: any) => !enrolledIds.has(s.id)))
      }
    } catch { /* silent */ } finally {
      setStudentsLoading(false)
    }
  }, [currentInstitute?.id, selectedBatchId, batch?.enrolledStudents])

  useEffect(() => {
    if (addStudentOpen) {
      fetchFormOptions()
      fetchAvailableStudents('')
    }
  }, [addStudentOpen, fetchFormOptions, fetchAvailableStudents])

  useEffect(() => {
    if (addStudentOpen) {
      const timer = setTimeout(() => fetchAvailableStudents(studentSearch), 300)
      return () => clearTimeout(timer)
    }
  }, [studentSearch, addStudentOpen, fetchAvailableStudents])

  // --- Handlers ---

  const openEditDialog = () => {
    if (!batch) return
    fetchFormOptions()
    setEditForm({
      name: batch.name,
      code: batch.code || '',
      description: batch.description || '',
      gradeLevel: batch.gradeLevel || '',
      academicYear: batch.academicYear || '',
      medium: batch.medium || 'english',
      classType: batch.classType || 'physical',
      maxStudents: batch.maxStudents?.toString() || '',
      monthlyFee: batch.monthlyFee?.toString() || '',
      registrationFee: batch.registrationFee?.toString() || '',
      daysOfWeek: parseDaysOfWeek(batch.daysOfWeek),
      startTime: batch.startTime || '',
      endTime: batch.endTime || '',
      subjectId: batch.subject?.id || '',
      teacherId: batch.teacher?.id || '',
      status: batch.status,
      notes: batch.notes || '',
    })
    setEditOpen(true)
  }

  const handleEditSave = async () => {
    if (!batch) return
    if (!editForm.name?.toString().trim()) {
      toast({ title: 'Validation Error', description: 'Batch name is required', variant: 'destructive' })
      return
    }
    setEditLoading(true)
    try {
      const body: Record<string, unknown> = {
        name: editForm.name.toString().trim(),
        code: editForm.code?.toString().trim() || null,
        description: editForm.description?.toString().trim() || null,
        gradeLevel: editForm.gradeLevel?.toString() || null,
        academicYear: editForm.academicYear?.toString() || null,
        medium: editForm.medium || 'english',
        classType: editForm.classType || 'physical',
        maxStudents: editForm.maxStudents ? parseInt(editForm.maxStudents.toString(), 10) || null : null,
        monthlyFee: editForm.monthlyFee ? parseFloat(editForm.monthlyFee.toString()) || null : null,
        registrationFee: editForm.registrationFee ? parseFloat(editForm.registrationFee.toString()) || 0 : 0,
        daysOfWeek: editForm.daysOfWeek || [],
        startTime: editForm.startTime?.toString().trim() || null,
        endTime: editForm.endTime?.toString().trim() || null,
        subjectId: editForm.subjectId || null,
        teacherId: editForm.teacherId || null,
        status: editForm.status || batch.status,
        notes: editForm.notes?.toString().trim() || null,
      }

      const res = await fetch(`/api/batches/${batch.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (res.ok) {
        toast({ title: 'Batch updated', description: `${body.name} has been updated` })
        setEditOpen(false)
        fetchBatch()
      } else {
        const err = await res.json().catch(() => ({}))
        toast({ title: 'Error', description: err.error || 'Failed to update batch', variant: 'destructive' })
      }
    } catch {
      toast({ title: 'Error', description: 'Network error', variant: 'destructive' })
    } finally {
      setEditLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!batch) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/batches/${batch.id}`, { method: 'DELETE' })
      if (res.ok) {
        toast({ title: 'Batch archived', description: `${batch.name} has been archived` })
        setDeleteOpen(false)
        goBack()
      } else {
        const err = await res.json().catch(() => ({}))
        toast({ title: 'Error', description: err.error || 'Failed to archive batch', variant: 'destructive' })
      }
    } catch {
      toast({ title: 'Error', description: 'Network error', variant: 'destructive' })
    } finally {
      setDeleting(false)
    }
  }

  const handleActivate = async () => {
    if (!batch) return
    try {
      const res = await fetch(`/api/batches/${batch.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'active' }),
      })
      if (res.ok) {
        toast({ title: 'Batch activated', description: `${batch.name} is now active` })
        fetchBatch()
      } else {
        toast({ title: 'Error', description: 'Failed to activate batch', variant: 'destructive' })
      }
    } catch {
      toast({ title: 'Error', description: 'Network error', variant: 'destructive' })
    }
  }

  const handleEnrollStudent = async (studentId: string) => {
    if (!selectedBatchId) return
    setEnrolling(studentId)
    try {
      const res = await fetch(`/api/batches/${selectedBatchId}/enroll`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentId }),
      })
      if (res.ok) {
        toast({ title: 'Student enrolled' })
        fetchAvailableStudents(studentSearch)
        fetchBatch()
      } else {
        const err = await res.json().catch(() => ({}))
        toast({ title: 'Error', description: err.error || 'Failed to enroll student', variant: 'destructive' })
      }
    } catch {
      toast({ title: 'Error', description: 'Network error', variant: 'destructive' })
    } finally {
      setEnrolling(null)
    }
  }

  const handleRemoveStudent = async (studentId: string, studentName: string) => {
    if (!selectedBatchId) return
    setRemovingStudent(studentId)
    try {
      const res = await fetch(`/api/batches/${selectedBatchId}/enroll?studentId=${studentId}`, {
        method: 'DELETE',
      })
      if (res.ok) {
        toast({ title: 'Student removed', description: `${studentName} has been removed` })
        fetchBatch()
      } else {
        const err = await res.json().catch(() => ({}))
        toast({ title: 'Error', description: err.error || 'Failed to remove student', variant: 'destructive' })
      }
    } catch {
      toast({ title: 'Error', description: 'Network error', variant: 'destructive' })
    } finally {
      setRemovingStudent(null)
    }
  }

  const handleZoomNav = () => {
    if (batch) {
      setSelectedBatchId(batch.id)
      setActiveView('zoom-meetings')
    }
  }

  // --- Render ---

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-32 w-full" />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  if (error || !batch) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" onClick={goBack} className="gap-2">
          <ArrowLeft className="h-4 w-4" /> Back to Batches
        </Button>
        <Card className="p-8 text-center">
          <AlertCircle className="h-12 w-12 mx-auto text-destructive mb-3" />
          <h3 className="font-semibold text-lg mb-1">Failed to load batch</h3>
          <p className="text-sm text-muted-foreground mb-4">{error || 'Batch not found'}</p>
          <Button variant="outline" onClick={fetchBatch} className="gap-2">
            <RefreshCw className="h-4 w-4" /> Retry
          </Button>
        </Card>
      </div>
    )
  }

  const isOnline = batch.classType === 'online' || batch.classType === 'hybrid'
  const teacherName = batch.teacher?.user
    ? `${batch.teacher.user.firstName} ${batch.teacher.user.lastName}`
    : batch.teacher?.id || 'Unassigned'
  const schedule = parseSchedule(batch.daysOfWeek, batch.startTime, batch.endTime)
  const days = parseDaysOfWeek(batch.daysOfWeek)

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" onClick={goBack} className="gap-2">
        <ArrowLeft className="h-4 w-4" /> Back to Batches
      </Button>

      {/* Header */}
      <Card>
        <CardContent className="p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <h1 className="text-xl font-bold truncate">{batch.name}</h1>
                <Badge variant="outline" className={`text-xs shrink-0 ${typeColors[batch.classType] || ''}`}>
                  {batch.classType}
                </Badge>
                <Badge className={`text-xs shrink-0 ${statusColors[batch.status] || ''}`}>
                  {batch.status}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                {batch.subject?.name || 'No subject'} &middot; {teacherName}
                {batch.branch && ` · ${batch.branch.name}${batch.branch.city ? `, ${batch.branch.city}` : ''}`}
              </p>
              <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                <Clock className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">{schedule}</span>
              </p>
            </div>
            <div className="flex flex-wrap gap-2 shrink-0">
              {isOnline && (
                <Button variant="outline" size="sm" className="gap-2" onClick={handleZoomNav}>
                  <Video className="h-4 w-4" /> Create Zoom Meeting
                </Button>
              )}
              {batch.whatsappGroupLink && (
                <Button variant="outline" size="sm" className="gap-2" asChild>
                  <a href={batch.whatsappGroupLink} target="_blank" rel="noopener noreferrer">
                    <MessageCircle className="h-4 w-4" /> WhatsApp
                  </a>
                </Button>
              )}
              {batch.status === 'upcoming' && (
                <Button size="sm" className="gap-2" onClick={handleActivate}>
                  <Play className="h-4 w-4" /> Activate
                </Button>
              )}
              <Button variant="outline" size="sm" className="gap-2" onClick={openEditDialog}>
                <Pencil className="h-4 w-4" /> Edit
              </Button>
              <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-2 text-destructive hover:text-destructive">
                    <Trash2 className="h-4 w-4" /> Archive
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Archive &quot;{batch.name}&quot;?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will archive the batch and deactivate all student enrollments. This action can be reversed by editing the batch status.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleDelete}
                      disabled={deleting}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      {deleting && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
                      Archive Batch
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue="overview">
        <TabsList className="w-full sm:w-auto overflow-x-auto">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="students">Students ({batch._count.students})</TabsTrigger>
          <TabsTrigger value="sessions">Sessions ({batch._count.sessions})</TabsTrigger>
          {batch.feeStructures.length > 0 && (
            <TabsTrigger value="fees">Fees</TabsTrigger>
          )}
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="mt-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <Card className="p-4 text-center">
              <Users className="h-5 w-5 mx-auto text-muted-foreground mb-1" />
              <p className="text-2xl font-bold">{batch._count.students}</p>
              <p className="text-xs text-muted-foreground">Enrolled Students</p>
              <p className="text-[10px] text-muted-foreground">Max: {batch.maxStudents || '∞'}</p>
            </Card>
            <Card className="p-4 text-center">
              <CalendarDays className="h-5 w-5 mx-auto text-muted-foreground mb-1" />
              <p className="text-2xl font-bold">{batch._count.sessions}</p>
              <p className="text-xs text-muted-foreground">Total Sessions</p>
            </Card>
            <Card className="p-4 text-center col-span-2 sm:col-span-1">
              <DollarSign className="h-5 w-5 mx-auto text-muted-foreground mb-1" />
              <p className="text-2xl font-bold">
                {batch.monthlyFee ? `Rs. ${batch.monthlyFee.toLocaleString()}` : '—'}
              </p>
              <p className="text-xs text-muted-foreground">Monthly Fee</p>
              {batch.registrationFee ? (
                <p className="text-[10px] text-muted-foreground">Reg: Rs. {batch.registrationFee.toLocaleString()}</p>
              ) : null}
            </Card>
          </div>

          <Card className="mt-4">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Batch Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <span className="text-muted-foreground">Schedule</span>
                  <p className="font-medium">{schedule}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Duration</span>
                  <p className="font-medium">{batch.typicalDurationMin ? `${batch.typicalDurationMin} min` : 'Not set'}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Medium</span>
                  <p className="font-medium capitalize">{batch.medium || 'English'}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Grade Level</span>
                  <p className="font-medium">{batch.gradeLevel || '—'}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Academic Year</span>
                  <p className="font-medium">{batch.academicYear || '—'}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Online Platform</span>
                  <p className="font-medium">{batch.onlinePlatform || (isOnline ? 'Zoom' : '—')}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Enrollment</span>
                  <p className="font-medium">
                    {batch.isEnrollmentOpen ? (
                      <Badge className="bg-emerald-100 text-emerald-700 text-[10px]">Open</Badge>
                    ) : (
                      <Badge variant="outline" className="text-[10px]">Closed</Badge>
                    )}
                  </p>
                </div>
                <div>
                  <span className="text-muted-foreground">Visible to Students</span>
                  <p className="font-medium">{batch.isVisibleToStudents ? 'Yes' : 'No'}</p>
                </div>
              </div>
              {batch.description && (
                <>
                  <Separator />
                  <div>
                    <span className="text-muted-foreground">Description</span>
                    <p className="mt-1 whitespace-pre-wrap">{batch.description}</p>
                  </div>
                </>
              )}
              {batch.notes && (
                <>
                  <Separator />
                  <div>
                    <span className="text-muted-foreground">Notes</span>
                    <p className="mt-1 whitespace-pre-wrap">{batch.notes}</p>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Students Tab */}
        <TabsContent value="students" className="mt-4">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm">
                  Enrolled Students ({batch.enrolledStudents.length})
                </CardTitle>
                <Button size="sm" variant="outline" className="gap-1" onClick={() => setAddStudentOpen(true)}>
                  <Plus className="h-3 w-3" /> Add Student
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {batch.enrolledStudents.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Users className="h-8 w-8 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">No students enrolled yet</p>
                </div>
              ) : (
                <ScrollArea className="max-h-96 overflow-y-auto">
                  <div className="divide-y">
                    {batch.enrolledStudents.map((student) => (
                      <div key={student.id} className="flex items-center justify-between py-3">
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-bold shrink-0">
                            {student.fullName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium truncate">{student.fullName}</p>
                            <p className="text-xs text-muted-foreground">
                              {student.studentNumber}
                              {student.schoolName ? ` · ${student.schoolName}` : ''}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <Badge className="text-xs bg-emerald-100 text-emerald-700">{student.status}</Badge>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive text-xs h-7 gap-1"
                            disabled={removingStudent === student.id}
                            onClick={() => handleRemoveStudent(student.id, student.fullName)}
                          >
                            {removingStudent === student.id ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <UserMinus className="h-3 w-3" />
                            )}
                            Remove
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Sessions Tab */}
        <TabsContent value="sessions" className="mt-4">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm">Recent Sessions</CardTitle>
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1"
                  onClick={() => toast({ title: 'Coming soon', description: 'Session creation will be available in the Sessions module' })}
                >
                  <Plus className="h-3 w-3" /> Create Session
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {batch.sessions.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <CalendarDays className="h-8 w-8 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">No sessions yet</p>
                </div>
              ) : (
                <ScrollArea className="max-h-96 overflow-y-auto">
                  <div className="divide-y">
                    {batch.sessions.map((session: any) => {
                      const dateStr = session.sessionDate
                        ? new Date(session.sessionDate).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
                        : '—'
                      const isLive = session.status === 'live'
                      const isCompleted = session.status === 'completed'
                      return (
                        <div key={session.id} className="flex items-center justify-between py-3">
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium truncate">
                              {session.topic || 'Untitled Session'}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {dateStr}
                              {session.startTime ? ` · ${session.startTime}` : ''}
                            </p>
                          </div>
                          <div className="flex items-center gap-2 shrink-0 ml-2">
                            {session.isOnline && (
                              <Badge variant="outline" className="text-[10px]">Online</Badge>
                            )}
                            <Badge
                              className={`text-xs ${
                                isLive
                                  ? 'bg-emerald-100 text-emerald-700'
                                  : isCompleted
                                  ? 'bg-gray-100 text-gray-500'
                                  : 'bg-sky-100 text-sky-700'
                              }`}
                            >
                              {isLive && (
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1 animate-pulse inline-block" />
                              )}
                              {session.status}
                            </Badge>
                            {session.isOnline && !isCompleted && (
                              <Button size="sm" variant={isLive ? 'default' : 'outline'} className="h-7 text-[10px] gap-1">
                                <Video className="h-3 w-3" /> Join
                              </Button>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Fees Tab */}
        <TabsContent value="fees" className="mt-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Fee Structures</CardTitle>
            </CardHeader>
            <CardContent>
              {batch.feeStructures.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <DollarSign className="h-8 w-8 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">No fee structures configured</p>
                </div>
              ) : (
                <ScrollArea className="max-h-96 overflow-y-auto">
                  <div className="divide-y">
                    {batch.feeStructures.map((fs: any) => (
                      <div key={fs.id} className="flex items-center justify-between py-3">
                        <div>
                          <p className="text-sm font-medium">{fs.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {fs.type} {fs.isRecurring ? `(Recurring: ${fs.recurrence || ''})` : ''}
                          </p>
                        </div>
                        <Badge className="text-xs">{fs.amount.toLocaleString()} LKR</Badge>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>Edit Batch</DialogTitle>
            <DialogDescription>Update batch details</DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-[65vh] overflow-y-auto pr-2">
            <div className="space-y-4 py-2">
              {/* Basic Info */}
              <div className="space-y-3">
                <h4 className="text-sm font-semibold">Basic Information</h4>
                <div className="space-y-2">
                  <Label>Batch Name *</Label>
                  <Input
                    value={editForm.name?.toString() || ''}
                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Subject</Label>
                    <Select value={editForm.subjectId?.toString() || ''} onValueChange={(v) => setEditForm({ ...editForm, subjectId: v })}>
                      <SelectTrigger><SelectValue placeholder="Select subject" /></SelectTrigger>
                      <SelectContent>
                        {subjects.map((s) => (
                          <SelectItem key={s.id} value={s.id}>{s.name}{s.code ? ` (${s.code})` : ''}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Teacher</Label>
                    <Select value={editForm.teacherId?.toString() || ''} onValueChange={(v) => setEditForm({ ...editForm, teacherId: v })}>
                      <SelectTrigger><SelectValue placeholder="Select teacher" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Unassigned</SelectItem>
                        {teachers.map((t) => (
                          <SelectItem key={t.id} value={t.id}>{t.firstName} {t.lastName}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Class Type</Label>
                    <Select value={editForm.classType?.toString() || 'physical'} onValueChange={(v) => setEditForm({ ...editForm, classType: v })}>
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
                      value={editForm.maxStudents?.toString() || ''}
                      onChange={(e) => setEditForm({ ...editForm, maxStudents: e.target.value })}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select value={editForm.status?.toString() || 'upcoming'} onValueChange={(v) => setEditForm({ ...editForm, status: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="upcoming">Upcoming</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                    </SelectContent>
                  </Select>
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
                      const isChecked = (editForm.daysOfWeek as number[])?.includes(dayIdx) || false
                      return (
                        <label key={dayIdx} className="flex items-center gap-1.5 cursor-pointer">
                          <Checkbox
                            checked={isChecked}
                            onCheckedChange={(checked) => {
                              const current = (editForm.daysOfWeek as number[]) || []
                              const next = checked
                                ? [...current, dayIdx]
                                : current.filter((d) => d !== dayIdx)
                              setEditForm({ ...editForm, daysOfWeek: next })
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
                      value={editForm.startTime?.toString() || ''}
                      onChange={(e) => setEditForm({ ...editForm, startTime: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>End Time</Label>
                    <Input
                      type="time"
                      value={editForm.endTime?.toString() || ''}
                      onChange={(e) => setEditForm({ ...editForm, endTime: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              <Separator />

              {/* Fees */}
              <div className="space-y-3">
                <h4 className="text-sm font-semibold">Fees</h4>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Monthly Fee (LKR)</Label>
                    <Input
                      type="number"
                      min={0}
                      step={0.01}
                      value={editForm.monthlyFee?.toString() || ''}
                      onChange={(e) => setEditForm({ ...editForm, monthlyFee: e.target.value })}
                      placeholder="0.00"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Registration Fee (LKR)</Label>
                    <Input
                      type="number"
                      min={0}
                      step={0.01}
                      value={editForm.registrationFee?.toString() || ''}
                      onChange={(e) => setEditForm({ ...editForm, registrationFee: e.target.value })}
                      placeholder="0.00"
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
                    <Select value={editForm.gradeLevel?.toString() || ''} onValueChange={(v) => setEditForm({ ...editForm, gradeLevel: v })}>
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
                      value={editForm.academicYear?.toString() || ''}
                      onChange={(e) => setEditForm({ ...editForm, academicYear: e.target.value })}
                      placeholder="2025"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Medium</Label>
                  <Select value={editForm.medium?.toString() || 'english'} onValueChange={(v) => setEditForm({ ...editForm, medium: v })}>
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

              {/* Additional */}
              <div className="space-y-3">
                <h4 className="text-sm font-semibold">Additional</h4>
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Textarea
                    value={editForm.description?.toString() || ''}
                    onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                    placeholder="Batch description..."
                    rows={3}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Notes</Label>
                  <Textarea
                    value={editForm.notes?.toString() || ''}
                    onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                    placeholder="Internal notes..."
                    rows={2}
                  />
                </div>
              </div>
            </div>
          </ScrollArea>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
            <Button onClick={handleEditSave} disabled={editLoading}>
              {editLoading && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Student Dialog */}
      <Dialog open={addStudentOpen} onOpenChange={setAddStudentOpen}>
        <DialogContent className="sm:max-w-[450px]">
          <DialogHeader>
            <DialogTitle>Add Student to Batch</DialogTitle>
            <DialogDescription>Search and select a student to enroll</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search students..."
                value={studentSearch}
                onChange={(e) => setStudentSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <ScrollArea className="max-h-64 overflow-y-auto">
              {studentsLoading ? (
                <div className="space-y-2 py-4">
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                </div>
              ) : availableStudents.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Users className="h-8 w-8 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">No available students found</p>
                </div>
              ) : (
                <div className="divide-y">
                  {availableStudents.map((student) => (
                    <div key={student.id} className="flex items-center justify-between py-2">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">{student.fullName}</p>
                        <p className="text-xs text-muted-foreground">
                          {student.studentNumber}
                          {student.schoolName ? ` · ${student.schoolName}` : ''}
                        </p>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs gap-1 shrink-0"
                        disabled={enrolling === student.id}
                        onClick={() => handleEnrollStudent(student.id)}
                      >
                        {enrolling === student.id ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <Plus className="h-3 w-3" />
                        )}
                        Add
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
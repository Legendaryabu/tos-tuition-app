'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAppStore } from '@/lib/store'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Separator } from '@/components/ui/separator'
import { Textarea } from '@/components/ui/textarea'
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
} from '@/components/ui/alert-dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  ArrowLeft, Phone, Mail, MapPin, School, Calendar, Edit3,
  MessageSquare, Clock, User, Trash2, Flag, Plus, AlertTriangle,
  CheckCircle, XCircle, Users, CreditCard, History, StickyNote,
  ExternalLink,
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

// ─── Interfaces ──────────────────────────────────────────────
interface StudentDetail {
  id: string
  studentNumber: string
  fullName: string
  gender?: string
  dateOfBirth?: string
  grade?: string
  schoolName?: string
  stream?: string
  examYear?: number
  mobile?: string
  whatsapp?: string
  email?: string
  addressLine1?: string
  city?: string
  district?: string
  status: string
  outstandingBalance: number
  totalPaid: number
  enrolledAt: string
  attendanceRate: number | null
  attendanceStats?: { total: number; present: number; absent: number; late: number }
  _count?: { batches: number; attendanceRecords: number; payments: number }
  user?: { email?: string; profilePhoto?: string; mobile?: string; whatsapp?: string } | null
  branch?: { name?: string; city?: string; district?: string } | null
  activeBatches?: any[]
  feeDues?: any[]
  attendanceRecords?: any[]
  payments?: any[]
  examResults?: any[]
  timelines?: any[]
  notes?: any[]
}

// ─── Helpers ─────────────────────────────────────────────────
function formatLKR(amount: number): string {
  return `Rs. ${amount.toLocaleString('en-LK')}`
}

function formatDate(dateStr: string): string {
  if (!dateStr) return '-'
  try {
    const d = new Date(dateStr)
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
  } catch { return dateStr }
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
  ]
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash)
  return colors[Math.abs(hash) % colors.length]
}

function timeAgo(dateStr: string): string {
  const now = new Date()
  const then = new Date(dateStr)
  const diffMs = now.getTime() - then.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins}m ago`
  const diffHours = Math.floor(diffMins / 60)
  if (diffHours < 24) return `${diffHours}h ago`
  const diffDays = Math.floor(diffHours / 24)
  if (diffDays < 30) return `${diffDays}d ago`
  const diffMonths = Math.floor(diffDays / 30)
  return `${diffMonths}mo ago`
}

const GRADE_OPTIONS = ['Grade 6', 'Grade 7', 'Grade 8', 'Grade 9', 'Grade 10', 'Grade 11', 'O/L', 'A/L']
const STREAM_OPTIONS = ['Maths', 'Bio', 'Commerce', 'Arts', 'Technology']

const attendanceColors: Record<string, string> = {
  present: 'bg-emerald-100 text-emerald-700',
  absent: 'bg-red-100 text-red-700',
  late: 'bg-amber-100 text-amber-700',
  excused: 'bg-sky-100 text-sky-700',
}

const timelineIcons: Record<string, any> = {
  enrollment: <CheckCircle className="h-4 w-4 text-emerald-500" />,
  profile_update: <Edit3 className="h-4 w-4 text-blue-500" />,
  deactivation: <XCircle className="h-4 w-4 text-red-500" />,
  payment: <CreditCard className="h-4 w-4 text-amber-500" />,
  attendance: <Clock className="h-4 w-4 text-sky-500" />,
}

// ─── Main Component ──────────────────────────────────────────
export default function StudentDetailView() {
  const { goBack, selectedStudentId, setActiveView, setSelectedStudentId } = useAppStore()
  const { toast } = useToast()

  const [student, setStudent] = useState<StudentDetail | null>(null)
  const [loading, setLoading] = useState(true)

  // Edit dialog
  const [editOpen, setEditOpen] = useState(false)
  const [editForm, setEditForm] = useState({
    firstName: '', lastName: '', gender: '', dob: '', grade: '', schoolName: '',
    mobile: '', whatsapp: '', email: '', address: '', city: '', district: '',
    stream: '', examYear: '',
  })
  const [editLoading, setEditLoading] = useState(false)

  // Delete dialog
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleteLoading, setDeleteLoading] = useState(false)

  // Add note dialog
  const [noteOpen, setNoteOpen] = useState(false)
  const [noteText, setNoteText] = useState('')
  const [noteFlagged, setNoteFlagged] = useState(false)
  const [noteLoading, setNoteLoading] = useState(false)

  // Edit mode for notes
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null)
  const [editNoteText, setEditNoteText] = useState('')

  // ─── Fetch student ───────────────────────────────────────
  const fetchStudent = useCallback(async () => {
    if (!selectedStudentId) return
    setLoading(true)
    try {
      const res = await fetch(`/api/students/${selectedStudentId}`)
      if (res.ok) {
        const data = await res.json()
        setStudent(data)
      } else {
        setStudent(null)
      }
    } catch {
      setStudent(null)
    } finally {
      setLoading(false)
    }
  }, [selectedStudentId])

  useEffect(() => { fetchStudent() }, [fetchStudent])

  // ─── Edit handlers ───────────────────────────────────────
  const openEdit = () => {
    if (!student) return
    const parts = student.fullName.split(' ')
    setEditForm({
      firstName: parts[0] || '',
      lastName: parts.slice(1).join(' ') || '',
      gender: student.gender || '',
      dob: student.dateOfBirth ? new Date(student.dateOfBirth).toISOString().split('T')[0] : '',
      grade: student.grade || '',
      schoolName: student.schoolName || '',
      mobile: student.mobile || student.user?.mobile || '',
      whatsapp: student.whatsapp || student.user?.whatsapp || '',
      email: student.email || student.user?.email || '',
      address: student.addressLine1 || '',
      city: student.city || '',
      district: student.district || '',
      stream: student.stream || '',
      examYear: student.examYear ? String(student.examYear) : '',
    })
    setEditOpen(true)
  }

  const handleEdit = async () => {
    if (!student || !editForm.firstName) return
    setEditLoading(true)
    try {
      const res = await fetch(`/api/students/${student.id}`, {
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
        toast({ title: 'Profile updated', description: 'Student information has been saved' })
        setEditOpen(false)
        fetchStudent()
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

  // ─── Delete handler ──────────────────────────────────────
  const handleDelete = async () => {
    if (!student) return
    setDeleteLoading(true)
    try {
      const res = await fetch(`/api/students/${student.id}`, { method: 'DELETE' })
      if (res.ok) {
        toast({ title: 'Student deactivated' })
        goBack()
      }
    } catch {
      toast({ title: 'Failed', variant: 'destructive' })
    } finally {
      setDeleteLoading(false)
    }
  }

  // ─── Note handlers ───────────────────────────────────────
  const handleAddNote = async () => {
    if (!student || !noteText.trim()) return
    setNoteLoading(true)
    try {
      const res = await fetch('/api/students/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId: student.id,
          note: noteText.trim(),
          isFlagged: noteFlagged,
        }),
      })
      if (res.ok) {
        toast({ title: 'Note added' })
        setNoteText('')
        setNoteFlagged(false)
        setNoteOpen(false)
        fetchStudent()
      }
    } catch {
      toast({ title: 'Failed to add note', variant: 'destructive' })
    } finally {
      setNoteLoading(false)
    }
  }

  const handleDeleteNote = async (noteId: string) => {
    try {
      const res = await fetch(`/api/students/notes/${noteId}`, { method: 'DELETE' })
      if (res.ok) fetchStudent()
    } catch { /* ignore */ }
  }

  const startEditNote = (note: any) => {
    setEditingNoteId(note.id)
    setEditNoteText(note.note)
  }

  const handleSaveNote = async (noteId: string) => {
    try {
      const res = await fetch(`/api/students/notes/${noteId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ note: editNoteText }),
      })
      if (res.ok) {
        setEditingNoteId(null)
        setEditNoteText('')
        fetchStudent()
      }
    } catch { /* ignore */ }
  }

  // ─── WhatsApp link ───────────────────────────────────────
  const getWhatsAppLink = (phone?: string) => {
    const mobile = phone || student?.mobile || student?.user?.mobile || student?.whatsapp || student?.user?.whatsapp
    if (!mobile) return null
    const clean = mobile.replace(/\D/g, '')
    const number = clean.startsWith('0') ? `94${clean.slice(1)}` : clean
    return `https://wa.me/${number}`
  }

  // ─── Loading state ───────────────────────────────────────
  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-9 w-32" />
        <Skeleton className="h-36 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  if (!student) {
    return (
      <div className="text-center py-16">
        <AlertTriangle className="h-12 w-12 mx-auto mb-3 text-muted-foreground/50" />
        <p className="font-medium text-muted-foreground">Student not found</p>
        <Button variant="outline" className="mt-4" onClick={goBack}>
          <ArrowLeft className="h-4 w-4 mr-2" />Back to Students
        </Button>
      </div>
    )
  }

  const whatsAppLink = getWhatsAppLink()
  const hasTimeline = (student.timelines?.length || 0) > 0
  const hasNotes = (student.notes?.length || 0) > 0
  const hasBatches = (student.activeBatches?.length || 0) > 0
  const hasAttendance = (student.attendanceRecords?.length || 0) > 0
  const hasFees = (student.feeDues?.length || 0) > 0
  const hasPayments = (student.payments?.length || 0) > 0
  const hasExams = (student.examResults?.length || 0) > 0

  return (
    <div className="space-y-4">
      {/* Back button */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={goBack} className="gap-2">
          <ArrowLeft className="h-4 w-4" /> Back to Students
        </Button>
        <div className="flex items-center gap-2">
          {whatsAppLink && (
            <Button variant="outline" size="sm" className="gap-2" asChild>
              <a href={whatsAppLink} target="_blank" rel="noopener noreferrer">
                <MessageSquare className="h-4 w-4" />
                <span className="hidden sm:inline">WhatsApp</span>
              </a>
            </Button>
          )}
          <Button variant="outline" size="sm" className="gap-2" onClick={openEdit}>
            <Edit3 className="h-4 w-4" />
            <span className="hidden sm:inline">Edit</span>
          </Button>
          {student.status === 'active' && (
            <Button variant="outline" size="sm" className="gap-2 text-destructive hover:text-destructive" onClick={() => setDeleteOpen(true)}>
              <Trash2 className="h-4 w-4" />
              <span className="hidden sm:inline">Deactivate</span>
            </Button>
          )}
        </div>
      </div>

      {/* Profile Header */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row items-start gap-4">
            <div className={`w-16 h-16 rounded-full flex items-center justify-center text-xl font-bold shrink-0 ${getAvatarColor(student.fullName)}`}>
              {getInitials(student.fullName)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-1">
                <h1 className="text-xl font-bold truncate">{student.fullName}</h1>
                <Badge className={`text-xs w-fit ${student.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>
                  {student.status}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                {student.studentNumber} · {student.grade}{student.stream ? ` (${student.stream})` : ''}
              </p>
              {student.schoolName && (
                <p className="text-sm text-muted-foreground flex items-center gap-1 mt-0.5">
                  <School className="h-3.5 w-3.5" />{student.schoolName}
                </p>
              )}
            </div>
            <div className="flex gap-2 text-center shrink-0">
              <div className="px-3 py-2 bg-muted/50 rounded-lg">
                <p className="text-xs text-muted-foreground">Batches</p>
                <p className="font-bold text-sm">{student._count?.batches || 0}</p>
              </div>
              <div className="px-3 py-2 bg-muted/50 rounded-lg">
                <p className="text-xs text-muted-foreground">Attendance</p>
                <p className="font-bold text-sm">{student.attendanceRate ?? 0}%</p>
              </div>
              <div className="px-3 py-2 bg-muted/50 rounded-lg">
                <p className="text-xs text-muted-foreground">Paid</p>
                <p className="font-bold text-sm text-emerald-600">{formatLKR(student.totalPaid)}</p>
              </div>
              <div className="px-3 py-2 bg-muted/50 rounded-lg">
                <p className="text-xs text-muted-foreground">Owed</p>
                <p className={`font-bold text-sm ${student.outstandingBalance > 0 ? 'text-destructive' : 'text-emerald-600'}`}>
                  {formatLKR(student.outstandingBalance)}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue="overview">
        <TabsList className="w-full overflow-x-auto flex-nowrap">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="batches">Batches{hasBatches ? ` (${student.activeBatches?.length})` : ''}</TabsTrigger>
          <TabsTrigger value="attendance">Attendance</TabsTrigger>
          <TabsTrigger value="fees">Fees</TabsTrigger>
          <TabsTrigger value="notes">Notes{hasNotes ? ` (${student.notes?.length})` : ''}</TabsTrigger>
          <TabsTrigger value="timeline">Timeline</TabsTrigger>
        </TabsList>

        {/* ─── OVERVIEW TAB ─── */}
        <TabsContent value="overview" className="mt-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-3"><CardTitle className="text-sm">Contact Information</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-3 text-sm">
                  <Phone className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span>{student.mobile || student.user?.mobile || 'Not set'}</span>
                  {whatsAppLink && (
                    <a href={whatsAppLink} target="_blank" rel="noopener noreferrer" className="text-emerald-600 hover:underline ml-auto">
                      <MessageSquare className="h-3.5 w-3.5" />
                    </a>
                  )}
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span className="truncate">{student.email || student.user?.email || 'Not set'}</span>
                </div>
                <div className="flex items-start gap-3 text-sm">
                  <MapPin className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                  <span>
                    {[student.addressLine1, student.city, student.district].filter(Boolean).join(', ') || 'Not set'}
                  </span>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3"><CardTitle className="text-sm">Academic Information</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-3 text-sm">
                  <School className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span>{student.schoolName || 'Not set'}</span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <User className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span>{student.grade}{student.stream ? ` - ${student.stream} Stream` : ''}</span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span>{student.examYear ? `Exam Year: ${student.examYear}` : 'Not set'}</span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span>Enrolled: {formatDate(student.enrolledAt)}</span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Attendance Stats Card */}
          {student.attendanceStats && student.attendanceStats.total > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
              <Card className="p-4 text-center">
                <p className="text-2xl font-bold">{student.attendanceRate ?? 0}%</p>
                <p className="text-xs text-muted-foreground">Attendance Rate</p>
              </Card>
              <Card className="p-4 text-center">
                <p className="text-2xl font-bold text-emerald-600">{student.attendanceStats.present}</p>
                <p className="text-xs text-muted-foreground">Present</p>
              </Card>
              <Card className="p-4 text-center">
                <p className="text-2xl font-bold text-red-600">{student.attendanceStats.absent}</p>
                <p className="text-xs text-muted-foreground">Absent</p>
              </Card>
              <Card className="p-4 text-center">
                <p className="text-2xl font-bold text-amber-600">{student.attendanceStats.late}</p>
                <p className="text-xs text-muted-foreground">Late</p>
              </Card>
            </div>
          )}
        </TabsContent>

        {/* ─── BATCHES TAB ─── */}
        <TabsContent value="batches" className="mt-4">
          {hasBatches ? (
            <div className="grid gap-3">
              {student.activeBatches!.map((batch) => (
                <Card key={batch.id}>
                  <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <p className="font-medium">{batch.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {batch.subject?.name || batch.subject?.code || 'No subject'}
                        {batch.teacher && ` · ${batch.teacher.firstName} ${batch.teacher.lastName}`}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {batch.classType && (
                        <Badge variant="outline" className="text-xs">{batch.classType}</Badge>
                      )}
                      <Badge className={`text-xs ${batch.status === 'active' ? 'bg-emerald-100 text-emerald-700' : ''}`}>
                        {batch.status}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="py-12 text-center">
              <Users className="h-10 w-10 mx-auto mb-2 text-muted-foreground/30" />
              <p className="text-sm text-muted-foreground">Not enrolled in any batches yet</p>
            </Card>
          )}
        </TabsContent>

        {/* ─── ATTENDANCE TAB ─── */}
        <TabsContent value="attendance" className="mt-4">
          {hasAttendance ? (
            <>
              {student.attendanceStats && student.attendanceStats.total > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                  <Card className="p-4 text-center">
                    <p className="text-2xl font-bold">{student.attendanceRate ?? 0}%</p>
                    <p className="text-xs text-muted-foreground">Rate</p>
                  </Card>
                  <Card className="p-4 text-center">
                    <p className="text-2xl font-bold text-emerald-600">{student.attendanceStats.present}</p>
                    <p className="text-xs text-muted-foreground">Present</p>
                  </Card>
                  <Card className="p-4 text-center">
                    <p className="text-2xl font-bold text-red-600">{student.attendanceStats.absent}</p>
                    <p className="text-xs text-muted-foreground">Absent</p>
                  </Card>
                  <Card className="p-4 text-center">
                    <p className="text-2xl font-bold text-amber-600">{student.attendanceStats.late}</p>
                    <p className="text-xs text-muted-foreground">Late</p>
                  </Card>
                </div>
              )}
              <Card>
                <CardContent className="p-0">
                  <div className="divide-y">
                    {student.attendanceRecords!.map((record) => (
                      <div key={record.id} className="flex items-center justify-between p-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <span className="text-xs text-muted-foreground w-20 shrink-0">
                            {record.classSession?.sessionDate
                              ? formatDate(record.classSession.sessionDate)
                              : formatDate(record.markedAt)}
                          </span>
                          <div className="min-w-0">
                            <p className="text-sm font-medium truncate">
                              {record.classSession?.batchName || 'Class'}
                            </p>
                            {record.classSession?.topic && (
                              <p className="text-xs text-muted-foreground truncate">{record.classSession.topic}</p>
                            )}
                          </div>
                        </div>
                        <Badge className={`text-xs shrink-0 ${attendanceColors[record.status] || ''}`}>
                          {record.status}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </>
          ) : (
            <Card className="py-12 text-center">
              <Clock className="h-10 w-10 mx-auto mb-2 text-muted-foreground/30" />
              <p className="text-sm text-muted-foreground">No attendance records yet</p>
            </Card>
          )}
        </TabsContent>

        {/* ─── FEES TAB ─── */}
        <TabsContent value="fees" className="mt-4">
          <div className="space-y-4">
            {/* Outstanding Dues */}
            {hasFees ? (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Outstanding Dues ({student.feeDues!.length})</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="divide-y">
                    {student.feeDues!.map((due) => (
                      <div key={due.id} className="flex items-center justify-between p-3">
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{due.description}</p>
                          <p className="text-xs text-muted-foreground">
                            Due: {formatDate(due.dueDate)}
                            {due.periodMonth && due.periodYear && ` · ${due.periodMonth}/${due.periodYear}`}
                          </p>
                        </div>
                        <div className="text-right shrink-0 ml-3">
                          <p className="text-sm font-medium">{formatLKR(due.amount - due.amountPaid - due.waivedAmount)}</p>
                          <Badge className="text-[10px] bg-amber-100 text-amber-700">unpaid</Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card className="py-8 text-center">
                <CreditCard className="h-10 w-10 mx-auto mb-2 text-muted-foreground/30" />
                <p className="text-sm text-muted-foreground">No outstanding dues</p>
              </Card>
            )}

            {/* Recent Payments */}
            {hasPayments && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Recent Payments</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="divide-y">
                    {student.payments!.map((payment) => (
                      <div key={payment.id} className="flex items-center justify-between p-3">
                        <div>
                          <p className="text-sm font-medium">{formatLKR(payment.amount)}</p>
                          <p className="text-xs text-muted-foreground">
                            {formatDate(payment.recordedAt)} · {payment.paymentMethod}
                          </p>
                        </div>
                        <Badge className="text-[10px] bg-emerald-100 text-emerald-700">{payment.status}</Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        {/* ─── NOTES TAB ─── */}
        <TabsContent value="notes" className="mt-4">
          <div className="space-y-3">
            <div className="flex justify-end">
              <Button size="sm" className="gap-2" onClick={() => setNoteOpen(true)}>
                <Plus className="h-4 w-4" />Add Note
              </Button>
            </div>

            {hasNotes ? (
              <div className="space-y-2">
                {student.notes!.map((note) => (
                  <Card key={note.id} className={note.isFlagged ? 'border-amber-200 bg-amber-50/50' : ''}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            {note.isFlagged && <Flag className="h-3.5 w-3.5 text-amber-500" />}
                            <span className="text-xs text-muted-foreground">{timeAgo(note.createdAt)}</span>
                          </div>
                          {editingNoteId === note.id ? (
                            <div className="space-y-2">
                              <Textarea
                                value={editNoteText}
                                onChange={(e) => setEditNoteText(e.target.value)}
                                className="min-h-[60px] text-sm"
                              />
                              <div className="flex gap-2">
                                <Button size="sm" onClick={() => handleSaveNote(note.id)}>Save</Button>
                                <Button size="sm" variant="ghost" onClick={() => setEditingNoteId(null)}>Cancel</Button>
                              </div>
                            </div>
                          ) : (
                            <p className="text-sm whitespace-pre-wrap">{note.note}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => startEditNote(note)}>
                            <Edit3 className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDeleteNote(note.id)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card className="py-12 text-center">
                <StickyNote className="h-10 w-10 mx-auto mb-2 text-muted-foreground/30" />
                <p className="text-sm text-muted-foreground">No notes yet</p>
                <p className="text-xs text-muted-foreground mt-1">Add notes to keep track of important information about this student</p>
              </Card>
            )}
          </div>
        </TabsContent>

        {/* ─── TIMELINE TAB ─── */}
        <TabsContent value="timeline" className="mt-4">
          {hasTimeline ? (
            <Card>
              <CardContent className="p-0">
                <div className="divide-y">
                  {student.timelines!.map((entry) => (
                    <div key={entry.id} className="flex items-start gap-3 p-4">
                      <div className="mt-0.5 shrink-0">
                        {timelineIcons[entry.type] || <History className="h-4 w-4 text-muted-foreground" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm">{entry.description}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {formatDate(entry.createdAt)}
                          {entry.type && (
                            <Badge variant="outline" className="text-[10px] ml-2">{entry.type}</Badge>
                          )}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="py-12 text-center">
              <History className="h-10 w-10 mx-auto mb-2 text-muted-foreground/30" />
              <p className="text-sm text-muted-foreground">No activity recorded yet</p>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* ─── EDIT DIALOG ─── */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Student</DialogTitle>
            <DialogDescription>Update student information</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>First Name <span className="text-destructive">*</span></Label>
                <Input value={editForm.firstName} onChange={(e) => setEditForm({ ...editForm, firstName: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Last Name <span className="text-destructive">*</span></Label>
                <Input value={editForm.lastName} onChange={(e) => setEditForm({ ...editForm, lastName: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Gender</Label>
                <Select value={editForm.gender} onValueChange={(v) => setEditForm({ ...editForm, gender: v })}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Male">Male</SelectItem>
                    <SelectItem value="Female">Female</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Date of Birth</Label>
                <Input type="date" value={editForm.dob} onChange={(e) => setEditForm({ ...editForm, dob: e.target.value })} />
              </div>
            </div>
            <Separator />
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Mobile</Label>
                <Input value={editForm.mobile} onChange={(e) => setEditForm({ ...editForm, mobile: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>WhatsApp</Label>
                <Input value={editForm.whatsapp} onChange={(e) => setEditForm({ ...editForm, whatsapp: e.target.value })} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Email</Label>
              <Input type="email" value={editForm.email} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Address</Label>
              <Input value={editForm.address} onChange={(e) => setEditForm({ ...editForm, address: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>City</Label>
                <Input value={editForm.city} onChange={(e) => setEditForm({ ...editForm, city: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>District</Label>
                <Input value={editForm.district} onChange={(e) => setEditForm({ ...editForm, district: e.target.value })} />
              </div>
            </div>
            <Separator />
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Grade</Label>
                <Select value={editForm.grade} onValueChange={(v) => setEditForm({ ...editForm, grade: v })}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    {GRADE_OPTIONS.map((g) => <SelectItem key={g} value={g}>{g}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Exam Year</Label>
                <Input type="number" value={editForm.examYear} onChange={(e) => setEditForm({ ...editForm, examYear: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>School</Label>
                <Input value={editForm.schoolName} onChange={(e) => setEditForm({ ...editForm, schoolName: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Stream (A/L)</Label>
                <Select value={editForm.stream} onValueChange={(v) => setEditForm({ ...editForm, stream: v })}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    {STREAM_OPTIONS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
            <Button onClick={handleEdit} disabled={editLoading}>
              {editLoading ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── DELETE DIALOG ─── */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Deactivate Student</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to deactivate <strong>{student.fullName}</strong>?
              This will deactivate their batch enrollments. All history will be preserved.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={deleteLoading} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {deleteLoading ? 'Deactivating...' : 'Deactivate'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ─── ADD NOTE DIALOG ─── */}
      <Dialog open={noteOpen} onOpenChange={setNoteOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Note</DialogTitle>
            <DialogDescription>Add a note for {student.fullName}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Textarea
              placeholder="Write your note here..."
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              className="min-h-[100px]"
            />
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={noteFlagged}
                onChange={(e) => setNoteFlagged(e.target.checked)}
                className="rounded border-gray-300"
              />
              <Flag className="h-4 w-4 text-amber-500" />
              <span className="text-sm">Flag as important</span>
            </label>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNoteOpen(false)}>Cancel</Button>
            <Button onClick={handleAddNote} disabled={noteLoading || !noteText.trim()}>
              {noteLoading ? 'Saving...' : 'Add Note'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
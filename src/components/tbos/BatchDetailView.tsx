'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAppStore } from '@/lib/store'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { ArrowLeft, Users, DollarSign, Layers, CalendarDays, Plus, Loader2, UserCircle } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

/* ─── Types ─── */

interface BatchDetail {
  id: string
  name: string
  gradeLevel?: string
  classType: string
  status: string
  maxStudents?: number
  monthlyFee?: number
  subject: { id: string; name: string; code?: string; color?: string } | null
  teacher: { id: string; user?: { firstName?: string; lastName?: string; email?: string; mobile?: string } } | null
  branch: { name?: string } | null
  _count: { students: number; sessions: number }
}

interface Enrollment {
  studentId: string
  status: string
  enrolledAt: string
  student: {
    id: string
    fullName?: string
    studentNumber?: string
    mobile?: string
    status?: string
    schoolName?: string
    grade?: string
  } | null
}

interface SessionItem {
  id: string
  sessionDate: string
  startTime?: string
  endTime?: string
  topic?: string
  status: string
  isOnline: boolean
  batch?: { name: string; classType?: string } | null
  teacher?: { firstName?: string; lastName?: string } | null
  hall?: { name?: string } | null
  _attendanceSummary?: { total: number; present: number }
}

interface StudentOption {
  id: string
  fullName: string
  studentNumber?: string
}

/* ─── Helpers ─── */

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

const enrollmentStatusColors: Record<string, string> = {
  active: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  withdrawn: 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400',
  suspended: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  completed: 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400',
}

const sessionStatusColors: Record<string, string> = {
  completed: 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400',
  scheduled: 'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400',
  live: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  cancelled: 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400',
}

function formatLKR(amount?: number | null): string {
  if (!amount) return 'Rs. 0'
  return `Rs. ${amount.toLocaleString('en-LK')}`
}

function formatTime(timeStr?: string): string {
  if (!timeStr) return ''
  const [h, m] = timeStr.split(':').map(Number)
  const ampm = h >= 12 ? 'PM' : 'AM'
  const hour12 = h % 12 || 12
  return `${hour12}:${m.toString().padStart(2, '0')} ${ampm}`
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr)
  return date.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })
}

function formatShortDate(dateStr: string): string {
  const date = new Date(dateStr)
  return date.toLocaleDateString('en-US', { day: 'numeric', month: 'short' })
}

/* ─── Component ─── */

export default function BatchDetailView() {
  const { goBack, currentInstitute, selectedBatchId, setActiveView, setSelectedStudentId } =
    useAppStore()
  const { toast } = useToast()
  const instituteId = currentInstitute?.id

  // Data states
  const [batch, setBatch] = useState<BatchDetail | null>(null)
  const [enrollments, setEnrollments] = useState<Enrollment[]>([])
  const [sessions, setSessions] = useState<SessionItem[]>([])
  const [loading, setLoading] = useState(true)
  const [enrollLoading, setEnrollLoading] = useState(false)
  const [sessionsLoading, setSessionsLoading] = useState(false)

  // Enroll dialog
  const [enrollDialogOpen, setEnrollDialogOpen] = useState(false)
  const [availableStudents, setAvailableStudents] = useState<StudentOption[]>([])
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([])
  const [enrolling, setEnrolling] = useState(false)

  const fetchBatch = useCallback(async () => {
    if (!selectedBatchId) return
    setLoading(true)
    try {
      const res = await fetch(`/api/batches/${selectedBatchId}`)
      if (res.ok) {
        const data = await res.json()
        setBatch(data)
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [selectedBatchId])

  const fetchEnrollments = useCallback(async () => {
    if (!selectedBatchId) return
    setEnrollLoading(true)
    try {
      const res = await fetch(`/api/batches/${selectedBatchId}/enroll`)
      if (res.ok) {
        const data = await res.json()
        setEnrollments(data.enrollments || [])
      }
    } catch (err) {
      console.error(err)
    } finally {
      setEnrollLoading(false)
    }
  }, [selectedBatchId])

  const fetchSessions = useCallback(async () => {
    if (!selectedBatchId || !instituteId) return
    setSessionsLoading(true)
    try {
      const params = new URLSearchParams({
        instituteId,
        batchId: selectedBatchId,
        limit: '50',
      })
      const res = await fetch(`/api/sessions?${params}`)
      if (res.ok) {
        const data = await res.json()
        setSessions(data.sessions || [])
      }
    } catch (err) {
      console.error(err)
    } finally {
      setSessionsLoading(false)
    }
  }, [selectedBatchId, instituteId])

  useEffect(() => {
    fetchBatch()
  }, [fetchBatch])

  useEffect(() => {
    fetchEnrollments()
    fetchSessions()
  }, [fetchEnrollments, fetchSessions])

  // Enroll dialog: fetch available students
  useEffect(() => {
    if (!enrollDialogOpen || !instituteId) return
    ;(async () => {
      try {
        const res = await fetch(`/api/students?instituteId=${instituteId}&limit=200`)
        if (res.ok) {
          const data = await res.json()
          const enrolledIds = new Set(enrollments.map((e) => e.studentId))
          const available = (data.students || []).filter((s: StudentOption) => !enrolledIds.has(s.id))
          setAvailableStudents(available)
        }
      } catch (err) {
        console.error(err)
      }
    })()
  }, [enrollDialogOpen, instituteId, enrollments])

  const handleEnroll = async () => {
    if (selectedStudentIds.length === 0 || !selectedBatchId) return
    setEnrolling(true)
    try {
      const res = await fetch(`/api/batches/${selectedBatchId}/enroll`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentIds: selectedStudentIds }),
      })
      if (res.ok) {
        const result = await res.json()
        const msg = [
          result.enrolled ? `${result.enrolled} enrolled` : '',
          result.reactivated ? `${result.reactivated} reactivated` : '',
          result.skipped ? `${result.skipped} already enrolled` : '',
        ]
          .filter(Boolean)
          .join(', ')
        toast({ title: 'Students enrolled', description: msg || 'Done' })
        setEnrollDialogOpen(false)
        setSelectedStudentIds([])
        fetchEnrollments()
        fetchBatch() // refresh student count
      } else {
        const err = await res.json()
        toast({
          title: 'Enrollment failed',
          description: err.error || 'Failed to enroll students',
          variant: 'destructive',
        })
      }
    } catch (err) {
      console.error(err)
      toast({ title: 'Error', description: 'Failed to enroll students', variant: 'destructive' })
    } finally {
      setEnrolling(false)
    }
  }

  const handleRemoveStudent = async (studentId: string, studentName: string) => {
    if (!selectedBatchId) return
    try {
      const res = await fetch(
        `/api/batches/${selectedBatchId}/enroll?studentId=${studentId}`,
        { method: 'DELETE' }
      )
      if (res.ok) {
        toast({ title: 'Student removed', description: `${studentName} has been withdrawn` })
        fetchEnrollments()
        fetchBatch()
      } else {
        const err = await res.json()
        toast({
          title: 'Error',
          description: err.error || 'Failed to remove student',
          variant: 'destructive',
        })
      }
    } catch (err) {
      console.error(err)
    }
  }

  const toggleStudent = (id: string) => {
    setSelectedStudentIds((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    )
  }

  const teacherName = batch?.teacher?.user
    ? `${batch.teacher.user.firstName || ''} ${batch.teacher.user.lastName || ''}`.trim()
    : 'No teacher assigned'

  /* ─── Loading state ─── */
  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-9 w-32" />
        <Skeleton className="h-32 w-full rounded-lg" />
        <div className="grid sm:grid-cols-3 gap-4">
          <Skeleton className="h-24 rounded-lg" />
          <Skeleton className="h-24 rounded-lg" />
          <Skeleton className="h-24 rounded-lg" />
        </div>
      </div>
    )
  }

  if (!batch) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" onClick={goBack} className="gap-2">
          <ArrowLeft className="h-4 w-4" /> Back to Batches
        </Button>
        <div className="text-center py-16">
          <Layers className="h-12 w-12 mx-auto mb-3 text-muted-foreground/30" />
          <p className="font-medium text-muted-foreground">Batch not found</p>
        </div>
      </div>
    )
  }

  const isOnline = batch.classType === 'online' || batch.classType === 'hybrid'

  return (
    <div className="space-y-6">
      {/* Back button */}
      <Button variant="ghost" size="sm" onClick={goBack} className="gap-2">
        <ArrowLeft className="h-4 w-4" /> Back to Batches
      </Button>

      {/* Header */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <h1 className="text-xl font-bold">{batch.name}</h1>
                <Badge
                  variant="outline"
                  className={`text-xs ${typeColors[batch.classType] || ''}`}
                >
                  {batch.classType}
                </Badge>
                <Badge
                  className={`text-xs ${statusColors[batch.status] || 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'}`}
                >
                  {batch.status}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                {batch.subject ? batch.subject.name : 'No subject'}
                {batch.teacher?.user ? ` · ${teacherName}` : ' · No teacher assigned'}
              </p>
              {batch.gradeLevel && (
                <p className="text-sm text-muted-foreground mt-0.5">{batch.gradeLevel}</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center">
              <Users className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            </div>
          </div>
          <p className="text-2xl font-bold">{batch._count?.students || 0}</p>
          <p className="text-xs text-muted-foreground">
            Enrolled{batch.maxStudents ? ` / Max ${batch.maxStudents}` : ''}
          </p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-amber-50 dark:bg-amber-900/20 flex items-center justify-center">
              <DollarSign className="h-4 w-4 text-amber-600 dark:text-amber-400" />
            </div>
          </div>
          <p className="text-2xl font-bold">{formatLKR(batch.monthlyFee)}</p>
          <p className="text-xs text-muted-foreground">Monthly Fee</p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-teal-50 dark:bg-teal-900/20 flex items-center justify-center">
              <CalendarDays className="h-4 w-4 text-teal-600 dark:text-teal-400" />
            </div>
          </div>
          <p className="text-2xl font-bold">{batch._count?.sessions || 0}</p>
          <p className="text-xs text-muted-foreground">Total Sessions</p>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="students">
        <TabsList>
          <TabsTrigger value="students">
            Students ({batch._count?.students || 0})
          </TabsTrigger>
          <TabsTrigger value="sessions">
            Sessions ({batch._count?.sessions || 0})
          </TabsTrigger>
        </TabsList>

        {/* ─── Students Tab ─── */}
        <TabsContent value="students" className="mt-4">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm">Enrolled Students</CardTitle>
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1"
                  onClick={() => setEnrollDialogOpen(true)}
                >
                  <Plus className="h-3 w-3" /> Enroll Student
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {enrollLoading ? (
                <div className="space-y-3">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <Skeleton key={i} className="h-14 w-full rounded-lg" />
                  ))}
                </div>
              ) : enrollments.length === 0 ? (
                <div className="py-8 text-center">
                  <Users className="h-10 w-10 mx-auto mb-2 text-muted-foreground/30" />
                  <p className="text-sm font-medium text-muted-foreground">No students enrolled yet</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Click &quot;Enroll Student&quot; to add students to this batch
                  </p>
                </div>
              ) : (
                <div className="divide-y max-h-[480px] overflow-y-auto">
                  {enrollments.map((enr) => (
                    <div
                      key={enr.studentId}
                      className="flex items-center justify-between py-3"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-8 h-8 rounded-full bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center text-emerald-700 dark:text-emerald-400 text-xs font-bold shrink-0">
                          {enr.student?.fullName
                            ? enr.student.fullName
                                .split(' ')
                                .map((n) => n[0])
                                .join('')
                                .slice(0, 2)
                                .toUpperCase()
                            : '??'}
                        </div>
                        <div className="min-w-0">
                          <button
                            className="text-sm font-medium hover:underline text-left truncate block max-w-[200px]"
                            onClick={() => {
                              setSelectedStudentId(enr.studentId)
                              setActiveView('student-detail')
                            }}
                          >
                            {enr.student?.fullName || 'Unknown Student'}
                          </button>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            {enr.student?.studentNumber && <span>{enr.student.studentNumber}</span>}
                            {enr.enrolledAt && (
                              <span>· Enrolled {formatShortDate(enr.enrolledAt)}</span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Badge
                          className={`text-[10px] ${
                            enrollmentStatusColors[enr.status] || 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
                          }`}
                        >
                          {enr.status}
                        </Badge>
                        {enr.status === 'active' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive text-xs h-7"
                            onClick={() =>
                              handleRemoveStudent(
                                enr.studentId,
                                enr.student?.fullName || 'Student'
                              )
                            }
                          >
                            Remove
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─── Sessions Tab ─── */}
        <TabsContent value="sessions" className="mt-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Session History</CardTitle>
            </CardHeader>
            <CardContent>
              {sessionsLoading ? (
                <div className="space-y-3">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <Skeleton key={i} className="h-16 w-full rounded-lg" />
                  ))}
                </div>
              ) : sessions.length === 0 ? (
                <div className="py-8 text-center">
                  <CalendarDays className="h-10 w-10 mx-auto mb-2 text-muted-foreground/30" />
                  <p className="text-sm font-medium text-muted-foreground">No sessions yet</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Sessions will appear here once scheduled
                  </p>
                </div>
              ) : (
                <div className="divide-y max-h-[480px] overflow-y-auto">
                  {sessions.map((session) => (
                    <div key={session.id} className="flex items-center justify-between py-3">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">
                          {session.topic || 'Untitled Session'}
                        </p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                          <span>{formatDate(session.sessionDate)}</span>
                          {session.startTime && <span>· {formatTime(session.startTime)}</span>}
                          {session.hall?.name && <span>· {session.hall.name}</span>}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0 ml-3">
                        {session.isOnline && (
                          <Badge variant="outline" className="text-[10px]">
                            Online
                          </Badge>
                        )}
                        <Badge
                          className={`text-[10px] ${
                            sessionStatusColors[session.status] || 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
                          }`}
                        >
                          {session.status === 'live' && (
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1 animate-pulse inline-block" />
                          )}
                          {session.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ─── Enroll Student Dialog ─── */}
      <Dialog open={enrollDialogOpen} onOpenChange={setEnrollDialogOpen}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Enroll Students</DialogTitle>
            <DialogDescription>
              Select students to enroll in {batch.name}
            </DialogDescription>
          </DialogHeader>
          {availableStudents.length === 0 ? (
            <div className="py-8 text-center">
              <UserCircle className="h-10 w-10 mx-auto mb-2 text-muted-foreground/30" />
              <p className="text-sm text-muted-foreground">No available students to enroll</p>
              <p className="text-xs text-muted-foreground mt-1">
                All students may already be enrolled in this batch
              </p>
            </div>
          ) : (
            <div className="space-y-2 max-h-[360px] overflow-y-auto">
              {availableStudents.map((student) => (
                <label
                  key={student.id}
                  className="flex items-center gap-3 p-2 rounded-md hover:bg-muted/50 cursor-pointer"
                >
                  <Checkbox
                    checked={selectedStudentIds.includes(student.id)}
                    onCheckedChange={() => toggleStudent(student.id)}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{student.fullName}</p>
                    {student.studentNumber && (
                      <p className="text-xs text-muted-foreground">{student.studentNumber}</p>
                    )}
                  </div>
                </label>
              ))}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEnrollDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleEnroll}
              disabled={enrolling || selectedStudentIds.length === 0}
            >
              {enrolling && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Enroll {selectedStudentIds.length > 0 ? `${selectedStudentIds.length} Student${selectedStudentIds.length > 1 ? 's' : ''}` : 'Students'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAppStore } from '@/lib/store'
import { useToast } from '@/hooks/use-toast'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import {
  CalendarDays, CheckCircle, XCircle, Clock, AlertCircle,
  ClipboardCheck, Loader2, Users, ChevronLeft, ChevronRight,
} from 'lucide-react'
import { format, addDays } from 'date-fns'

// ── Types ───────────────────────────────────────────────────────────────────

type StatusType = 'present' | 'absent' | 'late' | 'excused'

interface BatchOption {
  id: string
  name: string
  subject?: { name: string; color?: string } | null
  _count: { students: number }
  status: string
}

interface SessionOption {
  id: string
  sessionDate: string
  startTime?: string
  topic?: string
  status: string
}

interface MarkStudent {
  studentId: string
  fullName: string
  studentNumber: string
  gender?: string
  status: StatusType
}

interface HistoryRecord {
  id: string
  studentId: string
  classSessionId: string
  status: string
  markedAt: string
  student: { id: string; fullName: string; studentNumber: string; gender: string } | null
  classSession: {
    id: string
    sessionDate: string
    startTime?: string
    topic?: string
    batch?: { name: string } | null
  } | null
}

// ── Constants ───────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<StatusType, { label: string; color: string; icon: typeof CheckCircle }> = {
  present: { label: 'Present', color: 'bg-emerald-100 text-emerald-700 border-emerald-300 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-700', icon: CheckCircle },
  absent: { label: 'Absent', color: 'bg-red-100 text-red-700 border-red-300 dark:bg-red-900/30 dark:text-red-400 dark:border-red-700', icon: XCircle },
  late: { label: 'Late', color: 'bg-amber-100 text-amber-700 border-amber-300 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-700', icon: Clock },
  excused: { label: 'Excused', color: 'bg-sky-100 text-sky-700 border-sky-300 dark:bg-sky-900/30 dark:text-sky-400 dark:border-sky-700', icon: AlertCircle },
}

const STATUS_BADGE: Record<string, string> = {
  present: 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800',
  absent: 'bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800',
  late: 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800',
  excused: 'bg-sky-100 text-sky-700 border-sky-200 dark:bg-sky-900/30 dark:text-sky-400 dark:border-sky-800',
}

const ALL_STATUSES: StatusType[] = ['present', 'absent', 'late', 'excused']

// ── Helpers ─────────────────────────────────────────────────────────────────

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

function formatDateShort(dateStr: string): string {
  try {
    return format(new Date(dateStr), 'dd MMM yyyy')
  } catch {
    return dateStr
  }
}

function formatDateTime(dateStr: string): string {
  try {
    return format(new Date(dateStr), 'dd MMM yyyy, hh:mm a')
  } catch {
    return dateStr
  }
}

function formatTime(timeStr?: string): string {
  if (!timeStr) return ''
  const [h, m] = timeStr.split(':').map(Number)
  const ampm = h >= 12 ? 'PM' : 'AM'
  const hour12 = h % 12 || 12
  return `${hour12}:${m.toString().padStart(2, '0')} ${ampm}`
}

// ── Component ───────────────────────────────────────────────────────────────

export default function AttendanceView() {
  const { currentInstitute, currentUser } = useAppStore()
  const { toast } = useToast()
  const instituteId = currentInstitute?.id

  // ── Shared: Batches ────────────────────────────────────────────────────
  const [batches, setBatches] = useState<BatchOption[]>([])
  const [batchesLoading, setBatchesLoading] = useState(true)

  useEffect(() => {
    if (!instituteId) return
    let cancelled = false
    setBatchesLoading(true)
    fetch(`/api/batches?instituteId=${instituteId}&status=active`)
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => {
        if (!cancelled) setBatches(data.batches || [])
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setBatchesLoading(false) })
    return () => { cancelled = true }
  }, [instituteId])

  // ── MARK TAB STATE ─────────────────────────────────────────────────────
  const [markBatchId, setMarkBatchId] = useState('')
  const [markDate, setMarkDate] = useState<Date | undefined>(new Date())
  const [sessions, setSessions] = useState<SessionOption[]>([])
  const [selectedSessionId, setSelectedSessionId] = useState('')
  const [markStudents, setMarkStudents] = useState<MarkStudent[]>([])
  const [sheetLoading, setSheetLoading] = useState(false)
  const [saving, setSaving] = useState(false)

  // Fetch sessions when batch + date selected
  const fetchSessions = useCallback(async (batchId: string, date: Date | undefined) => {
    if (!instituteId || !batchId || !date) {
      setSessions([])
      setSelectedSessionId('')
      setMarkStudents([])
      return
    }
    setSheetLoading(true)
    setSessions([])
    setSelectedSessionId('')
    setMarkStudents([])
    try {
      const dateStr = format(date, 'yyyy-MM-dd')
      const nextDay = format(addDays(date, 1), 'yyyy-MM-dd')
      const res = await fetch(
        `/api/sessions?instituteId=${instituteId}&batchId=${batchId}&dateFrom=${dateStr}&dateTo=${nextDay}&limit=50`
      )
      if (!res.ok) throw new Error()
      const data = await res.json()
      const sess: SessionOption[] = (data.sessions || []).map((s: any) => ({
        id: s.id,
        sessionDate: s.sessionDate,
        startTime: s.startTime,
        topic: s.topic,
        status: s.status,
      }))
      setSessions(sess)
      // If only one session, auto-select it
      if (sess.length === 1) {
        setSelectedSessionId(sess[0].id)
      }
      // If no sessions, load enrolled students directly
      if (sess.length === 0) {
        await loadEnrolledStudents(batchId)
      }
    } catch {
      toast({ title: 'Error', description: 'Failed to load sessions', variant: 'destructive' })
      setSessions([])
    } finally {
      setSheetLoading(false)
    }
  }, [instituteId, toast])

  // Load sheet when session selected
  useEffect(() => {
    if (!selectedSessionId) return
    let cancelled = false
    setSheetLoading(true)
    setMarkStudents([])
    fetch(`/api/attendance/sheet?classSessionId=${selectedSessionId}`)
      .then((r) => {
        if (!r.ok) throw new Error()
        return r.json()
      })
      .then((data) => {
        if (cancelled) return
        const students: MarkStudent[] = (data.sheet || []).map((row: any) => ({
          studentId: row.studentId,
          fullName: row.student?.fullName || 'Unknown',
          studentNumber: row.student?.studentNumber || '',
          gender: row.student?.gender,
          status: (row.status && ALL_STATUSES.includes(row.status) ? row.status : 'present') as StatusType,
        }))
        setMarkStudents(students)
      })
      .catch(() => {
        if (!cancelled) toast({ title: 'Error', description: 'Failed to load attendance sheet', variant: 'destructive' })
      })
      .finally(() => { if (!cancelled) setSheetLoading(false) })
    return () => { cancelled = true }
  }, [selectedSessionId, toast])

  // Load enrolled students (ad-hoc / no session case)
  const loadEnrolledStudents = async (batchId: string) => {
    setSheetLoading(true)
    try {
      const res = await fetch(`/api/batches/${batchId}/enroll`)
      if (!res.ok) throw new Error()
      const data = await res.json()
      const active = (data.enrollments || []).filter((e: any) => e.status === 'active')
      const students: MarkStudent[] = active.map((e: any) => ({
        studentId: e.studentId,
        fullName: e.student?.fullName || 'Unknown',
        studentNumber: e.student?.studentNumber || '',
        gender: e.student?.gender,
        status: 'present' as StatusType,
      }))
      setMarkStudents(students)
    } catch {
      toast({ title: 'Error', description: 'Failed to load students', variant: 'destructive' })
      setMarkStudents([])
    } finally {
      setSheetLoading(false)
    }
  }

  // Handle batch change in mark tab
  const handleMarkBatchChange = (batchId: string) => {
    setMarkBatchId(batchId)
    fetchSessions(batchId, markDate)
  }

  // Handle date change in mark tab
  const handleMarkDateChange = (date: Date | undefined) => {
    setMarkDate(date)
    fetchSessions(markBatchId, date)
  }

  // Toggle student status
  const toggleStatus = (studentId: string, status: StatusType) => {
    setMarkStudents((prev) =>
      prev.map((s) => (s.studentId === studentId ? { ...s, status } : s))
    )
  }

  // Mark all present
  const markAllPresent = () => {
    setMarkStudents((prev) => prev.map((s) => ({ ...s, status: 'present' as StatusType })))
  }

  // Save attendance
  const handleSave = async () => {
    if (!instituteId || !markBatchId || !markDate || markStudents.length === 0) return
    setSaving(true)
    try {
      let sessionId = selectedSessionId
      // If no session exists, create one first
      if (!sessionId) {
        const sessionRes = await fetch('/api/sessions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            instituteId,
            batchId: markBatchId,
            sessionDate: format(markDate, 'yyyy-MM-dd'),
            topic: `Attendance - ${format(markDate, 'dd MMM yyyy')}`,
            createdBy: currentUser?.id,
          }),
        })
        if (!sessionRes.ok) throw new Error('Failed to create session')
        const sessionData = await sessionRes.json()
        sessionId = sessionData.session?.id
        if (!sessionId) throw new Error('No session ID returned')
      }

      // Save attendance records
      const attRes = await fetch('/api/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          classSessionId: sessionId,
          instituteId,
          batchId: markBatchId,
          markedBy: currentUser?.id,
          records: markStudents.map((s) => ({ studentId: s.studentId, status: s.status })),
        }),
      })
      if (!attRes.ok) throw new Error('Failed to save attendance')
      const attData = await attRes.json()
      toast({
        title: 'Attendance saved',
        description: `${attData.saved} record${attData.saved !== 1 ? 's' : ''} saved successfully`,
      })
      // Reload to reflect saved state
      if (selectedSessionId) {
        setSelectedSessionId('')
        setTimeout(() => setSelectedSessionId(sessionId), 50)
      } else {
        // Now we have a session, set it and reload sheet
        setSelectedSessionId(sessionId)
      }
    } catch (err: any) {
      toast({ title: 'Save failed', description: err.message || 'Something went wrong', variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  // Mark tab summary counts
  const markCounts = {
    present: markStudents.filter((s) => s.status === 'present').length,
    absent: markStudents.filter((s) => s.status === 'absent').length,
    late: markStudents.filter((s) => s.status === 'late').length,
    excused: markStudents.filter((s) => s.status === 'excused').length,
    total: markStudents.length,
  }

  // ── HISTORY TAB STATE ──────────────────────────────────────────────────
  const [histBatchId, setHistBatchId] = useState('')
  const [histDateFrom, setHistDateFrom] = useState<Date | undefined>(undefined)
  const [histDateTo, setHistDateTo] = useState<Date | undefined>(undefined)
  const [histRecords, setHistRecords] = useState<HistoryRecord[]>([])
  const [histSummary, setHistSummary] = useState({ total: 0, present: 0, absent: 0, late: 0, rate: 0 })
  const [histPage, setHistPage] = useState(1)
  const [histTotalPages, setHistTotalPages] = useState(1)
  const [histTotal, setHistTotal] = useState(0)
  const [histLoading, setHistLoading] = useState(false)

  const fetchHistory = useCallback(async (page: number) => {
    if (!instituteId) return
    setHistLoading(true)
    try {
      const params = new URLSearchParams({ instituteId, page: String(page), limit: '20' })
      if (histBatchId) params.set('batchId', histBatchId)
      if (histDateFrom) params.set('dateFrom', format(histDateFrom, 'yyyy-MM-dd'))
      if (histDateTo) params.set('dateTo', format(addDays(histDateTo, 1), 'yyyy-MM-dd'))
      const res = await fetch(`/api/attendance?${params}`)
      if (!res.ok) throw new Error()
      const data = await res.json()
      setHistRecords(data.records || [])
      setHistSummary(data.summary || { total: 0, present: 0, absent: 0, late: 0, rate: 0 })
      setHistTotalPages(data.pagination?.totalPages || 1)
      setHistTotal(data.pagination?.total || 0)
    } catch {
      toast({ title: 'Error', description: 'Failed to load attendance history', variant: 'destructive' })
    } finally {
      setHistLoading(false)
    }
  }, [instituteId, histBatchId, histDateFrom, histDateTo, toast])

  useEffect(() => {
    setHistPage(1)
    fetchHistory(1)
  }, [fetchHistory])

  const handleHistPageChange = (page: number) => {
    setHistPage(page)
    fetchHistory(page)
  }

  const clearHistFilters = () => {
    setHistBatchId('')
    setHistDateFrom(undefined)
    setHistDateTo(undefined)
  }

  const hasHistFilters = histBatchId || histDateFrom || histDateTo

  // Pagination range for history
  const getHistPageNumbers = (): (number | '...')[] => {
    if (histTotalPages <= 5) return Array.from({ length: histTotalPages }, (_, i) => i + 1)
    const pages: (number | '...')[] = [1]
    const start = Math.max(2, histPage - 1)
    const end = Math.min(histTotalPages - 1, histPage + 1)
    if (start > 2) pages.push('...')
    for (let i = start; i <= end; i++) pages.push(i)
    if (end < histTotalPages - 1) pages.push('...')
    pages.push(histTotalPages)
    return pages
  }

  const histFrom = (histPage - 1) * 20 + 1
  const histTo = Math.min(histPage * 20, histTotal)

  // ── No Institute Guard ─────────────────────────────────────────────────
  if (!instituteId) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Attendance</h1>
          <p className="text-sm text-muted-foreground">Track and manage student attendance</p>
        </div>
        <Card>
          <CardContent className="p-8 text-center">
            <AlertCircle className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
            <p className="font-medium text-muted-foreground">No institute selected</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  // ── Render ─────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Attendance</h1>
        <p className="text-sm text-muted-foreground">Track and manage student attendance</p>
      </div>

      <Tabs defaultValue="mark" className="space-y-4">
        <TabsList>
          <TabsTrigger value="mark" className="gap-2">
            <ClipboardCheck className="h-4 w-4" />
            Mark Attendance
          </TabsTrigger>
          <TabsTrigger value="history" className="gap-2">
            <CalendarDays className="h-4 w-4" />
            History
          </TabsTrigger>
        </TabsList>

        {/* ═══════════════════════ MARK ATTENDANCE TAB ═══════════════════════ */}
        <TabsContent value="mark" className="space-y-4">
          {/* Controls */}
          <Card>
            <CardContent className="p-4">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1 space-y-2">
                  <Label>Batch</Label>
                  {batchesLoading ? (
                    <Skeleton className="h-10 w-full" />
                  ) : batches.length === 0 ? (
                    <div className="h-10 rounded-md border border-dashed flex items-center justify-center text-sm text-muted-foreground">
                      No active batches
                    </div>
                  ) : (
                    <Select value={markBatchId} onValueChange={handleMarkBatchChange}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a batch..." />
                      </SelectTrigger>
                      <SelectContent>
                        {batches.map((b) => (
                          <SelectItem key={b.id} value={b.id}>
                            {b.name}
                            <span className="ml-2 text-muted-foreground text-xs">
                              ({b._count.students} students)
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
                <div className="space-y-2">
                  <Label>Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full sm:w-auto gap-2">
                        <CalendarDays className="h-4 w-4" />
                        {markDate ? format(markDate, 'dd MMM yyyy') : 'Pick date'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar mode="single" selected={markDate} onSelect={handleMarkDateChange} />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Session Selector */}
          {markBatchId && markDate && sessions.length > 1 && (
            <Card>
              <CardContent className="p-4">
                <div className="space-y-2">
                  <Label>Session</Label>
                  <Select value={selectedSessionId} onValueChange={setSelectedSessionId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a session..." />
                    </SelectTrigger>
                    <SelectContent>
                      {sessions.map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.topic || 'Untitled Session'}
                          {s.startTime && ` · ${formatTime(s.startTime)}`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Session Info Badge */}
          {sessions.length === 1 && markBatchId && (
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs">
                <Clock className="h-3 w-3 mr-1" />
                {sessions[0].topic || 'Untitled'} {sessions[0].startTime && `· ${formatTime(sessions[0].startTime)}`}
              </Badge>
            </div>
          )}

          {/* Student List */}
          {markBatchId && markDate && (
            <>
              {/* Summary Bar */}
              {!sheetLoading && markStudents.length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <Card className="p-3 text-center">
                    <p className="text-lg font-bold text-emerald-600">{markCounts.present}</p>
                    <p className="text-[11px] text-muted-foreground">Present</p>
                  </Card>
                  <Card className="p-3 text-center">
                    <p className="text-lg font-bold text-red-600">{markCounts.absent}</p>
                    <p className="text-[11px] text-muted-foreground">Absent</p>
                  </Card>
                  <Card className="p-3 text-center">
                    <p className="text-lg font-bold text-amber-600">{markCounts.late}</p>
                    <p className="text-[11px] text-muted-foreground">Late</p>
                  </Card>
                  <Card className="p-3 text-center">
                    <p className="text-lg font-bold text-sky-600">{markCounts.excused}</p>
                    <p className="text-[11px] text-muted-foreground">Excused</p>
                  </Card>
                </div>
              )}

              {/* Action Bar */}
              {!sheetLoading && markStudents.length > 0 && (
                <div className="flex items-center justify-between gap-3">
                  <Button variant="outline" size="sm" onClick={markAllPresent} className="gap-2 shrink-0">
                    <CheckCircle className="h-4 w-4" />
                    Mark All Present
                  </Button>
                  <div className="text-sm text-muted-foreground">
                    {markCounts.total} student{markCounts.total !== 1 ? 's' : ''}
                  </div>
                  <Button size="sm" onClick={handleSave} disabled={saving} className="gap-2 shrink-0">
                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
                    {saving ? 'Saving...' : 'Save Attendance'}
                  </Button>
                </div>
              )}

              {/* Loading Skeleton */}
              {sheetLoading && (
                <div className="space-y-2">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Skeleton key={i} className="h-16 w-full rounded-lg" />
                  ))}
                </div>
              )}

              {/* Student Rows */}
              {!sheetLoading && markStudents.length > 0 && (
                <div className="space-y-2 max-h-[520px] overflow-y-auto">
                  {markStudents.map((student) => {
                    const config = STATUS_CONFIG[student.status]
                    const Icon = config.icon
                    return (
                      <Card key={student.studentId}>
                        <CardContent className="p-3 flex items-center justify-between gap-2">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-9 h-9 rounded-full bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center text-emerald-700 dark:text-emerald-400 text-xs font-bold shrink-0">
                              {getInitials(student.fullName)}
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-medium truncate">{student.fullName}</p>
                              <p className="text-xs text-muted-foreground">{student.studentNumber}</p>
                            </div>
                          </div>
                          <div className="flex gap-1 shrink-0">
                            {ALL_STATUSES.map((st) => {
                              const sc = STATUS_CONFIG[st]
                              const StIcon = sc.icon
                              const isActive = student.status === st
                              return (
                                <Button
                                  key={st}
                                  variant="outline"
                                  size="sm"
                                  className={`h-8 gap-1 text-xs transition-colors ${
                                    isActive ? sc.color + ' border' : 'opacity-40 hover:opacity-80'
                                  }`}
                                  onClick={() => toggleStatus(student.studentId, st)}
                                >
                                  <StIcon className="h-3 w-3" />
                                  <span className="hidden sm:inline">{sc.label}</span>
                                </Button>
                              )
                            })}
                          </div>
                        </CardContent>
                      </Card>
                    )
                  })}
                </div>
              )}

              {/* No Sessions & No Students */}
              {!sheetLoading && markBatchId && markDate && sessions.length === 0 && markStudents.length === 0 && (
                <Card>
                  <CardContent className="p-8 text-center">
                    <Users className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
                    <p className="font-medium text-muted-foreground">No students enrolled in this batch</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Add students to this batch to mark attendance
                    </p>
                  </CardContent>
                </Card>
              )}
            </>
          )}

          {/* Empty State: No batch/date selected */}
          {!markBatchId && (
            <Card>
              <CardContent className="py-16 text-center">
                <ClipboardCheck className="h-12 w-12 text-muted-foreground/20 mx-auto mb-3" />
                <p className="font-medium text-muted-foreground">Select a batch to mark attendance</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Choose a batch and date from above to get started
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ═══════════════════════ HISTORY TAB ═══════════════════════ */}
        <TabsContent value="history" className="space-y-4">
          {/* Filters */}
          <Card>
            <CardContent className="p-4">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1 space-y-2">
                  <Label>Batch</Label>
                  {batchesLoading ? (
                    <Skeleton className="h-10 w-full" />
                  ) : (
                    <Select value={histBatchId || '__all__'} onValueChange={(v) => setHistBatchId(v === '__all__' ? '' : v)}>
                      <SelectTrigger>
                        <SelectValue placeholder="All batches" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__all__">All batches</SelectItem>
                        {batches.map((b) => (
                          <SelectItem key={b.id} value={b.id}>
                            {b.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
                <div className="space-y-2">
                  <Label>From</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full sm:w-auto gap-2">
                        <CalendarDays className="h-4 w-4" />
                        {histDateFrom ? format(histDateFrom, 'dd MMM yyyy') : 'From'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar mode="single" selected={histDateFrom} onSelect={setHistDateFrom} />
                    </PopoverContent>
                  </Popover>
                </div>
                <div className="space-y-2">
                  <Label>To</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full sm:w-auto gap-2">
                        <CalendarDays className="h-4 w-4" />
                        {histDateTo ? format(histDateTo, 'dd MMM yyyy') : 'To'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar mode="single" selected={histDateTo} onSelect={setHistDateTo} />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
              {hasHistFilters && (
                <div className="mt-3 flex items-center gap-2">
                  <Badge variant="secondary" className="text-xs">
                    {histBatchId ? 'Filtered' : ''}
                    {histDateFrom || histDateTo ? ' Date range' : ''}
                  </Badge>
                  <Button variant="ghost" size="sm" onClick={clearHistFilters} className="text-xs h-6">
                    Clear filters
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Summary Cards */}
          {histLoading ? (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <Card key={i} className="p-4">
                  <Skeleton className="h-4 w-16 mb-2" />
                  <Skeleton className="h-8 w-20" />
                </Card>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <Card className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-muted-foreground">Total Records</span>
                  <div className="w-7 h-7 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                    <ClipboardCheck className="h-3.5 w-3.5 text-gray-500 dark:text-gray-400" />
                  </div>
                </div>
                <p className="text-2xl font-bold">{histSummary.total}</p>
              </Card>
              <Card className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-muted-foreground">Present</span>
                  <div className="w-7 h-7 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center">
                    <CheckCircle className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                  </div>
                </div>
                <p className="text-2xl font-bold text-emerald-600">{histSummary.rate}%</p>
                <p className="text-xs text-muted-foreground">{histSummary.present} records</p>
              </Card>
              <Card className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-muted-foreground">Absent</span>
                  <div className="w-7 h-7 rounded-lg bg-red-50 dark:bg-red-900/20 flex items-center justify-center">
                    <XCircle className="h-3.5 w-3.5 text-red-500 dark:text-red-400" />
                  </div>
                </div>
                <p className="text-2xl font-bold text-red-600">
                  {histSummary.total > 0 ? Math.round((histSummary.absent / histSummary.total) * 100) : 0}%
                </p>
                <p className="text-xs text-muted-foreground">{histSummary.absent} records</p>
              </Card>
              <Card className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-muted-foreground">Late</span>
                  <div className="w-7 h-7 rounded-lg bg-amber-50 dark:bg-amber-900/20 flex items-center justify-center">
                    <Clock className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
                  </div>
                </div>
                <p className="text-2xl font-bold text-amber-600">
                  {histSummary.total > 0 ? Math.round((histSummary.late / histSummary.total) * 100) : 0}%
                </p>
                <p className="text-xs text-muted-foreground">{histSummary.late} records</p>
              </Card>
            </div>
          )}

          {/* Records Table */}
          <Card>
            <CardContent className="p-0">
              {histLoading ? (
                <div className="p-4 space-y-2">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : histRecords.length === 0 ? (
                <div className="py-16 text-center">
                  <CalendarDays className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
                  <p className="font-medium text-muted-foreground">
                    {hasHistFilters ? 'No matching records' : 'No attendance records yet'}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {hasHistFilters
                      ? 'Try adjusting your filters'
                      : 'Attendance records will appear here once marked'}
                  </p>
                  {hasHistFilters && (
                    <Button variant="outline" size="sm" className="mt-4" onClick={clearHistFilters}>
                      Clear Filters
                    </Button>
                  )}
                </div>
              ) : (
                <>
                  <div className="max-h-[520px] overflow-y-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[100px]">Date</TableHead>
                          <TableHead>Student</TableHead>
                          <TableHead className="hidden lg:table-cell">Student #</TableHead>
                          <TableHead className="hidden md:table-cell">Batch</TableHead>
                          <TableHead className="hidden md:table-cell">Topic</TableHead>
                          <TableHead className="w-[90px]">Status</TableHead>
                          <TableHead className="hidden sm:table-cell">Marked At</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {histRecords.map((record) => (
                          <TableRow key={record.id}>
                            <TableCell className="text-sm">
                              {record.classSession?.sessionDate
                                ? formatDateShort(record.classSession.sessionDate)
                                : '—'}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <div className="w-7 h-7 rounded-full bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center text-emerald-700 dark:text-emerald-400 text-[10px] font-bold shrink-0">
                                  {record.student ? getInitials(record.student.fullName) : '?'}
                                </div>
                                <span className="text-sm font-medium truncate max-w-[140px]">
                                  {record.student?.fullName || 'Unknown'}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell className="hidden lg:table-cell text-sm text-muted-foreground font-mono">
                              {record.student?.studentNumber || '—'}
                            </TableCell>
                            <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                              {record.classSession?.batch?.name || '—'}
                            </TableCell>
                            <TableCell className="hidden md:table-cell text-sm text-muted-foreground truncate max-w-[160px]">
                              {record.classSession?.topic || '—'}
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant="outline"
                                className={`text-[10px] ${STATUS_BADGE[record.status] || ''}`}
                              >
                                {record.status}
                              </Badge>
                            </TableCell>
                            <TableCell className="hidden sm:table-cell text-xs text-muted-foreground">
                              {formatDateTime(record.markedAt)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>

                  {/* Pagination */}
                  {histTotalPages > 1 && (
                    <div className="flex items-center justify-between p-4 border-t">
                      <p className="text-sm text-muted-foreground">
                        Showing {histFrom}–{histTo} of {histTotal}
                      </p>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-8 w-8"
                          disabled={histPage <= 1}
                          onClick={() => handleHistPageChange(histPage - 1)}
                        >
                          <ChevronLeft className="h-4 w-4" />
                        </Button>
                        {getHistPageNumbers().map((p, idx) =>
                          p === '...' ? (
                            <span key={`dots-${idx}`} className="px-1 text-muted-foreground">
                              ...
                            </span>
                          ) : (
                            <Button
                              key={p}
                              variant={histPage === p ? 'default' : 'outline'}
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => handleHistPageChange(p)}
                            >
                              {p}
                            </Button>
                          )
                        )}
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-8 w-8"
                          disabled={histPage >= histTotalPages}
                          onClick={() => handleHistPageChange(histPage + 1)}
                        >
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
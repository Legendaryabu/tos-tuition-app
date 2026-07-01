'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAppStore } from '@/lib/store'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
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
import {
  CalendarIcon,
  Video,
  Plus,
  MapPin,
  Clock,
  Users,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Loader2,
  X,
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { format, isSameDay, parseISO } from 'date-fns'

// --- Types ---
interface SessionBatch {
  id: string
  name: string
  classType: string
  subject: { id: string; name: string; color: string } | null
}

interface SessionTeacher {
  id: string
  firstName: string
  lastName: string
}

interface SessionHall {
  id: string
  name: string
}

interface Session {
  id: string
  batchId: string
  teacherId: string
  hallId: string
  sessionDate: string
  startTime: string
  endTime: string
  durationMinutes: number
  topic: string | null
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled'
  isOnline: boolean
  isExtraClass: boolean
  batch: SessionBatch | null
  teacher: SessionTeacher | null
  hall: SessionHall | null
  _count: { attendanceRecords: number }
}

interface BatchOption {
  id: string
  name: string
  subject: { name: string; color: string } | null
}

interface TeacherOption {
  id: string
  user: { firstName: string; lastName: string } | null
}

// --- Helpers ---
function formatTime(timeStr?: string): string {
  if (!timeStr) return ''
  const [h, m] = timeStr.split(':').map(Number)
  const ampm = h >= 12 ? 'PM' : 'AM'
  const hour12 = h % 12 || 12
  return `${hour12}:${m.toString().padStart(2, '0')} ${ampm}`
}

function formatDateLabel(dateStr: string): string {
  const d = parseISO(dateStr)
  return d.toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

function formatShortDate(dateStr: string): string {
  const d = parseISO(dateStr)
  return format(d, 'dd MMM yyyy')
}

function isToday(dateStr: string): boolean {
  return isSameDay(parseISO(dateStr), new Date())
}

const statusColors: Record<string, string> = {
  scheduled: 'bg-sky-100 text-sky-700 border-sky-200 dark:bg-sky-900/30 dark:text-sky-400 dark:border-sky-800',
  in_progress: 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800',
  completed: 'bg-gray-100 text-gray-500 border-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700',
  cancelled: 'bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800',
}

const statusLabels: Record<string, string> = {
  scheduled: 'Scheduled',
  in_progress: 'In Progress',
  completed: 'Completed',
  cancelled: 'Cancelled',
}

const PAGE_LIMIT = 20

export default function SessionsView() {
  const { toast } = useToast()
  const { currentInstitute, currentUser } = useAppStore()
  const instituteId = currentInstitute?.id

  // Data
  const [sessions, setSessions] = useState<Session[]>([])
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Filters
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined)
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [batchFilter, setBatchFilter] = useState<string>('all')
  const [page, setPage] = useState(1)

  // Dropdowns
  const [batches, setBatches] = useState<BatchOption[]>([])

  // Create dialog
  const [dialogOpen, setDialogOpen] = useState(false)
  const [creating, setCreating] = useState(false)
  const [form, setForm] = useState({
    batchId: '',
    teacherId: '',
    date: '',
    startTime: '',
    endTime: '',
    durationMinutes: '90',
    topic: '',
    isOnline: 'false',
  })

  // Fetch batches for filter dropdown
  useEffect(() => {
    if (!instituteId) return
    fetch(`/api/batches?instituteId=${instituteId}`)
      .then((r) => r.json())
      .then((d) => setBatches(d.batches || []))
      .catch(() => {})
  }, [instituteId])

  // Fetch sessions
  const fetchSessions = useCallback(async () => {
    if (!instituteId) {
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams({ instituteId, page: String(page), limit: String(PAGE_LIMIT) })
      if (statusFilter && statusFilter !== 'all') params.set('status', statusFilter)
      if (batchFilter && batchFilter !== 'all') params.set('batchId', batchFilter)
      if (selectedDate) {
        const dateStr = format(selectedDate, 'yyyy-MM-dd')
        params.set('dateFrom', dateStr)
        params.set('dateTo', dateStr)
      }

      const res = await fetch(`/api/sessions?${params.toString()}`)
      if (!res.ok) throw new Error('Failed to load sessions')
      const data = await res.json()
      setSessions(data.sessions || [])
      setTotal(data.pagination?.total || 0)
      setTotalPages(data.pagination?.totalPages || 0)
    } catch (err: any) {
      setError(err.message || 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }, [instituteId, page, statusFilter, batchFilter, selectedDate])

  useEffect(() => {
    fetchSessions()
  }, [fetchSessions])

  // Reset page on filter change
  useEffect(() => {
    setPage(1)
  }, [statusFilter, batchFilter, selectedDate])

  // Group sessions by date
  const grouped = sessions.reduce<Record<string, Session[]>>((acc, s) => {
    const dateKey = format(parseISO(s.sessionDate), 'yyyy-MM-dd')
    if (!acc[dateKey]) acc[dateKey] = []
    acc[dateKey].push(s)
    return acc
  }, {})

  // Sorted date keys
  const dateKeys = Object.keys(grouped).sort((a, b) => b.localeCompare(a))

  // Active filters count
  const activeFilters = [selectedDate ? 1 : 0, statusFilter !== 'all' ? 1 : 0, batchFilter !== 'all' ? 1 : 0].reduce((a, b) => a + b, 0)

  // Create session
  const handleCreate = async () => {
    if (!instituteId || !form.batchId || !form.date || !form.startTime) {
      toast({ title: 'Missing fields', description: 'Batch, date, and start time are required', variant: 'destructive' })
      return
    }
    setCreating(true)
    try {
      const body: any = {
        instituteId,
        batchId: form.batchId,
        sessionDate: form.date,
        startTime: form.startTime,
        endTime: form.endTime || null,
        durationMinutes: parseInt(form.durationMinutes) || 90,
        topic: form.topic || null,
        isOnline: form.isOnline === 'true',
        createdBy: currentUser?.id || '',
      }
      if (form.teacherId) body.teacherId = form.teacherId

      const res = await fetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        throw new Error(d.error || 'Failed to create session')
      }
      toast({ title: 'Session created', description: 'New class session has been scheduled' })
      setDialogOpen(false)
      setForm({ batchId: '', teacherId: '', date: '', startTime: '', endTime: '', durationMinutes: '90', topic: '', isOnline: 'false' })
      fetchSessions()
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' })
    } finally {
      setCreating(false)
    }
  }

  const clearFilters = () => {
    setSelectedDate(undefined)
    setStatusFilter('all')
    setBatchFilter('all')
  }

  if (!instituteId) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Sessions</h1>
          <p className="text-sm text-muted-foreground">Class session management</p>
        </div>
        <Card>
          <CardContent className="p-8 text-center">
            <AlertTriangle className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
            <h3 className="font-semibold text-lg">No institute selected</h3>
            <p className="text-sm text-muted-foreground mt-1">Please select an institute to view sessions.</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Sessions</h1>
          <p className="text-sm text-muted-foreground">
            {loading ? 'Loading...' : `${total} session${total !== 1 ? 's' : ''} total`}
          </p>
        </div>
        <Button className="gap-2" onClick={() => setDialogOpen(true)}>
          <Plus className="h-4 w-4" /> Create Session
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
        {/* Date picker */}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="gap-2 h-9">
              <CalendarIcon className="h-4 w-4" />
              {selectedDate ? format(selectedDate, 'dd MMM yyyy') : 'Pick date'}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={(d) => setSelectedDate(d === selectedDate ? undefined : d)}
            />
          </PopoverContent>
        </Popover>

        {/* Status filter */}
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-[150px] h-9">
            <SelectValue placeholder="All Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="scheduled">Scheduled</SelectItem>
            <SelectItem value="in_progress">In Progress</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>

        {/* Batch filter */}
        <Select value={batchFilter} onValueChange={setBatchFilter}>
          <SelectTrigger className="w-full sm:w-[180px] h-9">
            <SelectValue placeholder="All Batches" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Batches</SelectItem>
            {batches.map((b) => (
              <SelectItem key={b.id} value={b.id}>
                {b.name}{b.subject ? ` (${b.subject.name})` : ''}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {activeFilters > 0 && (
          <Button variant="ghost" size="sm" className="h-9 gap-1 text-muted-foreground" onClick={clearFilters}>
            <X className="h-3 w-3" /> Clear
          </Button>
        )}
      </div>

      {/* Error state */}
      {error && (
        <Card className="border-destructive/50">
          <CardContent className="p-8 text-center">
            <AlertTriangle className="h-10 w-10 text-destructive mx-auto mb-3" />
            <h3 className="font-semibold text-lg">Failed to load sessions</h3>
            <p className="text-sm text-muted-foreground mt-1">{error}</p>
            <Button variant="outline" className="mt-4" onClick={() => fetchSessions()}>
              Try Again
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Loading state */}
      {loading && !error && (
        <div className="space-y-6">
          {Array.from({ length: 2 }).map((_, gi) => (
            <div key={gi} className="space-y-3">
              <Skeleton className="h-5 w-48" />
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-20 w-full rounded-lg" />
              ))}
            </div>
          ))}
        </div>
      )}

      {/* Empty state */}
      {!loading && !error && dateKeys.length === 0 && (
        <Card>
          <CardContent className="p-12 text-center">
            <CalendarIcon className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
            <h3 className="font-semibold text-lg">No sessions found</h3>
            <p className="text-sm text-muted-foreground mt-1">
              {activeFilters > 0
                ? 'Try adjusting your filters or clearing them.'
                : 'Create a session to get started.'}
            </p>
            <div className="flex gap-2 justify-center mt-4">
              {activeFilters > 0 && (
                <Button variant="outline" onClick={clearFilters}>Clear Filters</Button>
              )}
              <Button className="gap-2" onClick={() => setDialogOpen(true)}>
                <Plus className="h-4 w-4" /> Create Session
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Session list grouped by date */}
      {!loading && !error && dateKeys.length > 0 && (
        <>
          {dateKeys.map((dateKey) => (
            <div key={dateKey}>
              <div className="flex items-center gap-2 mb-3">
                <h3 className="font-semibold text-sm text-muted-foreground">
                  {formatDateLabel(dateKey)}
                </h3>
                {isToday(dateKey) && (
                  <Badge variant="outline" className="text-[10px] bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800">
                    Today
                  </Badge>
                )}
              </div>
              <div className="space-y-2">
                {grouped[dateKey].map((session) => (
                  <Card key={session.id}>
                    <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-start gap-4">
                        {/* Time block */}
                        <div className="text-center min-w-[56px] shrink-0">
                          <p className="text-sm font-bold">{formatTime(session.startTime)}</p>
                          <p className="text-[10px] text-muted-foreground">{formatTime(session.endTime)}</p>
                          <p className="text-[10px] text-muted-foreground">{session.durationMinutes}min</p>
                        </div>
                        {/* Info */}
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            {session.batch?.subject?.color && (
                              <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: session.batch.subject.color }} />
                            )}
                            <p className="font-medium text-sm truncate">
                              {session.batch?.name || 'Unknown Batch'}
                            </p>
                            {session.isExtraClass && (
                              <Badge variant="outline" className="text-[10px] bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800 shrink-0">
                                Extra
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {session.teacher
                              ? `${session.teacher.firstName} ${session.teacher.lastName}`
                              : 'No teacher assigned'}
                            {session.batch?.subject && ` · ${session.batch.subject.name}`}
                          </p>
                          {session.topic && (
                            <p className="text-xs text-foreground/70 mt-0.5 truncate">{session.topic}</p>
                          )}
                          <div className="flex items-center gap-2 mt-1.5">
                            {session.isOnline ? (
                              <Badge variant="outline" className="text-[10px] bg-sky-50 dark:bg-sky-900/20 text-sky-600 dark:text-sky-400 border-sky-200 dark:border-sky-800">
                                <Video className="h-3 w-3 mr-1" />Online
                              </Badge>
                            ) : session.hall ? (
                              <Badge variant="outline" className="text-[10px] bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800">
                                <MapPin className="h-3 w-3 mr-1" />{session.hall.name}
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-[10px] bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800">
                                <MapPin className="h-3 w-3 mr-1" />Physical
                              </Badge>
                            )}
                            {session._count?.attendanceRecords > 0 && (
                              <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                                <Users className="h-3 w-3" />
                                {session._count.attendanceRecords}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      {/* Status */}
                      <div className="shrink-0">
                        <Badge variant="outline" className={`text-xs whitespace-nowrap ${statusColors[session.status] || ''}`}>
                          {session.status === 'in_progress' && (
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1 animate-pulse inline-block" />
                          )}
                          {statusLabels[session.status] || session.status}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ))}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-4 border-t">
              <p className="text-sm text-muted-foreground">
                Page {page} of {totalPages} · {total} sessions
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage(page - 1)}
                >
                  <ChevronLeft className="h-4 w-4" />
                  <span className="hidden sm:inline ml-1">Prev</span>
                </Button>
                {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                  let pageNum: number
                  if (totalPages <= 5) {
                    pageNum = i + 1
                  } else if (page <= 3) {
                    pageNum = i + 1
                  } else if (page >= totalPages - 2) {
                    pageNum = totalPages - 4 + i
                  } else {
                    pageNum = page - 2 + i
                  }
                  return (
                    <Button
                      key={pageNum}
                      variant={page === pageNum ? 'default' : 'outline'}
                      size="sm"
                      className="w-8 h-8 p-0"
                      onClick={() => setPage(pageNum)}
                    >
                      {pageNum}
                    </Button>
                  )
                })}
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages}
                  onClick={() => setPage(page + 1)}
                >
                  <span className="hidden sm:inline mr-1">Next</span>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Create Session Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create Session</DialogTitle>
            <DialogDescription>Schedule a new class session</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {/* Batch */}
            <div className="space-y-2">
              <Label>Batch *</Label>
              <Select value={form.batchId} onValueChange={(v) => setForm((f) => ({ ...f, batchId: v }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select batch" />
                </SelectTrigger>
                <SelectContent>
                  {batches.map((b) => (
                    <SelectItem key={b.id} value={b.id}>
                      {b.name}{b.subject ? ` (${b.subject.name})` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Teacher */}
            <div className="space-y-2">
              <Label>Teacher</Label>
              <TeacherSelect
                instituteId={instituteId}
                value={form.teacherId}
                onChange={(v) => setForm((f) => ({ ...f, teacherId: v }))}
              />
            </div>

            {/* Date */}
            <div className="space-y-2">
              <Label>Date *</Label>
              <Input
                type="date"
                value={form.date}
                onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
              />
            </div>

            {/* Time */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Start Time *</Label>
                <Input
                  type="time"
                  value={form.startTime}
                  onChange={(e) => setForm((f) => ({ ...f, startTime: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>End Time</Label>
                <Input
                  type="time"
                  value={form.endTime}
                  onChange={(e) => setForm((f) => ({ ...f, endTime: e.target.value }))}
                />
              </div>
            </div>

            {/* Duration */}
            <div className="space-y-2">
              <Label>Duration (minutes)</Label>
              <Select value={form.durationMinutes} onValueChange={(v) => setForm((f) => ({ ...f, durationMinutes: v }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="30">30 min</SelectItem>
                  <SelectItem value="45">45 min</SelectItem>
                  <SelectItem value="60">1 hour</SelectItem>
                  <SelectItem value="90">1.5 hours</SelectItem>
                  <SelectItem value="120">2 hours</SelectItem>
                  <SelectItem value="150">2.5 hours</SelectItem>
                  <SelectItem value="180">3 hours</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Topic */}
            <div className="space-y-2">
              <Label>Topic</Label>
              <Input
                placeholder="e.g., Chapter 5 - Mechanics"
                value={form.topic}
                onChange={(e) => setForm((f) => ({ ...f, topic: e.target.value }))}
              />
            </div>

            {/* Online / Physical toggle */}
            <div className="space-y-2">
              <Label>Class Type</Label>
              <Select value={form.isOnline} onValueChange={(v) => setForm((f) => ({ ...f, isOnline: v }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="false">
                    <span className="flex items-center gap-2"><MapPin className="h-3.5 w-3.5" /> Physical</span>
                  </SelectItem>
                  <SelectItem value="true">
                    <span className="flex items-center gap-2"><Video className="h-3.5 w-3.5" /> Online</span>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={creating}>
              {creating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Create Session
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// --- Teacher Select Component (fetches teachers from API) ---
function TeacherSelect({
  instituteId,
  value,
  onChange,
}: {
  instituteId: string
  value: string
  onChange: (v: string) => void
}) {
  const [teachers, setTeachers] = useState<TeacherOption[]>([])

  useEffect(() => {
    if (!instituteId) return
    let cancelled = false
    fetch(`/api/teachers?instituteId=${instituteId}`)
      .then((r) => r.json())
      .then((d) => { if (!cancelled) setTeachers(d.teachers || []) })
      .catch(() => {})
    return () => { cancelled = true }
  }, [instituteId])

  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger>
        <SelectValue placeholder="Select teacher (optional)" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="__none">None</SelectItem>
        {teachers.map((t) => (
          <SelectItem key={t.id} value={t.id}>
            {t.user ? `${t.user.firstName} ${t.user.lastName}` : 'Unknown Teacher'}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
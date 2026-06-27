'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { CalendarIcon, Video, Plus, MapPin, Clock } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { format } from 'date-fns'

interface Session {
  id: string
  date: string
  startTime: string
  endTime: string
  batchName: string
  subject: string
  teacher: string
  topic?: string
  hall?: string
  isOnline: boolean
  status: 'completed' | 'scheduled' | 'live' | 'cancelled'
  attendanceRate?: number
}

const demoSessions: Session[] = [
  { id: '1', date: '2025-06-26', startTime: '08:00', endTime: '09:30', batchName: 'A/L Physics - 2025', subject: 'Physics', teacher: 'Mr. Perera', topic: 'Mechanics - Chapter 5', hall: 'Hall A', isOnline: false, status: 'completed', attendanceRate: 90 },
  { id: '2', date: '2025-06-26', startTime: '10:00', endTime: '11:30', batchName: 'O/L Mathematics - Group A', subject: 'Maths', teacher: 'Mrs. Fernando', topic: 'Algebra - Polynomials', isOnline: true, status: 'live', attendanceRate: 95 },
  { id: '3', date: '2025-06-26', startTime: '14:00', endTime: '16:00', batchName: 'A/L Chemistry - 2025', subject: 'Chemistry', teacher: 'Dr. Bandara', topic: 'Organic Chemistry', isOnline: true, status: 'scheduled' },
  { id: '4', date: '2025-06-26', startTime: '16:30', endTime: '18:00', batchName: 'Grade 9 Science', subject: 'Science', teacher: 'Ms. Jayawardena', topic: 'Human Body Systems', hall: 'Hall B', isOnline: false, status: 'scheduled' },
  { id: '5', date: '2025-06-25', startTime: '10:00', endTime: '11:30', batchName: 'O/L Mathematics - Group A', subject: 'Maths', teacher: 'Mrs. Fernando', topic: 'Geometry - Circles', isOnline: true, status: 'completed', attendanceRate: 86 },
  { id: '6', date: '2025-06-25', startTime: '14:00', endTime: '16:00', batchName: 'A/L Chemistry - 2025', subject: 'Chemistry', teacher: 'Dr. Bandara', topic: 'Physical Chemistry Review', isOnline: true, status: 'completed', attendanceRate: 88 },
  { id: '7', date: '2025-06-25', startTime: '16:00', endTime: '17:30', batchName: 'A/L Biology - 2025', subject: 'Biology', teacher: 'Ms. Kumari', topic: 'Cell Biology', isOnline: true, status: 'completed', attendanceRate: 92 },
  { id: '8', date: '2025-06-24', startTime: '08:00', endTime: '09:30', batchName: 'A/L Physics - 2025', subject: 'Physics', teacher: 'Mr. Perera', topic: 'Waves', hall: 'Hall A', isOnline: false, status: 'completed', attendanceRate: 85 },
]

const statusColors: Record<string, string> = {
  live: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  scheduled: 'bg-sky-100 text-sky-700 border-sky-200',
  completed: 'bg-gray-100 text-gray-500 border-gray-200',
  cancelled: 'bg-red-100 text-red-700 border-red-200',
}

export default function SessionsView() {
  const { toast } = useToast()
  const [sessions, setSessions] = useState<Session[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date('2025-06-26'))
  const [dialogOpen, setDialogOpen] = useState(false)
  const [form, setForm] = useState({ batchId: '', date: '', time: '', duration: '90', topic: '', type: 'physical' })

  useEffect(() => {
    const fetchSessions = async () => {
      try {
        const res = await fetch('/api/sessions')
        if (res.ok) setSessions((await res.json()).sessions || [])
      } catch { /* demo */ } finally {
        setSessions(demoSessions)
        setLoading(false)
      }
    }
    fetchSessions()
  }, [])

  const filtered = selectedDate
    ? sessions.filter(s => s.date === format(selectedDate, 'yyyy-MM-dd'))
    : sessions

  const grouped = filtered.reduce<Record<string, Session[]>>((acc, session) => {
    if (!acc[session.date]) acc[session.date] = []
    acc[session.date].push(session)
    return acc
  }, {})

  const handleCreate = () => {
    toast({ title: 'Session created', description: 'New class session has been scheduled' })
    setDialogOpen(false)
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Sessions</h1>
          <p className="text-sm text-muted-foreground">{sessions.length} total sessions</p>
        </div>
        <div className="flex gap-2">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="gap-2">
                <CalendarIcon className="h-4 w-4" />
                {selectedDate ? format(selectedDate, 'dd MMM yyyy') : 'Pick date'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar mode="single" selected={selectedDate} onSelect={(d) => setSelectedDate(d === selectedDate ? undefined : d)} />
            </PopoverContent>
          </Popover>
          {selectedDate && (
            <Button variant="ghost" size="sm" onClick={() => setSelectedDate(undefined)}>Clear</Button>
          )}
          <Button className="gap-2" onClick={() => setDialogOpen(true)}>
            <Plus className="h-4 w-4" /> Create Session
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
        </div>
      ) : Object.keys(grouped).length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <CalendarIcon className="h-10 w-10 mx-auto mb-2 opacity-30" />
          <p>No sessions for this date</p>
        </div>
      ) : (
        Object.entries(grouped).map(([date, dateSessions]) => (
          <div key={date}>
            <h3 className="font-semibold text-sm text-muted-foreground mb-3">
              {new Date(date + 'T00:00:00').toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            </h3>
            <div className="space-y-2">
              {dateSessions.map(session => (
                <Card key={session.id}>
                  <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-start gap-4">
                      <div className="text-center min-w-[50px]">
                        <p className="text-sm font-bold">{session.startTime}</p>
                        <p className="text-[10px] text-muted-foreground">{session.endTime}</p>
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-sm">{session.batchName}</p>
                        <p className="text-xs text-muted-foreground">
                          {session.teacher} &middot; {session.subject}
                          {session.topic && <span> &middot; <span className="text-foreground/70">{session.topic}</span></span>}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          {session.isOnline ? (
                            <Badge variant="outline" className="text-[10px] bg-sky-50 text-sky-600 border-sky-200"><Video className="h-3 w-3 mr-1" />Online</Badge>
                          ) : (
                            <Badge variant="outline" className="text-[10px] bg-emerald-50 text-emerald-600 border-emerald-200"><MapPin className="h-3 w-3 mr-1" />{session.hall || 'Physical'}</Badge>
                          )}
                          {session.attendanceRate !== undefined && session.status === 'completed' && (
                            <span className="text-[10px] text-muted-foreground">{session.attendanceRate}% att.</span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Badge variant="outline" className={`text-xs ${statusColors[session.status]}`}>
                        {session.status === 'live' && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1 animate-pulse inline-block" />}
                        {session.status}
                      </Badge>
                      {session.isOnline && session.status !== 'completed' && session.status !== 'cancelled' && (
                        <Button size="sm" variant={session.status === 'live' ? 'default' : 'outline'} className="h-7 text-xs gap-1">
                          <Video className="h-3 w-3" /> Join
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        ))
      )}

      {/* Create Session Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Create Session</DialogTitle><DialogDescription>Schedule a new class session</DialogDescription></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2"><Label>Batch *</Label><Select value={form.batchId} onValueChange={(v) => setForm({ ...form, batchId: v })}><SelectTrigger><SelectValue placeholder="Select batch" /></SelectTrigger><SelectContent><SelectItem value="1">A/L Physics - 2025</SelectItem><SelectItem value="2">O/L Mathematics - Group A</SelectItem><SelectItem value="3">A/L Chemistry - 2025</SelectItem></SelectContent></Select></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2"><Label>Date *</Label><Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></div>
              <div className="space-y-2"><Label>Start Time *</Label><Input type="time" value={form.time} onChange={(e) => setForm({ ...form, time: e.target.value })} /></div>
            </div>
            <div className="space-y-2"><Label>Topic</Label><Input placeholder="e.g., Chapter 5 - Mechanics" value={form.topic} onChange={(e) => setForm({ ...form, topic: e.target.value })} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleCreate}>Create Session</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
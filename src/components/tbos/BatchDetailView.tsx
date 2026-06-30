'use client'

import { useState, useEffect } from 'react'
import { useAppStore } from '@/lib/store'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Separator } from '@/components/ui/separator'
import { ArrowLeft, Video, Plus, Users, Clock, MapPin, ExternalLink, Copy } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

interface BatchDetail {
  id: string
  name: string
  subject: string
  teacher: string
  classType: string
  schedule: string
  status: string
  studentsCount: number
  maxStudents?: number
  zoomUrl?: string
}

interface Student {
  id: string
  name: string
  studentNumber: string
  status: string
}

interface Session {
  id: string
  date: string
  time: string
  topic: string
  status: 'completed' | 'scheduled' | 'live'
  isOnline: boolean
  attendanceRate?: number
}

const demoBatch: BatchDetail = {
  id: '2',
  name: 'O/L Mathematics - Group A',
  subject: 'Mathematics',
  teacher: 'Mrs. Fernando',
  classType: 'online',
  schedule: 'Tue, Thu - 10:00 AM',
  status: 'active',
  studentsCount: 22,
  maxStudents: 25,
  zoomUrl: 'https://zoom.us/j/123?pwd=abc',
}

const demoStudents: Student[] = [
  { id: '1', name: 'Kasun Madusanka', studentNumber: 'STU001', status: 'active' },
  { id: '2', name: 'Nimali Perera', studentNumber: 'STU002', status: 'active' },
  { id: '3', name: 'Tharindu Jayasekara', studentNumber: 'STU003', status: 'active' },
  { id: '4', name: 'Sachini Fernando', studentNumber: 'STU004', status: 'active' },
  { id: '5', name: 'Dilini Wickramasinghe', studentNumber: 'STU006', status: 'active' },
  { id: '6', name: 'Pasindu Bandara', studentNumber: 'STU008', status: 'active' },
]

const demoSessions: Session[] = [
  { id: '1', date: '2025-06-26', time: '10:00 AM', topic: 'Algebra - Polynomials', status: 'live', isOnline: true, attendanceRate: 95 },
  { id: '2', date: '2025-06-24', time: '10:00 AM', topic: 'Geometry - Circles', status: 'completed', isOnline: true, attendanceRate: 86 },
  { id: '3', date: '2025-06-19', time: '10:00 AM', topic: 'Trigonometry Review', status: 'completed', isOnline: true, attendanceRate: 91 },
  { id: '4', date: '2025-06-17', time: '10:00 AM', topic: 'Statistics - Mean, Median', status: 'completed', isOnline: true, attendanceRate: 88 },
  { id: '5', date: '2025-06-12', time: '10:00 AM', topic: 'Number Patterns', status: 'completed', isOnline: true, attendanceRate: 100 },
]

export default function BatchDetailView() {
  const { goBack, setActiveView, selectedBatchId } = useAppStore()
  const { toast } = useToast()
  const [batch, setBatch] = useState<BatchDetail | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchBatch = async () => {
      try {
        if (selectedBatchId) {
          const res = await fetch(`/api/batches/${selectedBatchId}`)
          if (res.ok) setBatch(await res.json())
        }
      } catch { /* use demo */ } finally {
        setBatch(demoBatch)
        setLoading(false)
      }
    }
    fetchBatch()
  }, [selectedBatchId])

  if (loading) return <div className="space-y-4"><Skeleton className="h-32 w-full" /><Skeleton className="h-64 w-full" /></div>
  if (!batch) return <div className="text-center py-12 text-muted-foreground">Batch not found</div>

  const isOnline = batch.classType === 'online' || batch.classType === 'hybrid'

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" onClick={goBack} className="gap-2">
        <ArrowLeft className="h-4 w-4" /> Back to Batches
      </Button>

      {/* Header */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h1 className="text-xl font-bold">{batch.name}</h1>
                <Badge variant="outline" className="text-xs">{batch.classType}</Badge>
                <Badge className={`text-xs ${batch.status === 'active' ? 'bg-emerald-100 text-emerald-700' : ''}`}>{batch.status}</Badge>
              </div>
              <p className="text-sm text-muted-foreground">{batch.subject} &middot; {batch.teacher}</p>
              <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                <Clock className="h-3.5 w-3.5" />{batch.schedule}
              </p>
            </div>
            <div className="flex gap-2">
              {isOnline && (
                <Button className="gap-2" onClick={() => setActiveView('zoom-meetings')}>
                  <Video className="h-4 w-4" /> Create Zoom Meeting
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="students">Students ({demoStudents.length})</TabsTrigger>
          <TabsTrigger value="sessions">Sessions</TabsTrigger>
          {isOnline && <TabsTrigger value="zoom">Zoom</TabsTrigger>}
        </TabsList>

        <TabsContent value="overview" className="mt-4">
          <div className="grid sm:grid-cols-3 gap-4">
            <Card className="p-4 text-center">
              <p className="text-2xl font-bold">{batch.studentsCount}</p>
              <p className="text-xs text-muted-foreground">Enrolled Students</p>
              <p className="text-[10px] text-muted-foreground">Max: {batch.maxStudents || '-'}</p>
            </Card>
            <Card className="p-4 text-center">
              <p className="text-2xl font-bold text-emerald-600">89%</p>
              <p className="text-xs text-muted-foreground">Avg. Attendance</p>
            </Card>
            <Card className="p-4 text-center">
              <p className="text-2xl font-bold">{demoSessions.length}</p>
              <p className="text-xs text-muted-foreground">Total Sessions</p>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="students" className="mt-4">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm">Enrolled Students</CardTitle>
                <Button size="sm" variant="outline" className="gap-1">
                  <Plus className="h-3 w-3" /> Add Student
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="divide-y">
                {demoStudents.map(s => (
                  <div key={s.id} className="flex items-center justify-between py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-bold">
                        {s.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm font-medium">{s.name}</p>
                        <p className="text-xs text-muted-foreground">{s.studentNumber}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className="text-xs bg-emerald-100 text-emerald-700">{s.status}</Badge>
                      <Button variant="ghost" size="sm" className="text-destructive text-xs h-7">Remove</Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sessions" className="mt-4">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm">Session History</CardTitle>
                <Button size="sm" variant="outline" className="gap-1"><Plus className="h-3 w-3" /> Create Session</Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="divide-y">
                {demoSessions.map(session => (
                  <div key={session.id} className="flex items-center justify-between py-3">
                    <div>
                      <p className="text-sm font-medium">{session.topic}</p>
                      <p className="text-xs text-muted-foreground">{session.date} &middot; {session.time}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {session.isOnline && <Badge variant="outline" className="text-[10px]">Online</Badge>}
                      {session.attendanceRate !== undefined && (
                        <span className="text-xs text-muted-foreground">{session.attendanceRate}% att.</span>
                      )}
                      <Badge className={`text-xs ${
                        session.status === 'live' ? 'bg-emerald-100 text-emerald-700' :
                        session.status === 'completed' ? 'bg-gray-100 text-gray-500' :
                        'bg-sky-100 text-sky-700'
                      }`}>
                        {session.status === 'live' && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1 animate-pulse inline-block" />}
                        {session.status}
                      </Badge>
                      {session.isOnline && session.status !== 'completed' && (
                        <Button size="sm" variant={session.status === 'live' ? 'default' : 'outline'} className="h-7 text-[10px] gap-1">
                          <Video className="h-3 w-3" /> Join
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {isOnline && (
          <TabsContent value="zoom" className="mt-4">
            <Card>
              <CardContent className="p-6 text-center">
                <Video className="h-12 w-12 mx-auto text-primary mb-3" />
                <h3 className="font-semibold mb-1">Zoom Integration</h3>
                <p className="text-sm text-muted-foreground mb-4">Create and manage Zoom meetings for this batch</p>
                <Button onClick={() => setActiveView('zoom-meetings')} className="gap-2">
                  <Video className="h-4 w-4" /> Go to Zoom Meetings
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>
    </div>
  )
}
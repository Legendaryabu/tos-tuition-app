'use client'

import { useState, useEffect } from 'react'
import { useAppStore } from '@/lib/store'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Separator } from '@/components/ui/separator'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Video,
  Plus,
  ExternalLink,
  Copy,
  RefreshCw,
  Link2,
  Unlink,
  Wifi,
  WifiOff,
  CheckCircle,
  Play,
  Eye,
  BookOpen,
  Loader2,
  AlertCircle,
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import ZoomSetupGuide from './ZoomSetupGuide'

interface ZoomMeeting {
  id: string
  zoomMeetingId: string
  zoomMeetingNumber?: number
  topic: string
  batchName?: string
  batchId?: string
  teacherName?: string
  startTime: string
  durationMinutes: number
  status: 'scheduled' | 'live' | 'ended'
  participantCount: number
  joinUrl: string
  startUrl?: string
  passcode?: string
  recordingUrl?: string
  recordingStatus?: string
  hostEmail?: string
  batch?: { id: string; name: string; subject?: { name: string; color: string } } | null
  teacher?: { id: string; firstName: string; lastName: string } | null
}

interface ZoomStats {
  totalThisMonth: number
  totalHours: number
  avgParticipants: number
  recordingsCount: number
}

interface ZoomConnectionInfo {
  email?: string
  displayName?: string
  planType?: string
}

const statusColors: Record<string, string> = {
  live: 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800',
  scheduled: 'bg-sky-100 text-sky-700 border-sky-200 dark:bg-sky-900/30 dark:text-sky-400 dark:border-sky-800',
  ended: 'bg-gray-100 text-gray-500 border-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700',
}

export default function ZoomMeetingsView() {
  const { currentInstitute, setActiveView } = useAppStore()
  const { toast } = useToast()
  const [meetings, setMeetings] = useState<ZoomMeeting[]>([])
  const [stats, setStats] = useState<ZoomStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [zoomConnected, setZoomConnected] = useState(currentInstitute?.zoomEnabled ?? false)
  const [zoomUser, setZoomUser] = useState<ZoomConnectionInfo | null>(null)
  const [showConnectDialog, setShowConnectDialog] = useState(false)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [showDetailDialog, setShowDetailDialog] = useState(false)
  const [showSetupGuide, setShowSetupGuide] = useState(false)
  const [selectedMeeting, setSelectedMeeting] = useState<ZoomMeeting | null>(null)
  const [connectLoading, setConnectLoading] = useState(false)
  const [createLoading, setCreateLoading] = useState(false)

  // Connect form - Server-to-Server OAuth fields
  const [accountId, setAccountId] = useState('')
  const [clientId, setClientId] = useState('')
  const [clientSecret, setClientSecret] = useState('')
  const [connectError, setConnectError] = useState('')

  // Create form
  const [createForm, setCreateForm] = useState({
    topic: '', batchId: '', date: '', time: '', duration: '60', teacher: '', hostEmail: '',
    enableRecording: false,
    enableWaitingRoom: false,
  })

  // Batches & teachers for create form
  const [batches, setBatches] = useState<{ id: string; name: string }[]>([])
  const [teachers, setTeachers] = useState<{ id: string; name: string }[]>([])

  useEffect(() => {
    const fetchData = async () => {
      if (!currentInstitute?.id) return
      try {
        const [meetingsRes, statusRes] = await Promise.all([
          fetch(`/api/zoom/meetings?instituteId=${currentInstitute.id}`),
          fetch(`/api/zoom/status?instituteId=${currentInstitute.id}`),
        ])
        if (meetingsRes.ok) {
          const data = await meetingsRes.json()
          setMeetings(data.meetings || [])
          setStats({ totalThisMonth: data.pagination?.total || 0, totalHours: 0, avgParticipants: 0, recordingsCount: 0 })
        }
        if (statusRes.ok) {
          const statusData = await statusRes.json()
          if (statusData.connected) setZoomConnected(true)
          if (statusData.zoomUser) setZoomUser(statusData.zoomUser)
        }
      } catch { /* use demo data */ }

      // Load batches and teachers for the create form
      try {
        const [batchRes, teacherRes] = await Promise.all([
          fetch(`/api/batches?instituteId=${currentInstitute.id}`),
          fetch(`/api/teachers?instituteId=${currentInstitute.id}`),
        ])
        if (batchRes.ok) {
          const data = await batchRes.json()
          setBatches((data.batches || data || []).map((b: any) => ({ id: b.id, name: b.name })))
        }
        if (teacherRes.ok) {
          const data = await teacherRes.json()
          setTeachers((data.teachers || data || []).map((t: any) => ({ id: t.id, name: `${t.firstName} ${t.lastName}` })))
        }
      } catch { /* ok */ }

      setLoading(false)
    }
    fetchData()
  }, [currentInstitute?.id])

  const liveMeeting = meetings.find(m => m.status === 'live')

  const handleConnect = async () => {
    if (!currentInstitute?.id) return
    if (!accountId || !clientId || !clientSecret) {
      setConnectError('All fields are required')
      return
    }
    setConnectLoading(true)
    setConnectError('')
    try {
      const res = await fetch('/api/zoom/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          instituteId: currentInstitute.id,
          accountId: accountId.trim(),
          clientId: clientId.trim(),
          clientSecret: clientSecret.trim(),
        }),
      })
      const data = await res.json()
      if (res.ok && data.success) {
        setZoomConnected(true)
        if (data.zoomUser) setZoomUser(data.zoomUser)
        setShowConnectDialog(false)
        toast({ title: 'Zoom Connected!', description: `Connected as ${data.zoomUser?.email || data.zoomUser?.displayName || 'success'}` })
      } else {
        setConnectError(data.error || data.message || 'Connection failed')
      }
    } catch {
      setConnectError('Network error. Please try again.')
    } finally {
      setConnectLoading(false)
    }
  }

  const handleDisconnect = async () => {
    if (!currentInstitute?.id) return
    try {
      await fetch(`/api/zoom/connect?instituteId=${currentInstitute.id}`, { method: 'DELETE' })
      setZoomConnected(false)
      setZoomUser(null)
      toast({ title: 'Zoom Disconnected', description: 'Zoom integration has been disabled' })
    } catch {
      toast({ title: 'Error', description: 'Failed to disconnect', variant: 'destructive' })
    }
  }

  const handleCreate = async () => {
    if (!currentInstitute?.id || !createForm.topic) return
    setCreateLoading(true)
    try {
      const scheduledTime = createForm.date && createForm.time
        ? new Date(`${createForm.date}T${createForm.time}:00`).toISOString()
        : undefined

      const res = await fetch('/api/zoom/create-meeting', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          instituteId: currentInstitute.id,
          topic: createForm.topic,
          batchId: createForm.batchId || undefined,
          teacherId: createForm.teacher || undefined,
          duration: parseInt(createForm.duration),
          scheduledTime,
          hostEmail: createForm.hostEmail || undefined,
          enableRecording: createForm.enableRecording,
          enableWaitingRoom: createForm.enableWaitingRoom,
        }),
      })

      const data = await res.json()
      if (res.ok) {
        const newMeeting: ZoomMeeting = {
          id: data.meeting?.id || `new_${Date.now()}`,
          zoomMeetingId: data.zoom?.id || data.meeting?.zoomMeetingId || '',
          zoomMeetingNumber: data.zoom?.id ? parseInt(data.zoom.id) : undefined,
          topic: createForm.topic,
          batchName: batches.find(b => b.id === createForm.batchId)?.name,
          batchId: createForm.batchId || undefined,
          teacherName: createForm.teacher ? (teachers.find(t => t.id === createForm.teacher)?.name) : undefined,
          startTime: scheduledTime || new Date().toISOString(),
          durationMinutes: parseInt(createForm.duration),
          status: scheduledTime ? 'scheduled' : 'live',
          participantCount: 0,
          joinUrl: data.zoom?.join_url || data.meeting?.joinUrl || '',
          startUrl: data.zoom?.start_url || data.meeting?.startUrl,
          passcode: data.zoom?.password || data.meeting?.passcode,
        }
        setMeetings(prev => [newMeeting, ...prev])
        toast({ title: 'Meeting Created!', description: `${createForm.topic} - Zoom meeting scheduled` })
        setShowCreateDialog(false)
        setCreateForm({ topic: '', batchId: '', date: '', time: '', duration: '60', teacher: '', hostEmail: '', enableRecording: false, enableWaitingRoom: false })
      } else {
        toast({ title: 'Error', description: data.error || 'Failed to create meeting', variant: 'destructive' })
      }
    } catch {
      toast({ title: 'Error', description: 'Network error. Please try again.', variant: 'destructive' })
    } finally {
      setCreateLoading(false)
    }
  }

  const handleCopyLink = (url: string, label?: string) => {
    navigator.clipboard.writeText(url)
    toast({ title: 'Link copied!', description: label || 'Meeting link copied to clipboard' })
  }

  const handleShareWhatsApp = (meeting: ZoomMeeting) => {
    const text = `📚 ${meeting.topic}\n📅 ${formatTime(meeting.startTime)}\n🔗 Join: ${meeting.joinUrl}\n🔑 Passcode: ${meeting.passcode || 'No passcode'}`
    const waUrl = `https://wa.me/?text=${encodeURIComponent(text)}`
    window.open(waUrl, '_blank')
  }

  const formatTime = (isoString: string) => {
    const date = new Date(isoString)
    return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) + ' at ' +
      date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold">Online Classes / Zoom</h1>
            <Badge variant="outline" className={zoomConnected ? 'border-emerald-300 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400' : 'border-red-300 dark:border-red-700 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400'}>
              {zoomConnected ? <Wifi className="h-3 w-3 mr-1" /> : <WifiOff className="h-3 w-3 mr-1" />}
              {zoomConnected ? (zoomUser?.email || 'Connected') : 'Not Connected'}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">Manage your online classes and Zoom meetings</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowSetupGuide(true)} className="gap-2">
            <BookOpen className="h-4 w-4" /> Setup Guide
          </Button>
          {!zoomConnected && (
            <Button variant="outline" onClick={() => setShowConnectDialog(true)} className="gap-2">
              <Link2 className="h-4 w-4" /> Connect Zoom
            </Button>
          )}
          {zoomConnected && (
            <Button variant="outline" onClick={handleDisconnect} className="gap-2 text-red-600 hover:text-red-700">
              <Unlink className="h-4 w-4" /> Disconnect
            </Button>
          )}
          <Button onClick={() => setShowCreateDialog(true)} className="gap-2" disabled={!zoomConnected}>
            <Plus className="h-4 w-4" /> Create Meeting
          </Button>
        </div>
      </div>

      {/* Live Meeting Banner */}
      {liveMeeting && (
        <div className="bg-emerald-600 text-white p-4 rounded-lg flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
              <Play className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold">LIVE NOW</span>
                <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
              </div>
              <p className="text-sm text-emerald-100">{liveMeeting.topic}{liveMeeting.batchName ? ` · ${liveMeeting.batchName}` : ''}</p>
              <p className="text-xs text-emerald-200">{liveMeeting.participantCount} participants</p>
            </div>
          </div>
          <div className="flex gap-2 shrink-0">
            <Button variant="secondary" className="bg-white text-emerald-700 hover:bg-white/90 gap-2" size="lg"
              onClick={() => handleShareWhatsApp(liveMeeting)}>
              <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
              Share WhatsApp
            </Button>
            <Button variant="secondary" className="bg-white text-emerald-700 hover:bg-white/90 gap-2" size="lg"
              onClick={() => window.open(liveMeeting.joinUrl, '_blank')}>
              <Video className="h-4 w-4" /> JOIN NOW
            </Button>
          </div>
        </div>
      )}

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="p-4">
            <p className="text-sm text-muted-foreground">Meetings This Month</p>
            <p className="text-2xl font-bold mt-1">{stats.totalThisMonth}</p>
          </Card>
          <Card className="p-4">
            <p className="text-sm text-muted-foreground">Total Hours</p>
            <p className="text-2xl font-bold mt-1">{stats.totalHours}h</p>
          </Card>
          <Card className="p-4">
            <p className="text-sm text-muted-foreground">Avg. Participants</p>
            <p className="text-2xl font-bold mt-1">{stats.avgParticipants}</p>
          </Card>
          <Card className="p-4">
            <p className="text-sm text-muted-foreground">Recordings</p>
            <p className="text-2xl font-bold mt-1">{stats.recordingsCount}</p>
          </Card>
        </div>
      )}

      {/* Connect Section (if not connected) */}
      {!zoomConnected && (
        <Card className="border-dashed">
          <CardContent className="p-8 text-center">
            <Video className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
            <h3 className="font-semibold text-lg mb-2">Connect Your Zoom Account</h3>
            <p className="text-sm text-muted-foreground max-w-md mx-auto mb-4">
              Link your Zoom account to create, manage, and track online classes directly from TBOS.
              Supports creating meetings, tracking attendance, and recording.
            </p>
            <div className="flex items-center justify-center gap-3">
              <Button onClick={() => setShowConnectDialog(true)} className="gap-2">
                <Link2 className="h-4 w-4" /> Connect Zoom
              </Button>
              <Button variant="outline" onClick={() => setShowSetupGuide(true)} className="gap-2">
                <BookOpen className="h-4 w-4" /> How to Setup
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Connected Info Card */}
      {zoomConnected && zoomUser && (
        <Card className="bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800">
          <CardContent className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                <CheckCircle className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <p className="font-medium text-emerald-900 dark:text-emerald-200">{zoomUser.displayName || 'Zoom Connected'}</p>
                <p className="text-sm text-emerald-700 dark:text-emerald-400">{zoomUser.email}{zoomUser.planType ? ` · ${zoomUser.planType} plan` : ''}</p>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={() => setShowCreateDialog(true)} className="gap-2 border-emerald-300 dark:border-emerald-700 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/30">
              <Plus className="h-3.5 w-3.5" /> New Meeting
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Meetings Table */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">All Meetings</CardTitle>
              <CardDescription>Scheduled, live, and past meetings</CardDescription>
            </div>
            <Button variant="ghost" size="sm" className="gap-1 text-xs" onClick={() => setShowSetupGuide(true)}>
              <BookOpen className="h-3.5 w-3.5" /> Setup Help
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-6 space-y-3">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Topic</TableHead>
                    <TableHead className="hidden sm:table-cell">Batch</TableHead>
                    <TableHead className="hidden md:table-cell">Date & Time</TableHead>
                    <TableHead className="hidden md:table-cell">Duration</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="hidden lg:table-cell">Participants</TableHead>
                    <TableHead className="hidden lg:table-cell">Recording</TableHead>
                    <TableHead className="w-28">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {meetings.map(meeting => (
                    <TableRow key={meeting.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium text-sm">{meeting.topic}</p>
                          <p className="text-xs text-muted-foreground">{meeting.teacherName || meeting.hostEmail || ''}</p>
                        </div>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell text-sm">
                        {meeting.batchName || meeting.batch?.name || '-'}
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-sm">{formatTime(meeting.startTime)}</TableCell>
                      <TableCell className="hidden md:table-cell text-sm">{meeting.durationMinutes} min</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={`text-xs ${statusColors[meeting.status] || ''}`}>
                          {meeting.status === 'live' && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1 animate-pulse inline-block" />}
                          {meeting.status.charAt(0).toUpperCase() + meeting.status.slice(1)}
                        </Badge>
                      </TableCell>
                      <TableCell className="hidden lg:table-cell text-sm">{meeting.participantCount}</TableCell>
                      <TableCell className="hidden lg:table-cell">
                        {meeting.recordingUrl ? (
                          <Badge className="text-xs bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">Available</Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          {meeting.status === 'live' && (
                            <Button size="sm" className="h-7 text-xs gap-1" onClick={() => window.open(meeting.joinUrl, '_blank')}>
                              <Video className="h-3 w-3" /> Join
                            </Button>
                          )}
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleShareWhatsApp(meeting)} title="Share via WhatsApp">
                            <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 fill-current text-emerald-600"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setSelectedMeeting(meeting); setShowDetailDialog(true) }}>
                            <Eye className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleCopyLink(meeting.joinUrl)}>
                            <Copy className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Connect Zoom Dialog */}
      <Dialog open={showConnectDialog} onOpenChange={setShowConnectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Video className="h-5 w-5 text-sky-600" />
              Connect Zoom Account
            </DialogTitle>
            <DialogDescription>
              Enter your Zoom Server-to-Server OAuth credentials
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="bg-sky-50 dark:bg-sky-900/20 border border-sky-200 dark:border-sky-800 rounded-lg p-3">
              <p className="text-xs text-sky-800 dark:text-sky-300">
                Need help? Click <button onClick={() => { setShowConnectDialog(false); setShowSetupGuide(true) }} className="underline font-medium">Setup Guide</button> for step-by-step instructions on creating a Zoom app and getting these credentials.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="accountId">Account ID</Label>
              <Input id="accountId" placeholder="e.g., abc123DEF" value={accountId} onChange={(e) => setAccountId(e.target.value)} />
              <p className="text-xs text-muted-foreground">Found in Zoom App Marketplace → Your App → App Credentials</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="clientId">Client ID</Label>
              <Input id="clientId" placeholder="e.g., 7qF8kL2mN4pQ..." value={clientId} onChange={(e) => setClientId(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="clientSecret">Client Secret</Label>
              <Input id="clientSecret" type="password" placeholder="Your Zoom Client Secret" value={clientSecret} onChange={(e) => setClientSecret(e.target.value)} />
            </div>
            {connectError && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3 flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
                <p className="text-xs text-red-700">{connectError}</p>
              </div>
            )}
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowConnectDialog(false)}>Cancel</Button>
            <Button variant="outline" onClick={() => { setShowConnectDialog(false); setShowSetupGuide(true) }} className="gap-2">
              <BookOpen className="h-4 w-4" /> Setup Guide
            </Button>
            <Button onClick={handleConnect} disabled={connectLoading} className="gap-2">
              {connectLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Link2 className="h-4 w-4" />}
              {connectLoading ? 'Connecting...' : 'Connect'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Meeting Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Create Zoom Meeting</DialogTitle>
            <DialogDescription>Schedule a new online class meeting</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Topic *</Label>
              <Input placeholder="e.g., O/L Mathematics - Algebra" value={createForm.topic} onChange={(e) => setCreateForm({ ...createForm, topic: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Batch</Label>
              <Select value={createForm.batchId} onValueChange={(v) => setCreateForm({ ...createForm, batchId: v })}>
                <SelectTrigger><SelectValue placeholder="Select batch" /></SelectTrigger>
                <SelectContent>
                  {batches.length > 0 ? batches.map(b => (
                    <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                  )) : (
                    <>
                      <SelectItem value="1">A/L Physics - 2025</SelectItem>
                      <SelectItem value="2">O/L Mathematics - Group A</SelectItem>
                      <SelectItem value="3">A/L Chemistry - 2025</SelectItem>
                      <SelectItem value="5">A/L Biology - 2025</SelectItem>
                    </>
                  )}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Teacher (Host Email)</Label>
              <Input placeholder="Teacher's Zoom email or name" value={createForm.teacher || createForm.hostEmail} onChange={(e) => setCreateForm({ ...createForm, teacher: e.target.value, hostEmail: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Date</Label>
                <Input type="date" value={createForm.date} onChange={(e) => setCreateForm({ ...createForm, date: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Time</Label>
                <Input type="time" value={createForm.time} onChange={(e) => setCreateForm({ ...createForm, time: e.target.value })} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Duration</Label>
              <Select value={createForm.duration} onValueChange={(v) => setCreateForm({ ...createForm, duration: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="30">30 minutes</SelectItem>
                  <SelectItem value="45">45 minutes</SelectItem>
                  <SelectItem value="60">1 hour</SelectItem>
                  <SelectItem value="90">1.5 hours</SelectItem>
                  <SelectItem value="120">2 hours</SelectItem>
                  <SelectItem value="180">3 hours</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Separator />
            <div className="space-y-3">
              <Label className="text-sm font-medium">Meeting Settings</Label>
              <div className="flex items-center gap-3">
                <Checkbox id="recording" checked={createForm.enableRecording} onCheckedChange={(v) => setCreateForm({ ...createForm, enableRecording: !!v })} />
                <label htmlFor="recording" className="text-sm">Enable cloud recording</label>
              </div>
              <div className="flex items-center gap-3">
                <Checkbox id="waitingroom" checked={createForm.enableWaitingRoom} onCheckedChange={(v) => setCreateForm({ ...createForm, enableWaitingRoom: !!v })} />
                <label htmlFor="waitingroom" className="text-sm">Enable waiting room</label>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={createLoading || !createForm.topic} className="gap-2">
              {createLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              {createLoading ? 'Creating...' : 'Create Meeting'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Meeting Detail Dialog */}
      <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
        <DialogContent>
          {selectedMeeting && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-2">
                  <DialogTitle>{selectedMeeting.topic}</DialogTitle>
                  <Badge variant="outline" className={`text-xs ${statusColors[selectedMeeting.status] || ''}`}>
                    {selectedMeeting.status}
                  </Badge>
                </div>
                <DialogDescription>
                  {selectedMeeting.batchName || selectedMeeting.batch?.name || ''}{selectedMeeting.teacherName ? ` · ${selectedMeeting.teacherName}` : ''}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-muted-foreground">Date & Time</p>
                    <p className="text-sm font-medium">{formatTime(selectedMeeting.startTime)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Duration</p>
                    <p className="text-sm font-medium">{selectedMeeting.durationMinutes} minutes</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Meeting ID</p>
                    <p className="text-sm font-mono">{selectedMeeting.zoomMeetingId}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Passcode</p>
                    <p className="text-sm font-mono">{selectedMeeting.passcode || '-'}</p>
                  </div>
                </div>
                <Separator />
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground">Join URL</p>
                  <div className="flex items-center gap-2">
                    <Input value={selectedMeeting.joinUrl} readOnly className="text-xs font-mono" />
                    <Button variant="outline" size="icon" className="shrink-0" onClick={() => handleCopyLink(selectedMeeting.joinUrl)}>
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                {selectedMeeting.startUrl && (
                  <div className="space-y-2">
                    <p className="text-xs text-muted-foreground">Host Start URL</p>
                    <div className="flex items-center gap-2">
                      <Input value={selectedMeeting.startUrl} readOnly className="text-xs font-mono" />
                      <Button variant="outline" size="icon" className="shrink-0" onClick={() => handleCopyLink(selectedMeeting.startUrl!)}>
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
                {selectedMeeting.recordingUrl && (
                  <div className="space-y-2">
                    <p className="text-xs text-muted-foreground">Recording</p>
                    <Button variant="outline" size="sm" className="gap-2" asChild>
                      <a href={selectedMeeting.recordingUrl} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="h-3.5 w-3.5" /> View Recording
                      </a>
                    </Button>
                  </div>
                )}
              </div>
              <DialogFooter className="gap-2">
                <Button variant="outline" className="gap-2" onClick={() => handleShareWhatsApp(selectedMeeting)}>
                  <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current text-emerald-600"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                  Share via WhatsApp
                </Button>
                {selectedMeeting.status === 'live' && (
                  <Button className="gap-2" onClick={() => window.open(selectedMeeting.joinUrl, '_blank')}>
                    <Video className="h-4 w-4" /> Join Meeting
                  </Button>
                )}
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Setup Guide Dialog */}
      <ZoomSetupGuide open={showSetupGuide} onOpenChange={setShowSetupGuide} />
    </div>
  )
}
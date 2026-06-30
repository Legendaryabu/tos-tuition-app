'use client'

import { useState, useEffect } from 'react'
import { useAppStore } from '@/lib/store'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Search, Plus, Video, MapPin, Clock, Users, Layers } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

interface Batch {
  id: string
  name: string
  subject: string
  teacher: string
  studentsCount: number
  maxStudents?: number
  classType: 'online' | 'physical' | 'hybrid'
  schedule: string
  status: string
  zoomUrl?: string
}

const demoBatches: Batch[] = [
  { id: '1', name: 'A/L Physics - 2025', subject: 'Physics', teacher: 'Mr. Perera', studentsCount: 28, maxStudents: 35, classType: 'physical', schedule: 'Mon, Wed, Fri - 8:00 AM', status: 'active', zoomUrl: undefined },
  { id: '2', name: 'O/L Mathematics - Group A', subject: 'Mathematics', teacher: 'Mrs. Fernando', studentsCount: 22, maxStudents: 25, classType: 'online', schedule: 'Tue, Thu - 10:00 AM', status: 'active', zoomUrl: 'https://zoom.us/j/123456' },
  { id: '3', name: 'A/L Chemistry - 2025', subject: 'Chemistry', teacher: 'Dr. Bandara', studentsCount: 18, maxStudents: 30, classType: 'hybrid', schedule: 'Mon, Wed - 2:00 PM', status: 'active', zoomUrl: 'https://zoom.us/j/789012' },
  { id: '4', name: 'Grade 9 Science', subject: 'Science', teacher: 'Ms. Jayawardena', studentsCount: 30, maxStudents: 30, classType: 'physical', schedule: 'Sat - 9:00 AM', status: 'active' },
  { id: '5', name: 'A/L Biology - 2025', subject: 'Biology', teacher: 'Ms. Kumari', studentsCount: 15, maxStudents: 25, classType: 'online', schedule: 'Tue, Thu - 4:00 PM', status: 'active', zoomUrl: 'https://zoom.us/j/345678' },
  { id: '6', name: 'O/L Mathematics - Group B', subject: 'Mathematics', teacher: 'Mrs. Fernando', studentsCount: 20, maxStudents: 25, classType: 'physical', schedule: 'Mon, Wed - 4:30 PM', status: 'active' },
  { id: '7', name: 'Scholarship Maths', subject: 'Mathematics', teacher: 'Mr. Perera', studentsCount: 0, maxStudents: 30, classType: 'physical', schedule: 'Sat - 1:00 PM', status: 'upcoming' },
]

const typeColors: Record<string, string> = {
  online: 'bg-sky-100 text-sky-700 border-sky-200',
  physical: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  hybrid: 'bg-amber-100 text-amber-700 border-amber-200',
}

export default function BatchesView() {
  const { setActiveView, setSelectedBatchId } = useAppStore()
  const { toast } = useToast()
  const [batches, setBatches] = useState<Batch[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState<string>('all')
  const [dialogOpen, setDialogOpen] = useState(false)

  const [form, setForm] = useState({
    name: '', subject: '', teacher: '', classType: 'physical', maxStudents: '30',
  })

  useEffect(() => {
    const fetchBatches = async () => {
      try {
        const res = await fetch('/api/batches')
        if (res.ok) setBatches((await res.json()).batches || [])
      } catch { /* use demo */ } finally {
        setBatches(demoBatches)
        setLoading(false)
      }
    }
    fetchBatches()
  }, [])

  const filtered = batches.filter((b) => {
    const matchSearch = search === '' || b.name.toLowerCase().includes(search.toLowerCase()) || b.subject.toLowerCase().includes(search.toLowerCase())
    const matchType = typeFilter === 'all' || b.classType === typeFilter
    return matchSearch && matchType
  })

  const handleViewBatch = (id: string) => {
    setSelectedBatchId(id)
    setActiveView('batch-detail')
  }

  const handleCreate = () => {
    toast({ title: 'Batch created', description: `${form.name} has been created` })
    setDialogOpen(false)
    setForm({ name: '', subject: '', teacher: '', classType: 'physical', maxStudents: '30' })
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Batches</h1>
          <p className="text-sm text-muted-foreground">{batches.length} batches &middot; {batches.filter(b => b.classType === 'online').length} online</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2"><Plus className="h-4 w-4" /> Create Batch</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Create New Batch</DialogTitle><DialogDescription>Add a new class batch to your institute</DialogDescription></DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2"><Label>Batch Name *</Label><Input placeholder="e.g., A/L Physics - 2025" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label>Subject *</Label><Input placeholder="Physics" value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} /></div>
                <div className="space-y-2"><Label>Teacher</Label><Input placeholder="Teacher name" value={form.teacher} onChange={(e) => setForm({ ...form, teacher: e.target.value })} /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label>Class Type</Label><Select value={form.classType} onValueChange={(v) => setForm({ ...form, classType: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="physical">Physical</SelectItem><SelectItem value="online">Online</SelectItem><SelectItem value="hybrid">Hybrid</SelectItem></SelectContent></Select></div>
                <div className="space-y-2"><Label>Max Students</Label><Input type="number" value={form.maxStudents} onChange={(e) => setForm({ ...form, maxStudents: e.target.value })} /></div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleCreate}>Create Batch</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search batches..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <div className="flex gap-1">
          {['all', 'physical', 'online', 'hybrid'].map(type => (
            <Button key={type} variant={typeFilter === type ? 'default' : 'outline'} size="sm" onClick={() => setTypeFilter(type)}>
              {type === 'all' ? 'All' : type.charAt(0).toUpperCase() + type.slice(1)}
            </Button>
          ))}
        </div>
      </div>

      {/* Batch Cards */}
      {loading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-40" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Layers className="h-10 w-10 mx-auto mb-2 opacity-30" />
          <p>No batches found</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(batch => (
            <Card key={batch.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => handleViewBatch(batch.id)}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="min-w-0">
                    <h3 className="font-semibold text-sm truncate">{batch.name}</h3>
                    <p className="text-xs text-muted-foreground">{batch.subject} &middot; {batch.teacher}</p>
                  </div>
                  <Badge variant="outline" className={`text-[10px] shrink-0 ml-2 ${typeColors[batch.classType]}`}>
                    {batch.classType}
                  </Badge>
                </div>

                <div className="flex items-center gap-4 text-xs text-muted-foreground mb-3">
                  <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{batch.schedule}</span>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1 text-xs">
                    <Users className="h-3 w-3 text-muted-foreground" />
                    <span>{batch.studentsCount}{batch.maxStudents ? `/${batch.maxStudents}` : ''} students</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {batch.classType === 'online' && batch.zoomUrl && (
                      <Button size="sm" variant="default" className="h-7 text-[10px] gap-1" onClick={(e) => { e.stopPropagation() }}>
                        <Video className="h-3 w-3" /> Zoom
                      </Button>
                    )}
                    <Badge className={`text-xs ${batch.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                      {batch.status}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
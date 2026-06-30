'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Search, Plus, Users } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

interface Teacher {
  id: string
  name: string
  subjects: string[]
  batchCount: number
  employmentType: string
  isActive: boolean
  mobile?: string
  email?: string
  experienceYears?: number
}

const demoTeachers: Teacher[] = [
  { id: '1', name: 'Mr. Perera', subjects: ['Physics', 'Mathematics'], batchCount: 3, employmentType: 'full_time', isActive: true, mobile: '077 111 1111', email: 'perera@csa.lk', experienceYears: 15 },
  { id: '2', name: 'Mrs. Fernando', subjects: ['Mathematics'], batchCount: 2, employmentType: 'part_time', isActive: true, mobile: '077 222 2222', email: 'fernando@csa.lk', experienceYears: 8 },
  { id: '3', name: 'Dr. Bandara', subjects: ['Chemistry'], batchCount: 1, employmentType: 'part_time', isActive: true, mobile: '077 333 3333', experienceYears: 20 },
  { id: '4', name: 'Ms. Jayawardena', subjects: ['Science'], batchCount: 1, employmentType: 'part_time', isActive: true, mobile: '077 444 4444', experienceYears: 5 },
  { id: '5', name: 'Ms. Kumari', subjects: ['Biology'], batchCount: 1, employmentType: 'part_time', isActive: true, mobile: '077 555 5555', experienceYears: 10 },
  { id: '6', name: 'Mr. Rathnayake', subjects: ['English'], batchCount: 0, employmentType: 'part_time', isActive: false, mobile: '077 666 6666', experienceYears: 12 },
]

export default function TeachersView() {
  const { toast } = useToast()
  const [teachers, setTeachers] = useState<Teacher[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [form, setForm] = useState({ firstName: '', lastName: '', mobile: '', email: '', employmentType: 'part_time', subjects: '', experience: '' })

  useEffect(() => {
    try {
      fetch('/api/teachers').then(res => { if (res.ok) res.json().then(d => setTeachers(d.teachers || [])) })
    } catch { /* demo */ } finally {
      setTeachers(demoTeachers)
      setLoading(false)
    }
  }, [])

  const filtered = teachers.filter(t => search === '' || t.name.toLowerCase().includes(search.toLowerCase()) || t.subjects.some(s => s.toLowerCase().includes(search.toLowerCase())))

  const handleCreate = () => {
    toast({ title: 'Teacher added', description: `${form.firstName} ${form.lastName} has been added` })
    setDialogOpen(false)
    setForm({ firstName: '', lastName: '', mobile: '', email: '', employmentType: 'part_time', subjects: '', experience: '' })
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Teachers</h1>
          <p className="text-sm text-muted-foreground">{teachers.length} teachers &middot; {teachers.filter(t => t.isActive).length} active</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2"><Plus className="h-4 w-4" /> Add Teacher</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Add Teacher</DialogTitle><DialogDescription>Add a new teacher to your institute</DialogDescription></DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label>First Name *</Label><Input placeholder="Chaminda" value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} /></div>
                <div className="space-y-2"><Label>Last Name *</Label><Input placeholder="Perera" value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label>Mobile</Label><Input placeholder="077 xxx xxxx" value={form.mobile} onChange={(e) => setForm({ ...form, mobile: e.target.value })} /></div>
                <div className="space-y-2"><Label>Email</Label><Input type="email" placeholder="teacher@csa.lk" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label>Employment Type</Label><Select value={form.employmentType} onValueChange={(v) => setForm({ ...form, employmentType: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="full_time">Full-time</SelectItem><SelectItem value="part_time">Part-time</SelectItem><SelectItem value="contract">Contract</SelectItem></SelectContent></Select></div>
                <div className="space-y-2"><Label>Experience (years)</Label><Input type="number" placeholder="5" value={form.experience} onChange={(e) => setForm({ ...form, experience: e.target.value })} /></div>
              </div>
              <div className="space-y-2"><Label>Subjects</Label><Input placeholder="e.g., Physics, Mathematics" value={form.subjects} onChange={(e) => setForm({ ...form, subjects: e.target.value })} /></div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleCreate}>Add Teacher</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search teachers or subjects..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
      </div>

      {loading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-36" />)}</div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(teacher => (
            <Card key={teacher.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-start gap-3 mb-3">
                  <div className="w-11 h-11 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold shrink-0">
                    {teacher.name.split(' ').filter(n => !n.startsWith('Mr.') && !n.startsWith('Mrs.') && !n.startsWith('Ms.') && !n.startsWith('Dr.')).map(n => n[0]).join('').slice(0, 2).toUpperCase() || teacher.name.slice(0, 2)}
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-semibold text-sm truncate">{teacher.name}</h3>
                    <p className="text-xs text-muted-foreground">{teacher.mobile || teacher.email}</p>
                  </div>
                  <Badge className={`text-xs shrink-0 ${teacher.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>
                    {teacher.isActive ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
                <div className="flex flex-wrap gap-1 mb-3">
                  {teacher.subjects.map(s => (
                    <Badge key={s} variant="secondary" className="text-[10px]">{s}</Badge>
                  ))}
                </div>
                <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t">
                  <span className="capitalize">{teacher.employmentType.replace('_', '-')}</span>
                  <span>{teacher.batchCount} batches</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
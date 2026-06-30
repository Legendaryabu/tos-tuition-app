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
import { Search, Plus, BookOpen } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

interface Subject {
  id: string
  name: string
  code?: string
  gradeLevel?: string
  category?: string
  batchCount: number
  isActive: boolean
  color?: string
}

const demoSubjects: Subject[] = [
  { id: '1', name: 'Mathematics', code: 'MATH', gradeLevel: 'O/L, A/L', category: 'Science', batchCount: 3, isActive: true, color: 'bg-emerald-100 text-emerald-700' },
  { id: '2', name: 'Physics', code: 'PHYS', gradeLevel: 'A/L', category: 'Science', batchCount: 1, isActive: true, color: 'bg-teal-100 text-teal-700' },
  { id: '3', name: 'Chemistry', code: 'CHEM', gradeLevel: 'A/L', category: 'Science', batchCount: 1, isActive: true, color: 'bg-amber-100 text-amber-700' },
  { id: '4', name: 'Biology', code: 'BIO', gradeLevel: 'A/L', category: 'Science', batchCount: 1, isActive: true, color: 'bg-rose-100 text-rose-700' },
  { id: '5', name: 'Science', code: 'SCI', gradeLevel: 'Grade 6-9, O/L', category: 'Science', batchCount: 1, isActive: true, color: 'bg-sky-100 text-sky-700' },
  { id: '6', name: 'English', code: 'ENG', gradeLevel: 'O/L, A/L', category: 'Languages', batchCount: 0, isActive: true, color: 'bg-orange-100 text-orange-700' },
  { id: '7', name: 'ICT', code: 'ICT', gradeLevel: 'O/L, A/L', category: 'Technology', batchCount: 0, isActive: false, color: 'bg-purple-100 text-purple-700' },
]

export default function SubjectsView() {
  const { toast } = useToast()
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [form, setForm] = useState({ name: '', code: '', gradeLevel: '', category: '' })

  useEffect(() => {
    try {
      fetch('/api/subjects').then(res => { if (res.ok) res.json().then(d => setSubjects(d.subjects || [])) })
    } catch { /* demo */ } finally {
      setSubjects(demoSubjects)
      setLoading(false)
    }
  }, [])

  const filtered = subjects.filter(s => search === '' || s.name.toLowerCase().includes(search.toLowerCase()) || (s.code || '').toLowerCase().includes(search.toLowerCase()))

  const handleCreate = () => {
    toast({ title: 'Subject created', description: `${form.name} has been added` })
    setDialogOpen(false)
    setForm({ name: '', code: '', gradeLevel: '', category: '' })
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Subjects</h1>
          <p className="text-sm text-muted-foreground">{subjects.length} subjects</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2"><Plus className="h-4 w-4" /> Add Subject</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Add Subject</DialogTitle><DialogDescription>Create a new subject for your institute</DialogDescription></DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2"><Label>Subject Name *</Label><Input placeholder="e.g., Physics" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label>Code</Label><Input placeholder="e.g., PHYS" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} /></div>
                <div className="space-y-2"><Label>Category</Label><Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger><SelectContent><SelectItem value="Science">Science</SelectItem><SelectItem value="Languages">Languages</SelectItem><SelectItem value="Technology">Technology</SelectItem><SelectItem value="Arts">Arts</SelectItem><SelectItem value="Commerce">Commerce</SelectItem></SelectContent></Select></div>
              </div>
              <div className="space-y-2"><Label>Grade Levels</Label><Input placeholder="e.g., O/L, A/L" value={form.gradeLevel} onChange={(e) => setForm({ ...form, gradeLevel: e.target.value })} /></div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleCreate}>Add Subject</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search subjects..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
      </div>

      {loading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-28" />)}</div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(subject => (
            <Card key={subject.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-lg ${subject.color} flex items-center justify-center`}>
                      <BookOpen className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-sm">{subject.name}</h3>
                      <p className="text-xs text-muted-foreground">{subject.code} &middot; {subject.category}</p>
                    </div>
                  </div>
                  <Badge className={subject.isActive ? 'bg-emerald-100 text-emerald-700 text-xs' : 'bg-gray-100 text-gray-500 text-xs'}>
                    {subject.isActive ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>{subject.gradeLevel || 'All levels'}</span>
                  <span>{subject.batchCount} batches</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
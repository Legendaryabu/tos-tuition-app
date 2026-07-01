'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAppStore } from '@/lib/store'
import { Card, CardContent } from '@/components/ui/card'
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
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Search, Plus, Users, Mail, Phone, Loader2, UserCircle } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

interface TeacherUser {
  firstName?: string
  lastName?: string
  preferredName?: string
  email?: string
  mobile?: string
  profilePhoto?: string
  gender?: string
}

interface Teacher {
  id: string
  userId?: string
  bio?: string
  qualifications?: string
  experienceYears?: number
  employmentType: string
  isActive: boolean
  user: TeacherUser | null
  _count: { batches: number }
}

const employmentLabels: Record<string, string> = {
  full_time: 'Full-time',
  part_time: 'Part-time',
  contract: 'Contract',
}

const employmentColors: Record<string, string> = {
  full_time: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  part_time: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  contract: 'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400',
}

function getInitials(teacher: Teacher): string {
  const first = teacher.user?.preferredName || teacher.user?.firstName || ''
  const last = teacher.user?.lastName || ''
  if (first && last) return (first[0] + last[0]).toUpperCase()
  if (first) return first.slice(0, 2).toUpperCase()
  return '??'
}

function getFullName(teacher: Teacher): string {
  const first = teacher.user?.preferredName || teacher.user?.firstName || 'Unknown'
  const last = teacher.user?.lastName || ''
  return last ? `${first} ${last}` : first
}

export default function TeachersView() {
  const { currentInstitute } = useAppStore()
  const { toast } = useToast()
  const instituteId = currentInstitute?.id

  const [teachers, setTeachers] = useState<Teacher[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [creating, setCreating] = useState(false)
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    mobile: '',
    email: '',
    employmentType: 'part_time',
    qualifications: '',
    experienceYears: '',
    bio: '',
  })

  const fetchTeachers = useCallback(async () => {
    if (!instituteId) return
    setLoading(true)
    try {
      const res = await fetch(`/api/teachers?instituteId=${instituteId}`)
      if (res.ok) {
        const data = await res.json()
        setTeachers(data.teachers || [])
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [instituteId])

  useEffect(() => {
    fetchTeachers()
  }, [fetchTeachers])

  const filtered = teachers.filter((t) => {
    const name = getFullName(t).toLowerCase()
    const email = (t.user?.email || '').toLowerCase()
    const mobile = (t.user?.mobile || '').toLowerCase()
    const q = search.toLowerCase()
    return q === '' || name.includes(q) || email.includes(q) || mobile.includes(q)
  })

  const handleCreate = async () => {
    if (!form.firstName.trim() || !form.lastName.trim() || !instituteId) return
    setCreating(true)
    try {
      const res = await fetch('/api/teachers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          instituteId,
          firstName: form.firstName.trim(),
          lastName: form.lastName.trim(),
          mobile: form.mobile.trim() || undefined,
          email: form.email.trim() || undefined,
          employmentType: form.employmentType,
          qualifications: form.qualifications.trim() || undefined,
          experienceYears: form.experienceYears ? parseInt(form.experienceYears) : undefined,
          bio: form.bio.trim() || undefined,
        }),
      })
      if (res.ok) {
        toast({
          title: 'Teacher added',
          description: `${form.firstName} ${form.lastName} has been added`,
        })
        setDialogOpen(false)
        setForm({
          firstName: '',
          lastName: '',
          mobile: '',
          email: '',
          employmentType: 'part_time',
          qualifications: '',
          experienceYears: '',
          bio: '',
        })
        fetchTeachers()
      } else {
        const err = await res.json()
        toast({
          title: 'Error',
          description: err.error || 'Failed to add teacher',
          variant: 'destructive',
        })
      }
    } catch (err) {
      console.error(err)
      toast({ title: 'Error', description: 'Failed to add teacher', variant: 'destructive' })
    } finally {
      setCreating(false)
    }
  }

  const activeCount = teachers.filter((t) => t.isActive).length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Teachers</h1>
          <p className="text-sm text-muted-foreground">
            {teachers.length} teacher{teachers.length !== 1 ? 's' : ''} &middot; {activeCount} active
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" /> Add Teacher
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Add Teacher</DialogTitle>
              <DialogDescription>Add a new teacher to your institute</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>First Name *</Label>
                  <Input
                    placeholder="Chaminda"
                    value={form.firstName}
                    onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Last Name *</Label>
                  <Input
                    placeholder="Perera"
                    value={form.lastName}
                    onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Mobile</Label>
                  <Input
                    placeholder="077 xxx xxxx"
                    value={form.mobile}
                    onChange={(e) => setForm({ ...form, mobile: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input
                    type="email"
                    placeholder="teacher@example.com"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Employment Type</Label>
                  <Select
                    value={form.employmentType}
                    onValueChange={(v) => setForm({ ...form, employmentType: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="full_time">Full-time</SelectItem>
                      <SelectItem value="part_time">Part-time</SelectItem>
                      <SelectItem value="contract">Contract</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Experience (years)</Label>
                  <Input
                    type="number"
                    placeholder="5"
                    min="0"
                    value={form.experienceYears}
                    onChange={(e) => setForm({ ...form, experienceYears: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Qualifications</Label>
                <Input
                  placeholder="e.g., BSc, MSc, PhD"
                  value={form.qualifications}
                  onChange={(e) => setForm({ ...form, qualifications: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Bio</Label>
                <Textarea
                  placeholder="Short bio (optional)"
                  rows={2}
                  value={form.bio}
                  onChange={(e) => setForm({ ...form, bio: e.target.value })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleCreate}
                disabled={creating || !form.firstName.trim() || !form.lastName.trim()}
              >
                {creating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Add Teacher
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search teachers..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Loading */}
      {loading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-40 rounded-lg" />
          ))}
        </div>
      ) : teachers.length === 0 ? (
        /* No teachers empty state */
        <div className="text-center py-16">
          <Users className="h-12 w-12 mx-auto mb-3 text-muted-foreground/30" />
          <p className="font-medium text-muted-foreground">No teachers yet</p>
          <p className="text-sm text-muted-foreground mt-1">
            Add your first teacher to get started
          </p>
        </div>
      ) : filtered.length === 0 ? (
        /* No match empty state */
        <div className="text-center py-16">
          <Search className="h-12 w-12 mx-auto mb-3 text-muted-foreground/30" />
          <p className="font-medium text-muted-foreground">No matching teachers</p>
          <p className="text-sm text-muted-foreground mt-1">
            Try a different search term
          </p>
        </div>
      ) : (
        /* Teacher cards */
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((teacher) => (
            <Card key={teacher.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-start gap-3 mb-3">
                  <div className="w-11 h-11 rounded-full bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center text-emerald-700 dark:text-emerald-400 font-bold shrink-0">
                    {teacher.user?.profilePhoto ? (
                      <img
                        src={teacher.user.profilePhoto}
                        alt={getFullName(teacher)}
                        className="w-11 h-11 rounded-full object-cover"
                      />
                    ) : (
                      <UserCircle className="h-11 w-11 text-emerald-200" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-semibold text-sm truncate">{getFullName(teacher)}</h3>
                      <Badge
                        className={`text-[10px] shrink-0 ${
                          teacher.isActive
                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                            : 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400'
                        }`}
                      >
                        {teacher.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>
                    {teacher.qualifications && (
                      <p className="text-xs text-muted-foreground truncate mt-0.5">
                        {teacher.qualifications}
                      </p>
                    )}
                  </div>
                </div>

                {/* Contact info */}
                <div className="space-y-1.5 mb-3">
                  {teacher.user?.email && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Mail className="h-3 w-3 shrink-0" />
                      <span className="truncate">{teacher.user.email}</span>
                    </div>
                  )}
                  {teacher.user?.mobile && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Phone className="h-3 w-3 shrink-0" />
                      <span>{teacher.user.mobile}</span>
                    </div>
                  )}
                </div>

                {/* Bottom row */}
                <div className="flex items-center justify-between pt-2 border-t text-xs">
                  <Badge
                    className={`text-[10px] ${
                      employmentColors[teacher.employmentType] || 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
                    }`}
                  >
                    {employmentLabels[teacher.employmentType] || teacher.employmentType}
                  </Badge>
                  <span className="text-muted-foreground">
                    {teacher._count?.batches || 0} batch{teacher._count?.batches !== 1 ? 'es' : ''}
                    {teacher.experienceYears ? ` · ${teacher.experienceYears}yr exp` : ''}
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
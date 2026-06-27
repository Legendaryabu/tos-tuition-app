'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
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
import { Search, Plus, Users, Loader2, Briefcase, GraduationCap } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { useAppStore } from '@/lib/store'

interface TeacherUser {
  firstName: string
  lastName: string
  preferredName?: string | null
  email?: string | null
  mobile?: string | null
  profilePhoto?: string | null
  gender?: string | null
}

interface Teacher {
  id: string
  uuid: string
  userId: string
  instituteId: string
  employeeNumber?: string | null
  bio?: string | null
  qualifications?: string | null
  experienceYears?: number | null
  specializations?: string | null
  employmentType: string
  salaryType?: string | null
  basicSalary?: number | null
  commissionPercentage?: number | null
  zoomPersonalLink?: string | null
  googleMeetId?: string | null
  isActive: boolean
  createdAt: string
  user: TeacherUser | null
  _count: {
    batches: number
  }
}

interface TeacherFormData {
  firstName: string
  lastName: string
  mobile: string
  email: string
  employmentType: string
  experienceYears: string
  bio: string
  qualifications: string
}

const emptyForm: TeacherFormData = {
  firstName: '',
  lastName: '',
  mobile: '',
  email: '',
  employmentType: 'part_time',
  experienceYears: '',
  bio: '',
  qualifications: '',
}

const employmentLabels: Record<string, string> = {
  full_time: 'Full-time',
  part_time: 'Part-time',
  contract: 'Contract',
}

function getInitials(user: TeacherUser): string {
  const first = (user.preferredName || user.firstName || '').trim()
  const last = (user.lastName || '').trim()
  if (first && last) return (first[0] + last[0]).toUpperCase()
  if (first.length >= 2) return first.slice(0, 2).toUpperCase()
  return (first + last).slice(0, 2).toUpperCase() || '?'
}

function getDisplayName(user: TeacherUser): string {
  if (user.preferredName) return user.preferredName
  return [user.firstName, user.lastName].filter(Boolean).join(' ') || 'Unknown'
}

function LoadingSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {Array.from({ length: 6 }).map((_, i) => (
        <Card key={i} className="overflow-hidden">
          <CardContent className="p-4">
            <div className="flex items-start gap-3 mb-3">
              <Skeleton className="w-11 h-11 rounded-full shrink-0" />
              <div className="flex-1 min-w-0 space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </div>
              <Skeleton className="h-5 w-16 rounded-full" />
            </div>
            <div className="flex flex-wrap gap-1 mb-3">
              <Skeleton className="h-5 w-16 rounded-full" />
              <Skeleton className="h-5 w-20 rounded-full" />
            </div>
            <div className="flex items-center justify-between pt-2 border-t">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-3 w-16" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
        <Users className="h-8 w-8 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-semibold mb-1">No teachers yet</h3>
      <p className="text-sm text-muted-foreground mb-4 max-w-xs">
        Add your first teacher to get started
      </p>
      <Button onClick={onAdd} className="gap-2">
        <Plus className="h-4 w-4" />
        Add Teacher
      </Button>
    </div>
  )
}

function TeacherCard({ teacher }: { teacher: Teacher }) {
  const user = teacher.user || { firstName: 'Unknown', lastName: '' }
  const initials = getInitials(user)
  const displayName = getDisplayName(user)
  const contact = user.mobile || user.email || ''
  const empLabel = employmentLabels[teacher.employmentType] || teacher.employmentType

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-start gap-3 mb-3">
          <div className="w-11 h-11 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold shrink-0 text-sm">
            {initials}
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="font-semibold text-sm truncate">{displayName}</h3>
            <p className="text-xs text-muted-foreground truncate">{contact}</p>
          </div>
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

        <div className="flex flex-wrap gap-1.5 mb-3">
          <Badge variant="secondary" className="text-[10px] gap-1">
            <Briefcase className="h-3 w-3" />
            {empLabel}
          </Badge>
          {teacher.experienceYears != null && teacher.experienceYears > 0 && (
            <Badge variant="outline" className="text-[10px] gap-1">
              <GraduationCap className="h-3 w-3" />
              {teacher.experienceYears} yr{teacher.experienceYears !== 1 ? 's' : ''}
            </Badge>
          )}
        </div>

        <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t">
          <span>{teacher._count.batches} batch{teacher._count.batches !== 1 ? 'es' : ''}</span>
        </div>
      </CardContent>
    </Card>
  )
}

export default function TeachersView() {
  const { toast } = useToast()
  const { currentInstitute } = useAppStore()

  const [teachers, setTeachers] = useState<Teacher[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [form, setForm] = useState<TeacherFormData>({ ...emptyForm })
  const [creating, setCreating] = useState(false)

  const fetchTeachers = useCallback(async () => {
    if (!currentInstitute?.id) return
    setLoading(true)
    try {
      const res = await fetch(`/api/teachers?instituteId=${currentInstitute.id}`)
      if (!res.ok) {
        throw new Error(`Failed to fetch teachers (${res.status})`)
      }
      const data = await res.json()
      setTeachers(data.teachers || [])
    } catch (err) {
      console.error('Failed to fetch teachers:', err)
      toast({
        title: 'Error',
        description: 'Failed to load teachers. Please try again.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }, [currentInstitute?.id, toast])

  useEffect(() => {
    fetchTeachers()
  }, [fetchTeachers])

  const filtered = teachers.filter((t) => {
    if (!search) return true
    const q = search.toLowerCase()
    const name = getDisplayName(t.user).toLowerCase()
    const email = (t.user.email || '').toLowerCase()
    const mobile = (t.user.mobile || '').toLowerCase()
    return name.includes(q) || email.includes(q) || mobile.includes(q)
  })

  const handleCreate = async () => {
    if (!currentInstitute?.id) return
    if (!form.firstName.trim() || !form.lastName.trim()) {
      toast({
        title: 'Validation error',
        description: 'First name and last name are required.',
        variant: 'destructive',
      })
      return
    }

    setCreating(true)
    try {
      const body: Record<string, unknown> = {
        instituteId: currentInstitute.id,
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
      }

      if (form.mobile.trim()) body.mobile = form.mobile.trim()
      if (form.email.trim()) body.email = form.email.trim()
      if (form.employmentType) body.employmentType = form.employmentType
      if (form.experienceYears.trim()) body.experienceYears = parseInt(form.experienceYears, 10)
      if (form.bio.trim()) body.bio = form.bio.trim()
      if (form.qualifications.trim()) body.qualifications = form.qualifications.trim()

      const res = await fetch('/api/teachers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (!res.ok) {
        const errData = await res.json().catch(() => null)
        throw new Error(errData?.error || `Failed to create teacher (${res.status})`)
      }

      toast({
        title: 'Teacher added',
        description: `${form.firstName.trim()} ${form.lastName.trim()} has been added successfully.`,
      })

      setDialogOpen(false)
      setForm({ ...emptyForm })
      fetchTeachers()
    } catch (err) {
      console.error('Failed to create teacher:', err)
      toast({
        title: 'Error',
        description: err instanceof Error ? err.message : 'Failed to add teacher.',
        variant: 'destructive',
      })
    } finally {
      setCreating(false)
    }
  }

  if (!currentInstitute?.id) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  const activeCount = teachers.filter((t) => t.isActive).length

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Teachers</h1>
          <p className="text-sm text-muted-foreground">
            {teachers.length} teacher{teachers.length !== 1 ? 's' : ''} &middot;{' '}
            {activeCount} active
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" /> Add Teacher
            </Button>
          </DialogTrigger>
          <DialogContent className="max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Add Teacher</DialogTitle>
              <DialogDescription>Add a new teacher to your institute</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2">
              {/* Names */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">First Name *</Label>
                  <Input
                    id="firstName"
                    placeholder="Chaminda"
                    value={form.firstName}
                    onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Last Name *</Label>
                  <Input
                    id="lastName"
                    placeholder="Perera"
                    value={form.lastName}
                    onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                  />
                </div>
              </div>

              {/* Contact */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="mobile">Mobile</Label>
                  <Input
                    id="mobile"
                    placeholder="077 123 4567"
                    value={form.mobile}
                    onChange={(e) => setForm({ ...form, mobile: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="teacher@csa.lk"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                  />
                </div>
              </div>

              {/* Employment & Experience */}
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
                  <Label htmlFor="experience">Experience (years)</Label>
                  <Input
                    id="experience"
                    type="number"
                    min="0"
                    placeholder="5"
                    value={form.experienceYears}
                    onChange={(e) => setForm({ ...form, experienceYears: e.target.value })}
                  />
                </div>
              </div>

              {/* Qualifications */}
              <div className="space-y-2">
                <Label htmlFor="qualifications">Qualifications</Label>
                <Input
                  id="qualifications"
                  placeholder="e.g., BSc, MEd, PhD"
                  value={form.qualifications}
                  onChange={(e) => setForm({ ...form, qualifications: e.target.value })}
                />
              </div>

              {/* Bio */}
              <div className="space-y-2">
                <Label htmlFor="bio">Bio</Label>
                <Textarea
                  id="bio"
                  placeholder="Brief description about the teacher..."
                  rows={3}
                  value={form.bio}
                  onChange={(e) => setForm({ ...form, bio: e.target.value })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreate} disabled={creating} className="gap-2">
                {creating && <Loader2 className="h-4 w-4 animate-spin" />}
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
          placeholder="Search by name, email, or mobile..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Content */}
      {loading ? (
        <LoadingSkeleton />
      ) : filtered.length === 0 ? (
        search ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Search className="h-8 w-8 text-muted-foreground mb-3" />
            <h3 className="text-sm font-medium">No results found</h3>
            <p className="text-xs text-muted-foreground mt-1">
              No teachers match &ldquo;{search}&rdquo;
            </p>
          </div>
        ) : (
          <EmptyState onAdd={() => setDialogOpen(true)} />
        )
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((teacher) => (
            <TeacherCard key={teacher.id} teacher={teacher} />
          ))}
        </div>
      )}
    </div>
  )
}
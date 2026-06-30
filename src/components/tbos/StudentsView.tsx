'use client'

import { useState, useEffect } from 'react'
import { useAppStore } from '@/lib/store'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Search, Plus, MoreHorizontal, Eye, GraduationCap, Filter, UserPlus } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

interface Student {
  id: string
  studentNumber: string
  fullName: string
  gender?: string
  grade?: string
  schoolName?: string
  status: string
  outstandingBalance: number
  totalPaid: number
  mobile?: string
  batchCount?: number
  batches?: { name: string }[]
}

const demoStudents: Student[] = [
  { id: '1', studentNumber: 'STU001', fullName: 'Kasun Madusanka', gender: 'Male', grade: 'A/L', schoolName: 'Royal College', status: 'active', outstandingBalance: 2500, totalPaid: 15000, mobile: '077 123 4567', batchCount: 3, batches: [{ name: 'A/L Physics' }, { name: 'A/L Maths' }] },
  { id: '2', studentNumber: 'STU002', fullName: 'Nimali Perera', gender: 'Female', grade: 'A/L', schoolName: 'Visakha Vidyalaya', status: 'active', outstandingBalance: 0, totalPaid: 20000, mobile: '071 234 5678', batchCount: 2, batches: [{ name: 'A/L Chemistry' }] },
  { id: '3', studentNumber: 'STU003', fullName: 'Tharindu Jayasekara', gender: 'Male', grade: 'O/L', schoolName: 'Ananda College', status: 'active', outstandingBalance: 5000, totalPaid: 12000, mobile: '076 345 6789', batchCount: 2, batches: [{ name: 'O/L Maths A' }] },
  { id: '4', studentNumber: 'STU004', fullName: 'Sachini Fernando', gender: 'Female', grade: 'O/L', schoolName: 'Devi Balika', status: 'active', outstandingBalance: 1500, totalPaid: 10000, mobile: '075 456 7890', batchCount: 1, batches: [{ name: 'O/L Science' }] },
  { id: '5', studentNumber: 'STU005', fullName: 'Ravindu Silva', gender: 'Male', grade: 'A/L', schoolName: 'Nalanda College', status: 'inactive', outstandingBalance: 7500, totalPaid: 5000, mobile: '078 567 8901', batchCount: 0 },
  { id: '6', studentNumber: 'STU006', fullName: 'Dilini Wickramasinghe', gender: 'Female', grade: 'Grade 9', schoolName: 'CMS Ladies College', status: 'active', outstandingBalance: 0, totalPaid: 8000, mobile: '070 678 9012', batchCount: 2, batches: [{ name: 'Grade 9 Maths' }, { name: 'Grade 9 Science' }] },
  { id: '7', studentNumber: 'STU007', fullName: 'Amaya De Silva', gender: 'Female', grade: 'A/L', schoolName: 'Bishop\'s College', status: 'active', outstandingBalance: 3000, totalPaid: 18000, mobile: '077 789 0123', batchCount: 3, batches: [{ name: 'A/L Biology' }] },
  { id: '8', studentNumber: 'STU008', fullName: 'Pasindu Bandara', gender: 'Male', grade: 'O/L', schoolName: 'Thurstan College', status: 'active', outstandingBalance: 500, totalPaid: 14000, mobile: '071 890 1234', batchCount: 2, batches: [{ name: 'O/L Maths B' }] },
]

function formatLKR(amount: number): string {
  return `Rs. ${amount.toLocaleString('en-LK')}`
}

export default function StudentsView() {
  const { setActiveView, setSelectedStudentId } = useAppStore()
  const { toast } = useToast()
  const [students, setStudents] = useState<Student[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [gradeFilter, setGradeFilter] = useState<string>('all')
  const [dialogOpen, setDialogOpen] = useState(false)

  // Add student form
  const [formTab, setFormTab] = useState('personal')
  const [addForm, setAddForm] = useState({
    firstName: '', lastName: '', gender: '', dob: '', grade: '', schoolName: '',
    mobile: '', whatsapp: '', email: '', address: '', city: '', district: '',
    stream: '', examYear: '',
  })

  useEffect(() => {
    const fetchStudents = async () => {
      try {
        const res = await fetch('/api/students')
        if (res.ok) {
          const data = await res.json()
          setStudents(data.students || [])
        }
      } catch { /* use demo */ } finally {
        setStudents(demoStudents)
        setLoading(false)
      }
    }
    fetchStudents()
  }, [])

  const filtered = students.filter((s) => {
    const matchSearch = search === '' ||
      s.fullName.toLowerCase().includes(search.toLowerCase()) ||
      s.studentNumber.toLowerCase().includes(search.toLowerCase())
    const matchStatus = statusFilter === 'all' || s.status === statusFilter
    const matchGrade = gradeFilter === 'all' || s.grade === gradeFilter
    return matchSearch && matchStatus && matchGrade
  })

  const handleViewStudent = (id: string) => {
    setSelectedStudentId(id)
    setActiveView('student-detail')
  }

  const handleAddStudent = async () => {
    try {
      const res = await fetch('/api/students', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(addForm),
      })
      if (res.ok) {
        const data = await res.json()
        setStudents((prev) => [...prev, data.student])
        toast({ title: 'Student added', description: `${addForm.firstName} ${addForm.lastName} has been enrolled` })
        setDialogOpen(false)
        setAddForm({
          firstName: '', lastName: '', gender: '', dob: '', grade: '', schoolName: '',
          mobile: '', whatsapp: '', email: '', address: '', city: '', district: '',
          stream: '', examYear: '',
        })
      }
    } catch { /* ignore */ }
    toast({ title: 'Student added', description: 'Demo: Student has been enrolled' })
    setDialogOpen(false)
  }

  const grades = [...new Set(students.map((s) => s.grade).filter(Boolean))]

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Students</h1>
          <p className="text-sm text-muted-foreground">{students.length} total students</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <UserPlus className="h-4 w-4" />
              Add Student
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Add New Student</DialogTitle>
              <DialogDescription>Enroll a new student to your institute</DialogDescription>
            </DialogHeader>
            <Tabs value={formTab} onValueChange={setFormTab}>
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="personal">Personal</TabsTrigger>
                <TabsTrigger value="contact">Contact</TabsTrigger>
                <TabsTrigger value="academic">Academic</TabsTrigger>
                <TabsTrigger value="enrollment">Enrollment</TabsTrigger>
              </TabsList>
              <TabsContent value="personal" className="space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2"><Label>First Name *</Label><Input placeholder="Kasun" value={addForm.firstName} onChange={(e) => setAddForm({ ...addForm, firstName: e.target.value })} /></div>
                  <div className="space-y-2"><Label>Last Name *</Label><Input placeholder="Madusanka" value={addForm.lastName} onChange={(e) => setAddForm({ ...addForm, lastName: e.target.value })} /></div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2"><Label>Gender</Label><Select value={addForm.gender} onValueChange={(v) => setAddForm({ ...addForm, gender: v })}><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger><SelectContent><SelectItem value="Male">Male</SelectItem><SelectItem value="Female">Female</SelectItem></SelectContent></Select></div>
                  <div className="space-y-2"><Label>Date of Birth</Label><Input type="date" value={addForm.dob} onChange={(e) => setAddForm({ ...addForm, dob: e.target.value })} /></div>
                </div>
              </TabsContent>
              <TabsContent value="contact" className="space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2"><Label>Mobile *</Label><Input placeholder="077 123 4567" value={addForm.mobile} onChange={(e) => setAddForm({ ...addForm, mobile: e.target.value })} /></div>
                  <div className="space-y-2"><Label>WhatsApp</Label><Input placeholder="Same as mobile" value={addForm.whatsapp} onChange={(e) => setAddForm({ ...addForm, whatsapp: e.target.value })} /></div>
                </div>
                <div className="space-y-2"><Label>Email</Label><Input type="email" placeholder="student@example.lk" value={addForm.email} onChange={(e) => setAddForm({ ...addForm, email: e.target.value })} /></div>
                <div className="space-y-2"><Label>Address</Label><Input placeholder="No. 42, Galle Road" value={addForm.address} onChange={(e) => setAddForm({ ...addForm, address: e.target.value })} /></div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2"><Label>City</Label><Input placeholder="Colombo" value={addForm.city} onChange={(e) => setAddForm({ ...addForm, city: e.target.value })} /></div>
                  <div className="space-y-2"><Label>District</Label><Input placeholder="Colombo" value={addForm.district} onChange={(e) => setAddForm({ ...addForm, district: e.target.value })} /></div>
                </div>
              </TabsContent>
              <TabsContent value="academic" className="space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2"><Label>Grade Level *</Label><Select value={addForm.grade} onValueChange={(v) => setAddForm({ ...addForm, grade: v })}><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger><SelectContent><SelectItem value="Grade 6">Grade 6</SelectItem><SelectItem value="Grade 7">Grade 7</SelectItem><SelectItem value="Grade 8">Grade 8</SelectItem><SelectItem value="Grade 9">Grade 9</SelectItem><SelectItem value="Grade 10">Grade 10</SelectItem><SelectItem value="Grade 11">Grade 11</SelectItem><SelectItem value="O/L">O/L</SelectItem><SelectItem value="A/L">A/L</SelectItem></SelectContent></Select></div>
                  <div className="space-y-2"><Label>Exam Year</Label><Input type="number" placeholder="2025" value={addForm.examYear} onChange={(e) => setAddForm({ ...addForm, examYear: e.target.value })} /></div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2"><Label>School</Label><Input placeholder="Royal College" value={addForm.schoolName} onChange={(e) => setAddForm({ ...addForm, schoolName: e.target.value })} /></div>
                  <div className="space-y-2"><Label>Stream (A/L)</Label><Select value={addForm.stream} onValueChange={(v) => setAddForm({ ...addForm, stream: v })}><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger><SelectContent><SelectItem value="Maths">Maths</SelectItem><SelectItem value="Bio">Bio</SelectItem><SelectItem value="Commerce">Commerce</SelectItem><SelectItem value="Arts">Arts</SelectItem><SelectItem value="Technology">Technology</SelectItem></SelectContent></Select></div>
                </div>
              </TabsContent>
              <TabsContent value="enrollment" className="space-y-4 mt-4">
                <p className="text-sm text-muted-foreground">You can enroll the student in batches after creating their profile from the Student Detail page.</p>
              </TabsContent>
            </Tabs>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleAddStudent}>Add Student</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name or student number..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex gap-2">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-32"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
            </SelectContent>
          </Select>
          <Select value={gradeFilter} onValueChange={setGradeFilter}>
            <SelectTrigger className="w-32"><SelectValue placeholder="Grade" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Grades</SelectItem>
              {grades.map((g) => <SelectItem key={g} value={g!}>{g}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">No.</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead className="hidden sm:table-cell">Grade</TableHead>
                  <TableHead className="hidden md:table-cell">Batches</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right hidden sm:table-cell">Outstanding</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                      <TableCell className="hidden sm:table-cell"><Skeleton className="h-4 w-12" /></TableCell>
                      <TableCell className="hidden md:table-cell"><Skeleton className="h-4 w-16" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                      <TableCell className="hidden sm:table-cell"><Skeleton className="h-4 w-20" /></TableCell>
                    </TableRow>
                  ))
                ) : filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                      <GraduationCap className="h-10 w-10 mx-auto mb-2 opacity-30" />
                      <p>No students found</p>
                      <p className="text-xs mt-1">Try adjusting your search or filters</p>
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((student) => (
                    <TableRow key={student.id} className="cursor-pointer hover:bg-muted/50" onClick={() => handleViewStudent(student.id)}>
                      <TableCell className="text-xs text-muted-foreground font-mono">{student.studentNumber}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-bold shrink-0">
                            {student.fullName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium text-sm truncate">{student.fullName}</p>
                            <p className="text-xs text-muted-foreground hidden sm:block">{student.schoolName}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell"><Badge variant="outline" className="text-xs">{student.grade}</Badge></TableCell>
                      <TableCell className="hidden md:table-cell">
                        <div className="flex flex-wrap gap-1">
                          {student.batches?.slice(0, 2).map((b, i) => (
                            <Badge key={i} variant="secondary" className="text-[10px]">{b.name}</Badge>
                          ))}
                          {(student.batchCount || 0) > 2 && <span className="text-xs text-muted-foreground">+{(student.batchCount || 0) - 2}</span>}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={student.status === 'active' ? 'default' : 'secondary'} className={`text-xs ${student.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>
                          {student.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right hidden sm:table-cell">
                        <span className={student.outstandingBalance > 0 ? 'text-destructive font-medium text-sm' : 'text-muted-foreground text-sm'}>
                          {student.outstandingBalance > 0 ? formatLKR(student.outstandingBalance) : '-'}
                        </span>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleViewStudent(student.id) }}>
                              <Eye className="h-4 w-4 mr-2" />View Details
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
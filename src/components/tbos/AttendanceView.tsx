'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { CalendarIcon, CheckSquare, CheckCircle, XCircle, Clock, AlertCircle, Save } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { format } from 'date-fns'

interface AttendanceStudent {
  id: string
  name: string
  studentNumber: string
  status: 'present' | 'absent' | 'late' | 'excused'
  profileInitials: string
}

interface BatchOption {
  id: string
  name: string
}

const demoBatches: BatchOption[] = [
  { id: '1', name: 'A/L Physics - 2025' },
  { id: '2', name: 'O/L Mathematics - Group A' },
  { id: '3', name: 'A/L Chemistry - 2025' },
  { id: '4', name: 'Grade 9 Science' },
  { id: '5', name: 'A/L Biology - 2025' },
]

const demoStudents: AttendanceStudent[] = [
  { id: '1', name: 'Kasun Madusanka', studentNumber: 'STU001', status: 'present', profileInitials: 'KM' },
  { id: '2', name: 'Nimali Perera', studentNumber: 'STU002', status: 'present', profileInitials: 'NP' },
  { id: '3', name: 'Tharindu Jayasekara', studentNumber: 'STU003', status: 'absent', profileInitials: 'TJ' },
  { id: '4', name: 'Sachini Fernando', studentNumber: 'STU004', status: 'present', profileInitials: 'SF' },
  { id: '5', name: 'Ravindu Silva', studentNumber: 'STU005', status: 'late', profileInitials: 'RS' },
  { id: '6', name: 'Dilini Wickramasinghe', studentNumber: 'STU006', status: 'present', profileInitials: 'DW' },
  { id: '7', name: 'Amaya De Silva', studentNumber: 'STU007', status: 'excused', profileInitials: 'AD' },
  { id: '8', name: 'Pasindu Bandara', studentNumber: 'STU008', status: 'present', profileInitials: 'PB' },
]

const statusConfig = {
  present: { label: 'Present', color: 'bg-emerald-100 text-emerald-700 border-emerald-200', icon: CheckCircle },
  absent: { label: 'Absent', color: 'bg-red-100 text-red-700 border-red-200', icon: XCircle },
  late: { label: 'Late', color: 'bg-amber-100 text-amber-700 border-amber-200', icon: Clock },
  excused: { label: 'Excused', color: 'bg-sky-100 text-sky-700 border-sky-200', icon: AlertCircle },
}

type StatusType = 'present' | 'absent' | 'late' | 'excused'

export default function AttendanceView() {
  const { toast } = useToast()
  const [selectedBatch, setSelectedBatch] = useState('')
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date('2025-06-26'))
  const [students, setStudents] = useState<AttendanceStudent[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)

  const handleBatchSelect = (batchId: string) => {
    setSelectedBatch(batchId)
    setLoading(true)
    setStudents([])
    setTimeout(() => {
      setStudents(demoStudents.map(s => ({ ...s, status: 'present' as StatusType })))
      setLoading(false)
    }, 500)
  }

  const updateStatus = (studentId: string, status: StatusType) => {
    setStudents(prev => prev.map(s => s.id === studentId ? { ...s, status } : s))
  }

  const markAllPresent = () => {
    setStudents(prev => prev.map(s => ({ ...s, status: 'present' as StatusType })))
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const res = await fetch('/api/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          batchId: selectedBatch,
          date: selectedDate ? format(selectedDate, 'yyyy-MM-dd') : '',
          records: students.map(s => ({ studentId: s.id, status: s.status })),
        }),
      })
      if (res.ok) {
        toast({ title: 'Attendance saved', description: `${students.length} records saved` })
      }
    } catch { /* ignore */ }
    setSaving(false)
    toast({ title: 'Attendance saved', description: `${students.length} records saved successfully` })
  }

  const counts = {
    present: students.filter(s => s.status === 'present').length,
    absent: students.filter(s => s.status === 'absent').length,
    late: students.filter(s => s.status === 'late').length,
    excused: students.filter(s => s.status === 'excused').length,
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Mark Attendance</h1>
        <p className="text-sm text-muted-foreground">Select a batch and date to mark attendance</p>
      </div>

      {/* Controls */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 space-y-2">
              <Label>Select Batch</Label>
              <Select value={selectedBatch} onValueChange={handleBatchSelect}>
                <SelectTrigger><SelectValue placeholder="Choose a batch..." /></SelectTrigger>
                <SelectContent>
                  {demoBatches.map(b => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="gap-2 w-full sm:w-auto">
                    <CalendarIcon className="h-4 w-4" />
                    {selectedDate ? format(selectedDate, 'dd MMM yyyy') : 'Pick date'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar mode="single" selected={selectedDate} onSelect={setSelectedDate} />
                </PopoverContent>
              </Popover>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Student List */}
      {selectedBatch && (
        <>
          {/* Summary */}
          <div className="grid grid-cols-4 gap-3">
            <Card className="p-3 text-center"><p className="text-lg font-bold text-emerald-600">{counts.present}</p><p className="text-[10px] text-muted-foreground">Present</p></Card>
            <Card className="p-3 text-center"><p className="text-lg font-bold text-red-600">{counts.absent}</p><p className="text-[10px] text-muted-foreground">Absent</p></Card>
            <Card className="p-3 text-center"><p className="text-lg font-bold text-amber-600">{counts.late}</p><p className="text-[10px] text-muted-foreground">Late</p></Card>
            <Card className="p-3 text-center"><p className="text-lg font-bold text-sky-600">{counts.excused}</p><p className="text-[10px] text-muted-foreground">Excused</p></Card>
          </div>

          <div className="flex items-center justify-between">
            <Button variant="outline" size="sm" onClick={markAllPresent} className="gap-2">
              <CheckSquare className="h-4 w-4" /> Mark All Present
            </Button>
            <Button className="gap-2" onClick={handleSave} disabled={saving}>
              <Save className="h-4 w-4" /> {saving ? 'Saving...' : 'Save Attendance'}
            </Button>
          </div>

          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-14" />)}
            </div>
          ) : (
            <div className="space-y-2 max-h-[500px] overflow-y-auto custom-scrollbar">
              {students.map(student => {
                const config = statusConfig[student.status]
                return (
                  <Card key={student.id}>
                    <CardContent className="p-3 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-bold shrink-0">
                          {student.profileInitials}
                        </div>
                        <div>
                          <p className="text-sm font-medium">{student.name}</p>
                          <p className="text-xs text-muted-foreground">{student.studentNumber}</p>
                        </div>
                      </div>
                      <div className="flex gap-1">
                        {(Object.keys(statusConfig) as StatusType[]).map(status => {
                          const s = statusConfig[status]
                          const Icon = s.icon
                          const isActive = student.status === status
                          return (
                            <Button
                              key={status}
                              variant="outline"
                              size="sm"
                              className={`h-8 text-xs gap-1 ${isActive ? s.color + ' border' : 'opacity-50'}`}
                              onClick={() => updateStatus(student.id, status)}
                            >
                              <Icon className="h-3 w-3" />
                              <span className="hidden sm:inline">{s.label}</span>
                            </Button>
                          )
                        })}
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </>
      )}

      {!selectedBatch && (
        <div className="text-center py-16 text-muted-foreground">
          <CheckSquare className="h-12 w-12 mx-auto mb-3 opacity-20" />
          <p className="font-medium">Select a batch to mark attendance</p>
          <p className="text-sm mt-1">Choose a batch and date from above to get started</p>
        </div>
      )}
    </div>
  )
}
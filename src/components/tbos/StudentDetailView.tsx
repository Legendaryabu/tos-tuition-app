'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAppStore } from '@/lib/store'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  ArrowLeft, Phone, Mail, MapPin, School, Calendar, CreditCard,
  CheckCircle, XCircle, Clock, User, Banknote, Loader2, FileText,
  ChevronLeft, ChevronRight, Filter, Inbox, Receipt,
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

// ─── Types ───────────────────────────────────────────────────────

interface StudentDetail {
  id: string
  studentNumber: string
  fullName: string
  gender?: string
  dateOfBirth?: string
  grade?: string
  schoolName?: string
  stream?: string
  examYear?: number
  mobile?: string
  whatsapp?: string
  email?: string
  addressLine1?: string
  city?: string
  district?: string
  status: string
  outstandingBalance: number
  totalPaid: number
  enrolledAt: string
  activeBatches?: ActiveBatch[]
  attendanceRate?: number | null
  _count?: { batches: number; attendanceRecords: number; payments: number }
}

interface ActiveBatch {
  id: string
  name: string
  subjectId?: string
  teacherId?: string
  subject?: { id: string; name: string; code?: string; color?: string } | null
  teacher?: { id: string; firstName: string; lastName: string } | null
}

interface FeeDue {
  id: string
  studentId: string
  description: string
  amount: number
  amountPaid: number
  waivedAmount: number
  dueDate: string
  status: string
  displayStatus: string
  remaining?: number
  feeStructure?: { name: string; type: string } | null
  batch?: { name: string; subject?: { name: string } | null } | null
  periodMonth?: number
  periodYear?: number
}

interface PaymentRecord {
  id: string
  amount: number
  paymentMethod: string
  recordedAt: string
  status: string
  receipt?: { paymentId: string; receiptNumber: string } | null
}

interface AttendanceRecord {
  id: string
  status: string
  markedAt: string
  classSession?: { sessionDate?: string; topic?: string; status?: string } | null
}

// ─── Constants ───────────────────────────────────────────────────

const ITEMS_PER_PAGE = 10
const MONTH_NAMES = ['', 'January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

const STATUS_BADGE_CLASSES: Record<string, string> = {
  unpaid: 'bg-amber-100 text-amber-700',
  overdue: 'bg-red-100 text-red-700',
  partial: 'bg-sky-100 text-sky-700',
  paid: 'bg-emerald-100 text-emerald-700',
}

const ATTENDANCE_COLORS: Record<string, string> = {
  present: 'bg-emerald-100 text-emerald-700',
  absent: 'bg-red-100 text-red-700',
  late: 'bg-amber-100 text-amber-700',
  excused: 'bg-sky-100 text-sky-700',
}

const METHOD_LABELS: Record<string, string> = {
  cash: 'Cash',
  bank_transfer: 'Bank Transfer',
  online: 'Online',
  cheque: 'Cheque',
}

// ─── Helpers ─────────────────────────────────────────────────────

function formatLKR(amount: number): string {
  return `Rs. ${amount.toLocaleString('en-LK')}`
}

function formatDate(dateStr: string): string {
  try {
    const d = new Date(dateStr)
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
  } catch {
    return dateStr
  }
}

function formatDateTime(dateStr: string): string {
  try {
    const d = new Date(dateStr)
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
      + ' ' + d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false })
  } catch {
    return dateStr
  }
}

// ─── Component ───────────────────────────────────────────────────

export default function StudentDetailView() {
  const { goBack, selectedStudentId, currentInstitute, currentUser, setActiveView } = useAppStore()
  const { toast } = useToast()
  const instituteId = currentInstitute?.id || ''

  // ── Student data ──
  const [student, setStudent] = useState<StudentDetail | null>(null)
  const [loading, setLoading] = useState(true)

  // ── Fees state ──
  const [fees, setFees] = useState<FeeDue[]>([])
  const [feesLoading, setFeesLoading] = useState(true)
  const [feesPagination, setFeesPagination] = useState({ page: 1, total: 0, totalPages: 0 })
  const [feesStatusFilter, setFeesStatusFilter] = useState('all')

  // ── Payments state ──
  const [payments, setPayments] = useState<PaymentRecord[]>([])
  const [paymentsLoading, setPaymentsLoading] = useState(true)

  // ── Attendance state (from student detail API) ──
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([])
  const [attendanceRate, setAttendanceRate] = useState<number | null>(null)

  // ── Quick Pay dialog ──
  const [quickPayDue, setQuickPayDue] = useState<FeeDue | null>(null)
  const [quickPayAmount, setQuickPayAmount] = useState('')
  const [quickPayMethod, setQuickPayMethod] = useState('cash')
  const [quickPayNotes, setQuickPayNotes] = useState('')
  const [quickPaySubmitting, setQuickPaySubmitting] = useState(false)

  // ── Record Payment dialog ──
  const [showRecordDialog, setShowRecordDialog] = useState(false)
  const [recordAmount, setRecordAmount] = useState('')
  const [recordMethod, setRecordMethod] = useState('cash')
  const [recordNotes, setRecordNotes] = useState('')
  const [recordSubmitting, setRecordSubmitting] = useState(false)

  // ─── Fetch student detail ────────────────────────────────────

  const fetchStudent = useCallback(async () => {
    if (!selectedStudentId) return
    setLoading(true)
    try {
      const res = await fetch(`/api/students/${selectedStudentId}`)
      if (res.ok) {
        const data = await res.json()
        setStudent(data)
        // Extract attendance from student detail response
        if (data.attendanceRecords) setAttendanceRecords(data.attendanceRecords)
        if (data.attendanceRate !== undefined) setAttendanceRate(data.attendanceRate)
      } else {
        toast({ title: 'Error', description: 'Failed to load student', variant: 'destructive' })
      }
    } catch {
      toast({ title: 'Error', description: 'Network error', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }, [selectedStudentId, toast])

  useEffect(() => { fetchStudent() }, [fetchStudent])

  // ─── Fetch fee dues for this student ─────────────────────────

  const fetchFees = useCallback(async () => {
    if (!selectedStudentId || !instituteId) return
    setFeesLoading(true)
    try {
      const params = new URLSearchParams({
        instituteId,
        studentId: selectedStudentId,
        page: String(feesPagination.page),
        limit: String(ITEMS_PER_PAGE),
      })
      if (feesStatusFilter !== 'all') params.set('status', feesStatusFilter)

      const res = await fetch(`/api/fees/dues?${params}`)
      if (res.ok) {
        const data = await res.json()
        setFees(data.dues || [])
        setFeesPagination({
          page: data.pagination?.page || 1,
          total: data.pagination?.total || 0,
          totalPages: data.pagination?.totalPages || 0,
        })
      }
    } catch { /* silent */ } finally {
      setFeesLoading(false)
    }
  }, [selectedStudentId, instituteId, feesPagination.page, feesStatusFilter])

  useEffect(() => { fetchFees() }, [fetchFees])

  // ─── Fetch payments for this student ─────────────────────────

  const fetchPayments = useCallback(async () => {
    if (!selectedStudentId || !instituteId) return
    setPaymentsLoading(true)
    try {
      const params = new URLSearchParams({
        instituteId,
        studentId: selectedStudentId,
        limit: '20',
      })
      const res = await fetch(`/api/payments?${params}`)
      if (res.ok) {
        const data = await res.json()
        setPayments(data.payments || [])
      }
    } catch { /* silent */ } finally {
      setPaymentsLoading(false)
    }
  }, [selectedStudentId, instituteId])

  useEffect(() => { fetchPayments() }, [fetchPayments])

  // ─── Actions ─────────────────────────────────────────────────

  const refreshAfterAction = useCallback(() => {
    fetchFees()
    fetchPayments()
    fetchStudent() // refresh outstandingBalance and totalPaid
  }, [fetchFees, fetchPayments, fetchStudent])

  const handleQuickPay = async () => {
    if (!quickPayDue || !currentUser) return
    const amount = parseFloat(quickPayAmount)
    if (isNaN(amount) || amount <= 0) {
      toast({ title: 'Invalid amount', description: 'Please enter a valid amount', variant: 'destructive' })
      return
    }
    setQuickPaySubmitting(true)
    try {
      const res = await fetch('/api/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId: quickPayDue.studentId,
          amount,
          paymentMethod: quickPayMethod,
          recordedBy: currentUser.id,
          feeDueIds: [quickPayDue.id],
          notes: quickPayNotes || undefined,
          instituteId,
        }),
      })
      if (res.ok) {
        toast({ title: 'Payment recorded', description: `${formatLKR(amount)} for ${quickPayDue.description}` })
        setQuickPayDue(null)
        setQuickPayAmount('')
        setQuickPayNotes('')
        refreshAfterAction()
      } else {
        const err = await res.json().catch(() => ({}))
        toast({ title: 'Payment failed', description: err.error || 'Could not record payment', variant: 'destructive' })
      }
    } catch {
      toast({ title: 'Error', description: 'Network error', variant: 'destructive' })
    } finally {
      setQuickPaySubmitting(false)
    }
  }

  const handleRecordPayment = async () => {
    if (!student || !currentUser) return
    const amount = parseFloat(recordAmount)
    if (isNaN(amount) || amount <= 0) {
      toast({ title: 'Invalid amount', description: 'Please enter a valid amount', variant: 'destructive' })
      return
    }
    setRecordSubmitting(true)
    try {
      const res = await fetch('/api/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId: student.id,
          amount,
          paymentMethod: recordMethod,
          recordedBy: currentUser.id,
          notes: recordNotes || undefined,
          instituteId,
        }),
      })
      if (res.ok) {
        toast({ title: 'Payment recorded', description: `${formatLKR(amount)} payment recorded` })
        setShowRecordDialog(false)
        setRecordAmount('')
        setRecordNotes('')
        refreshAfterAction()
      } else {
        const err = await res.json().catch(() => ({}))
        toast({ title: 'Payment failed', description: err.error || 'Could not record payment', variant: 'destructive' })
      }
    } catch {
      toast({ title: 'Error', description: 'Network error', variant: 'destructive' })
    } finally {
      setRecordSubmitting(false)
    }
  }

  // ─── Computed ────────────────────────────────────────────────

  const unpaidCount = fees.filter(f => f.displayStatus === 'overdue' || f.displayStatus === 'unpaid').length
  const overdueCount = fees.filter(f => f.displayStatus === 'overdue').length

  const hasUnpaid = student ? (student.outstandingBalance > 0) : false

  // ─── Loading / Empty states ──────────────────────────────────

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-9 w-32" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-8 w-80" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  if (!student) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p>Student not found</p>
        <Button variant="ghost" className="mt-2" onClick={goBack}>Go Back</Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Back button */}
      <Button variant="ghost" size="sm" onClick={goBack} className="gap-2">
        <ArrowLeft className="h-4 w-4" /> Back
      </Button>

      {/* Profile Header */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row items-start gap-4">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xl font-bold shrink-0">
              {student.fullName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
            </div>
            <div className="flex-1">
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-2">
                <h1 className="text-xl font-bold">{student.fullName}</h1>
                <Badge className={student.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'}>
                  {student.status}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">{student.studentNumber} &middot; {student.grade}{student.stream ? ` (${student.stream})` : ''}</p>
              {student.schoolName && <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1"><School className="h-3.5 w-3.5" />{student.schoolName}</p>}
            </div>
            <div className="flex gap-3 text-center">
              <div className="px-4 py-2 bg-muted/50 rounded-lg">
                <p className="text-xs text-muted-foreground">Total Paid</p>
                <p className="font-bold text-emerald-600 text-sm">{formatLKR(student.totalPaid)}</p>
              </div>
              <div className="px-4 py-2 bg-muted/50 rounded-lg">
                <p className="text-xs text-muted-foreground">Outstanding</p>
                <p className={`font-bold text-sm ${student.outstandingBalance > 0 ? 'text-destructive' : 'text-emerald-600'}`}>
                  {formatLKR(student.outstandingBalance)}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue="fees">
        <TabsList className="flex-wrap">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="batches">Batches{student._count ? ` (${student._count.batches})` : ''}</TabsTrigger>
          <TabsTrigger value="fees">
            Fees
            {hasUnpaid && (
              <span className="ml-1.5 inline-flex items-center justify-center h-4 min-w-4 px-1 text-[10px] font-bold rounded-full bg-destructive text-destructive-foreground">
                {unpaidCount}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="attendance">
            Attendance
            {student._count ? ` (${student._count.attendanceRecords})` : ''}
          </TabsTrigger>
        </TabsList>

        {/* ── Overview Tab ── */}
        <TabsContent value="overview" className="mt-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-3"><CardTitle className="text-sm">Contact Information</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-3 text-sm"><Phone className="h-4 w-4 text-muted-foreground" /><span>{student.mobile || 'Not set'}</span></div>
                {student.whatsapp && student.whatsapp !== student.mobile && (
                  <div className="flex items-center gap-3 text-sm"><Phone className="h-4 w-4 text-muted-foreground" /><span>WhatsApp: {student.whatsapp}</span></div>
                )}
                <div className="flex items-center gap-3 text-sm"><Mail className="h-4 w-4 text-muted-foreground" /><span>{student.email || 'Not set'}</span></div>
                <div className="flex items-start gap-3 text-sm"><MapPin className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" /><span>{[student.addressLine1, student.city, student.district].filter(Boolean).join(', ') || 'Not set'}</span></div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3"><CardTitle className="text-sm">Academic Information</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-3 text-sm"><School className="h-4 w-4 text-muted-foreground" /><span>{student.schoolName || 'Not set'}</span></div>
                <div className="flex items-center gap-3 text-sm"><User className="h-4 w-4 text-muted-foreground" /><span>{student.grade}{student.stream ? ` - ${student.stream} Stream` : ''}</span></div>
                <div className="flex items-center gap-3 text-sm"><Calendar className="h-4 w-4 text-muted-foreground" /><span>{student.examYear ? `Exam Year: ${student.examYear}` : 'Not set'}</span></div>
                <div className="flex items-center gap-3 text-sm"><CreditCard className="h-4 w-4 text-muted-foreground" /><span>Enrolled: {formatDate(student.enrolledAt)}</span></div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ── Batches Tab ── */}
        <TabsContent value="batches" className="mt-4">
          {student.activeBatches && student.activeBatches.length > 0 ? (
            <div className="grid gap-3">
              {student.activeBatches.map(batch => (
                <Card key={batch.id}>
                  <CardContent className="p-4 flex items-center justify-between">
                    <div>
                      <p className="font-medium">{batch.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {batch.subject?.name || 'No subject'}
                        {batch.teacher ? ` \u00b7 ${batch.teacher.firstName} ${batch.teacher.lastName}` : ''}
                      </p>
                    </div>
                    <Badge className="bg-emerald-100 text-emerald-700 text-xs">active</Badge>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                <School className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No active batch enrollments</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ── Fees Tab ── */}
        <TabsContent value="fees" className="mt-4 space-y-4">
          {/* Summary + Record Payment button */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <div className="flex gap-3 flex-1">
              <div className="flex-1 bg-emerald-50 border border-emerald-200 rounded-lg p-3 text-center">
                <p className="text-xs text-emerald-600 font-medium">Total Paid</p>
                <p className="text-lg font-bold text-emerald-700">{formatLKR(student.totalPaid)}</p>
              </div>
              <div className={`flex-1 rounded-lg p-3 text-center border ${student.outstandingBalance > 0 ? 'bg-red-50 border-red-200' : 'bg-emerald-50 border-emerald-200'}`}>
                <p className={`text-xs font-medium ${student.outstandingBalance > 0 ? 'text-red-600' : 'text-emerald-600'}`}>Outstanding</p>
                <p className={`text-lg font-bold ${student.outstandingBalance > 0 ? 'text-red-700' : 'text-emerald-700'}`}>{formatLKR(student.outstandingBalance)}</p>
              </div>
              {overdueCount > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-center">
                  <p className="text-xs text-red-600 font-medium">Overdue</p>
                  <p className="text-lg font-bold text-red-700">{overdueCount}</p>
                </div>
              )}
            </div>
            <Button className="bg-emerald-600 hover:bg-emerald-700 shrink-0 gap-2" onClick={() => setShowRecordDialog(true)}>
              <Banknote className="h-4 w-4" /> Record Payment
            </Button>
          </div>

          {/* Status quick filters */}
          <div className="flex flex-wrap items-center gap-2">
            {(['all', 'unpaid', 'overdue', 'partial', 'paid'] as const).map(s => (
              <Button
                key={s}
                variant={feesStatusFilter === s ? 'default' : 'outline'}
                size="sm"
                className={feesStatusFilter === s ? 'bg-emerald-600 hover:bg-emerald-700' : 'text-xs'}
                onClick={() => { setFeesStatusFilter(s); setFeesPagination(p => ({ ...p, page: 1 })) }}
              >
                {s === 'all' ? 'All' : s.charAt(0).toUpperCase() + s.slice(1)}
              </Button>
            ))}
            <span className="text-xs text-muted-foreground ml-1">{feesPagination.total} total</span>
          </div>

          {/* Dues list */}
          <Card>
            <CardContent className="p-0">
              {feesLoading ? (
                <div className="divide-y">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="flex items-center justify-between p-3">
                      <div className="space-y-1.5">
                        <Skeleton className="h-4 w-48" />
                        <Skeleton className="h-3 w-32" />
                      </div>
                      <div className="flex items-center gap-3">
                        <Skeleton className="h-4 w-16" />
                        <Skeleton className="h-5 w-16 rounded-full" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : fees.length === 0 ? (
                <div className="py-12 text-center text-muted-foreground">
                  <Inbox className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No fee dues found</p>
                </div>
              ) : (
                <div className="divide-y max-h-[480px] overflow-y-auto">
                  {fees.map(fee => {
                    const remaining = fee.remaining ?? (fee.amount - fee.amountPaid - fee.waivedAmount)
                    const isPayable = fee.displayStatus === 'unpaid' || fee.displayStatus === 'overdue' || fee.status === 'partial'
                    return (
                      <div key={fee.id} className="flex items-center justify-between p-3 hover:bg-muted/30">
                        <div className="min-w-0 flex-1 mr-3">
                          <p className="text-sm font-medium truncate">{fee.description}</p>
                          <p className="text-xs text-muted-foreground">
                            Due: {formatDate(fee.dueDate)}
                            {fee.amountPaid > 0 && ` | Paid: ${formatLKR(fee.amountPaid)}`}
                            {fee.waivedAmount > 0 && ` | Waived: ${formatLKR(fee.waivedAmount)}`}
                            {fee.batch?.name && ` | ${fee.batch.name}`}
                          </p>
                          {fee.status === 'partial' && (
                            <p className="text-xs text-sky-600 font-medium mt-0.5">Remaining: {formatLKR(remaining)}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          <span className="text-sm font-semibold">{formatLKR(fee.amount)}</span>
                          <Badge className={`text-xs ${STATUS_BADGE_CLASSES[fee.displayStatus] || STATUS_BADGE_CLASSES[fee.status] || ''}`}>
                            {fee.displayStatus || fee.status}
                          </Badge>
                          {isPayable && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-xs h-7 border-emerald-300 text-emerald-700 hover:bg-emerald-50"
                              onClick={() => {
                                setQuickPayDue(fee)
                                setQuickPayAmount(String(remaining > 0 ? remaining : fee.amount))
                              }}
                            >
                              Pay
                            </Button>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Pagination */}
          {feesPagination.totalPages > 1 && (
            <div className="flex items-center justify-center gap-1">
              <Button variant="outline" size="sm" disabled={feesPagination.page <= 1} onClick={() => setFeesPagination(p => ({ ...p, page: p.page - 1 }))}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              {Array.from({ length: feesPagination.totalPages }, (_, i) => i + 1)
                .filter(p => p === 1 || p === feesPagination.totalPages || Math.abs(p - feesPagination.page) <= 1)
                .map((p, i, arr) => (
                  <span key={p} className="flex items-center">
                    {i > 0 && arr[i - 1] !== p - 1 && <span className="px-1 text-muted-foreground">...</span>}
                    <Button
                      variant={p === feesPagination.page ? 'default' : 'outline'}
                      size="sm"
                      className={p === feesPagination.page ? 'bg-emerald-600 hover:bg-emerald-700 h-8 w-8' : 'h-8 w-8'}
                      onClick={() => setFeesPagination(prev => ({ ...prev, page: p }))}
                    >
                      {p}
                    </Button>
                  </span>
                ))
              }
              <Button variant="outline" size="sm" disabled={feesPagination.page >= feesPagination.totalPages} onClick={() => setFeesPagination(p => ({ ...p, page: p.page + 1 }))}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}

          {/* Payment History */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold flex items-center gap-2"><Receipt className="h-4 w-4" /> Payment History</h3>
            <Card>
              <CardContent className="p-0">
                {paymentsLoading ? (
                  <div className="divide-y">
                    {Array.from({ length: 3 }).map((_, i) => (
                      <div key={i} className="flex items-center justify-between p-3">
                        <div className="space-y-1.5">
                          <Skeleton className="h-4 w-40" />
                          <Skeleton className="h-3 w-28" />
                        </div>
                        <Skeleton className="h-4 w-20" />
                      </div>
                    ))}
                  </div>
                ) : payments.length === 0 ? (
                  <div className="py-8 text-center text-muted-foreground">
                    <p className="text-sm">No payments recorded yet</p>
                  </div>
                ) : (
                  <div className="divide-y max-h-[320px] overflow-y-auto">
                    {payments.map(p => (
                      <div key={p.id} className="flex items-center justify-between p-3">
                        <div>
                          <p className="text-sm font-medium">
                            {p.receipt?.receiptNumber && (
                              <span className="font-mono text-xs text-muted-foreground mr-1.5">{p.receipt.receiptNumber}</span>
                            )}
                            {METHOD_LABELS[p.paymentMethod] || p.paymentMethod}
                          </p>
                          <p className="text-xs text-muted-foreground">{formatDateTime(p.recordedAt)}</p>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-semibold text-emerald-700">{formatLKR(p.amount)}</span>
                          <Badge className={`text-xs ${p.status === 'completed' ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-600'}`}>
                            {p.status}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ── Attendance Tab ── */}
        <TabsContent value="attendance" className="mt-4 space-y-4">
          {/* Stats */}
          <div className="grid grid-cols-3 gap-4">
            <Card className="p-4 text-center">
              <p className="text-2xl font-bold">{attendanceRate !== null ? `${attendanceRate}%` : '—'}</p>
              <p className="text-xs text-muted-foreground">Attendance Rate</p>
            </Card>
            <Card className="p-4 text-center">
              <p className="text-2xl font-bold text-emerald-600">
                {attendanceRecords.filter(a => a.status === 'present').length}
              </p>
              <p className="text-xs text-muted-foreground">Present</p>
            </Card>
            <Card className="p-4 text-center">
              <p className="text-2xl font-bold">{attendanceRecords.length}</p>
              <p className="text-xs text-muted-foreground">Total Records</p>
            </Card>
          </div>

          {/* Records list */}
          <Card>
            <CardContent className="p-0">
              {attendanceRecords.length === 0 ? (
                <div className="py-12 text-center text-muted-foreground">
                  <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No attendance records</p>
                </div>
              ) : (
                <div className="divide-y max-h-[480px] overflow-y-auto">
                  {attendanceRecords.map(record => (
                    <div key={record.id} className="flex items-center justify-between p-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="text-xs text-muted-foreground w-20 shrink-0">
                          {formatDate(record.classSession?.sessionDate || record.markedAt)}
                        </span>
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">
                            {record.classSession?.topic || 'Class session'}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {formatDateTime(record.markedAt)}
                          </p>
                        </div>
                      </div>
                      <Badge className={`text-xs shrink-0 ${ATTENDANCE_COLORS[record.status] || 'bg-gray-100 text-gray-600'}`}>
                        {record.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ── Quick Pay Dialog ── */}
      <Dialog open={!!quickPayDue} onOpenChange={(open) => !open && setQuickPayDue(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Banknote className="h-5 w-5" /> Record Payment</DialogTitle>
            <DialogDescription>
              {quickPayDue?.description}
              {quickPayDue && (
                <span className="block mt-1 font-medium text-foreground">
                  Remaining: {formatLKR(quickPayDue.remaining ?? (quickPayDue.amount - quickPayDue.amountPaid - quickPayDue.waivedAmount))}
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Amount (LKR)</Label>
              <Input
                type="number"
                min="1"
                step="0.01"
                value={quickPayAmount}
                onChange={(e) => setQuickPayAmount(e.target.value)}
                placeholder="Enter amount"
              />
            </div>
            <div className="space-y-2">
              <Label>Payment Method</Label>
              <Select value={quickPayMethod} onValueChange={setQuickPayMethod}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                  <SelectItem value="online">Online</SelectItem>
                  <SelectItem value="cheque">Cheque</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Notes (optional)</Label>
              <Input value={quickPayNotes} onChange={(e) => setQuickPayNotes(e.target.value)} placeholder="Any notes..." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setQuickPayDue(null)}>Cancel</Button>
            <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={handleQuickPay} disabled={quickPaySubmitting}>
              {quickPaySubmitting && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />}
              Record Payment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Record Payment Dialog (standalone) ── */}
      <Dialog open={showRecordDialog} onOpenChange={setShowRecordDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Banknote className="h-5 w-5" /> Record Payment</DialogTitle>
            <DialogDescription>
              Record a payment for {student?.fullName}. It will auto-allocate to outstanding dues (oldest first).
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {student?.outstandingBalance > 0 && (
              <div className="rounded-lg bg-amber-50 border border-amber-200 p-3">
                <p className="text-sm text-amber-700">
                  Outstanding balance: <span className="font-bold">{formatLKR(student.outstandingBalance)}</span>
                </p>
              </div>
            )}
            <div className="space-y-2">
              <Label>Amount (LKR)</Label>
              <Input
                type="number"
                min="1"
                step="0.01"
                value={recordAmount}
                onChange={(e) => setRecordAmount(e.target.value)}
                placeholder="Enter amount"
              />
            </div>
            <div className="space-y-2">
              <Label>Payment Method</Label>
              <Select value={recordMethod} onValueChange={setRecordMethod}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                  <SelectItem value="online">Online</SelectItem>
                  <SelectItem value="cheque">Cheque</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Notes (optional)</Label>
              <Input value={recordNotes} onChange={(e) => setRecordNotes(e.target.value)} placeholder="Any notes..." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRecordDialog(false)}>Cancel</Button>
            <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={handleRecordPayment} disabled={recordSubmitting}>
              {recordSubmitting && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />}
              Record Payment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
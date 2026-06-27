'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import {
  Plus, CreditCard, DollarSign, AlertTriangle, Search, FileText,
  Receipt, Clock, CheckCircle2, Loader2, Inbox, RefreshCw,
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { useAppStore } from '@/lib/store'

// ── Types ──────────────────────────────────────────────────────────────────

interface FeeStructure {
  id: string
  name: string
  type: string
  amount: number
  batchId?: string | null
  batch?: { id: string; name: string; subjectId?: string; subject?: { id: string; name: string } | null } | null
  branch?: { id: string; name: string } | null
  isRecurring: boolean
  recurrence?: string | null
  dueDay?: number | null
  gracePeriodDays?: number
  lateFeeAmount?: number
  _count: { feeDues: number }
}

interface FeeDue {
  id: string
  student?: { id: string; fullName: string; studentNumber: string; mobile?: string } | null
  batch?: { id: string; name: string; subject?: { id: string; name: string } | null } | null
  feeStructure?: { id: string; name: string; type: string } | null
  description: string
  amount: number
  dueDate: string
  status: 'paid' | 'unpaid' | 'overdue' | 'partially_paid' | 'partial'
  amountPaid: number
  waivedAmount?: number
  lateFeeApplied?: number
}

interface Student {
  id: string
  fullName: string
  studentNumber: string
  mobile?: string
  status: string
}

interface Batch {
  id: string
  name: string
  subject?: { id: string; name: string } | null
}

// ── Helpers ────────────────────────────────────────────────────────────────

function formatLKR(amount: number): string {
  return `Rs. ${amount.toLocaleString('en-LK')}`
}

function formatDate(dateStr: string): string {
  if (!dateStr) return '—'
  const d = new Date(dateStr)
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

const dueStatusColors: Record<string, string> = {
  paid: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400',
  unpaid: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400',
  overdue: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400',
  partially_paid: 'bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-400',
  partial: 'bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-400',
}

const statusLabel: Record<string, string> = {
  paid: 'Paid',
  unpaid: 'Unpaid',
  overdue: 'Overdue',
  partially_paid: 'Partially Paid',
  partial: 'Partially Paid',
}

// ── Component ──────────────────────────────────────────────────────────────

export default function FeesView() {
  const { toast } = useToast()
  const { currentInstitute, currentUser } = useAppStore()
  const instituteId = currentInstitute?.id

  // Data states
  const [structures, setStructures] = useState<FeeStructure[]>([])
  const [dues, setDues] = useState<FeeDue[]>([])
  const [students, setStudents] = useState<Student[]>([])
  const [batches, setBatches] = useState<Batch[]>([])
  const [summary, setSummary] = useState({ totalUnpaid: 0, totalUnpaidAmount: 0 })

  // UI states
  const [loading, setLoading] = useState(true)
  const [studentsLoading, setStudentsLoading] = useState(false)
  const [batchesLoading, setBatchesLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [activeTab, setActiveTab] = useState('dues')

  // Dialogs
  const [showRecordDialog, setShowRecordDialog] = useState(false)
  const [showStructureDialog, setShowStructureDialog] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  // Record payment form
  const [payForm, setPayForm] = useState({
    studentId: '',
    amount: '',
    method: 'cash',
    notes: '',
  })

  // Create structure form
  const [structForm, setStructForm] = useState({
    name: '',
    type: 'monthly',
    amount: '',
    batchId: '',
    isRecurring: true,
    recurrence: 'monthly',
    dueDay: '5',
    gracePeriodDays: '3',
    lateFeeAmount: '0',
  })

  // ── Data Fetching ──────────────────────────────────────────────────────

  const fetchDues = useCallback(async () => {
    if (!instituteId) return
    try {
      const res = await fetch(`/api/fees/dues?instituteId=${instituteId}&limit=100`)
      if (res.ok) {
        const data = await res.json()
        setDues(data.dues || [])
        setSummary(data.summary || { totalUnpaid: 0, totalUnpaidAmount: 0 })
      }
    } catch (err) {
      console.error('Failed to fetch dues:', err)
    }
  }, [instituteId])

  const fetchStructures = useCallback(async () => {
    if (!instituteId) return
    try {
      const res = await fetch(`/api/fees/structures?instituteId=${instituteId}`)
      if (res.ok) {
        const data = await res.json()
        setStructures(data.structures || [])
      }
    } catch (err) {
      console.error('Failed to fetch structures:', err)
    }
  }, [instituteId])

  const fetchStudents = useCallback(async () => {
    if (!instituteId) return
    setStudentsLoading(true)
    try {
      const res = await fetch(`/api/students?instituteId=${instituteId}&limit=200`)
      if (res.ok) {
        const data = await res.json()
        setStudents(data.students || [])
      }
    } catch (err) {
      console.error('Failed to fetch students:', err)
    } finally {
      setStudentsLoading(false)
    }
  }, [instituteId])

  const fetchBatches = useCallback(async () => {
    if (!instituteId) return
    setBatchesLoading(true)
    try {
      const res = await fetch(`/api/batches?instituteId=${instituteId}`)
      if (res.ok) {
        const data = await res.json()
        setBatches(data.batches || [])
      }
    } catch (err) {
      console.error('Failed to fetch batches:', err)
    } finally {
      setBatchesLoading(false)
    }
  }, [instituteId])

  useEffect(() => {
    if (!instituteId) {
      setLoading(false)
      return
    }
    setLoading(true)
    Promise.all([fetchDues(), fetchStructures()]).finally(() => setLoading(false))
  }, [fetchDues, fetchStructures])

  const openRecordDialog = () => {
    setPayForm({ studentId: '', amount: '', method: 'cash', notes: '' })
    setShowRecordDialog(true)
    fetchStudents()
  }

  const openStructureDialog = () => {
    setStructForm({
      name: '',
      type: 'monthly',
      amount: '',
      batchId: '',
      isRecurring: true,
      recurrence: 'monthly',
      dueDay: '5',
      gracePeriodDays: '3',
      lateFeeAmount: '0',
    })
    setShowStructureDialog(true)
    fetchBatches()
  }

  // ── Computed ───────────────────────────────────────────────────────────

  const totalOutstanding = dues
    .filter((d) => d.status !== 'paid')
    .reduce((sum, d) => sum + (d.amount - d.amountPaid - (d.waivedAmount || 0)), 0)

  const overdueCount = dues.filter((d) => d.status === 'overdue').length

  const filteredDues = dues.filter(
    (d) =>
      search === '' ||
      (d.student?.fullName || '').toLowerCase().includes(search.toLowerCase()) ||
      (d.student?.studentNumber || '').toLowerCase().includes(search.toLowerCase()) ||
      d.description.toLowerCase().includes(search.toLowerCase())
  )

  // ── Actions ────────────────────────────────────────────────────────────

  const handleRecordPayment = async () => {
    if (!instituteId || !payForm.studentId || !payForm.amount) {
      toast({ title: 'Missing fields', description: 'Please select a student and enter an amount.', variant: 'destructive' })
      return
    }

    setSubmitting(true)
    try {
      const res = await fetch('/api/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          instituteId,
          studentId: payForm.studentId,
          amount: parseFloat(payForm.amount),
          paymentMethod: payForm.method,
          recordedBy: currentUser?.id,
          notes: payForm.notes || undefined,
        }),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed to record payment')
      }

      toast({
        title: 'Payment recorded',
        description: `${formatLKR(parseFloat(payForm.amount))} payment recorded successfully.`,
      })
      setShowRecordDialog(false)
      setPayForm({ studentId: '', amount: '', method: 'cash', notes: '' })
      // Refresh dues to reflect updated statuses
      fetchDues()
    } catch (err: any) {
      toast({
        title: 'Payment failed',
        description: err.message || 'Could not record payment. Please try again.',
        variant: 'destructive',
      })
    } finally {
      setSubmitting(false)
    }
  }

  const handleCreateStructure = async () => {
    if (!instituteId || !structForm.name || !structForm.amount) {
      toast({ title: 'Missing fields', description: 'Please enter a name and amount.', variant: 'destructive' })
      return
    }

    setSubmitting(true)
    try {
      const body: Record<string, any> = {
        instituteId,
        name: structForm.name,
        type: structForm.type,
        amount: parseFloat(structForm.amount),
        isRecurring: structForm.isRecurring,
        recurrence: structForm.isRecurring ? structForm.recurrence : undefined,
        dueDay: structForm.isRecurring ? parseInt(structForm.dueDay) || 1 : undefined,
        gracePeriodDays: parseInt(structForm.gracePeriodDays) || 0,
        lateFeeAmount: parseFloat(structForm.lateFeeAmount) || 0,
      }

      if (structForm.batchId) {
        body.batchId = structForm.batchId
      }

      const res = await fetch('/api/fees/structures', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed to create fee structure')
      }

      toast({
        title: 'Fee structure created',
        description: `"${structForm.name}" has been created successfully.`,
      })
      setShowStructureDialog(false)
      fetchStructures()
    } catch (err: any) {
      toast({
        title: 'Creation failed',
        description: err.message || 'Could not create fee structure. Please try again.',
        variant: 'destructive',
      })
    } finally {
      setSubmitting(false)
    }
  }

  // ── Guard ──────────────────────────────────────────────────────────────

  if (!instituteId) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center space-y-3">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground mx-auto" />
          <p className="text-sm text-muted-foreground">Loading institute data...</p>
        </div>
      </div>
    )
  }

  // ── Render ─────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Fees & Payments</h1>
          <p className="text-sm text-muted-foreground">Manage fee structures and track payments</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="gap-2" onClick={() => { setLoading(true); Promise.all([fetchDues(), fetchStructures()]).finally(() => setLoading(false)) }}>
            <RefreshCw className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Refresh</span>
          </Button>
          <Button className="gap-2" onClick={openRecordDialog}>
            <DollarSign className="h-4 w-4" /> Record Payment
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      {loading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="p-4">
              <Skeleton className="h-4 w-24 mb-2" />
              <Skeleton className="h-8 w-20" />
              <Skeleton className="h-3 w-16 mt-2" />
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="p-4">
            <p className="text-sm text-muted-foreground flex items-center gap-1.5">
              <CreditCard className="h-3.5 w-3.5" /> Total Outstanding
            </p>
            <p className="text-2xl font-bold text-destructive mt-1">{formatLKR(totalOutstanding)}</p>
            <p className="text-xs text-muted-foreground mt-1">{dues.filter((d) => d.status !== 'paid').length} unpaid dues</p>
          </Card>
          <Card className="p-4">
            <p className="text-sm text-muted-foreground flex items-center gap-1.5">
              <AlertTriangle className="h-3.5 w-3.5" /> Overdue
            </p>
            <p className="text-2xl font-bold text-red-600 mt-1">{overdueCount}</p>
            <p className="text-xs text-red-500">students with overdue fees</p>
          </Card>
          <Card className="p-4">
            <p className="text-sm text-muted-foreground flex items-center gap-1.5">
              <FileText className="h-3.5 w-3.5" /> Fee Structures
            </p>
            <p className="text-2xl font-bold mt-1">{structures.length}</p>
            <p className="text-xs text-emerald-600">{structures.filter((s) => s.isRecurring).length} recurring</p>
          </Card>
          <Card className="p-4">
            <p className="text-sm text-muted-foreground flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5" /> Unpaid Dues
            </p>
            <p className="text-2xl font-bold mt-1">{summary.totalUnpaid}</p>
            <p className="text-xs text-muted-foreground">{formatLKR(summary.totalUnpaidAmount)}</p>
          </Card>
        </div>
      )}

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="dues">Fee Dues ({dues.length})</TabsTrigger>
          <TabsTrigger value="structures">Structures ({structures.length})</TabsTrigger>
          <TabsTrigger value="record">Record Payment</TabsTrigger>
        </TabsList>

        {/* ─── Dues Tab ────────────────────────────────────────────────── */}
        <TabsContent value="dues" className="mt-4 space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by student name, number, or description..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Card>
            <CardContent className="p-0">
              {loading ? (
                <div className="p-6 space-y-3">
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-3/4" />
                </div>
              ) : filteredDues.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center px-4">
                  <Inbox className="h-12 w-12 text-muted-foreground/40 mb-4" />
                  <h3 className="font-medium text-lg">
                    {search ? 'No matching dues found' : 'No fee dues yet'}
                  </h3>
                  <p className="text-sm text-muted-foreground mt-1 max-w-sm">
                    {search
                      ? 'Try adjusting your search terms.'
                      : 'Fee dues will appear here once fee structures are created and dues are generated for students.'}
                  </p>
                  {!search && (
                    <Button variant="outline" className="mt-4 gap-2" onClick={() => setActiveTab('structures')}>
                      <Plus className="h-4 w-4" /> Create Fee Structure
                    </Button>
                  )}
                </div>
              ) : (
                <div className="max-h-[500px] overflow-y-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Student</TableHead>
                        <TableHead className="hidden sm:table-cell">Description</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead className="hidden md:table-cell">Due Date</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredDues.map((due) => (
                        <TableRow key={due.id}>
                          <TableCell>
                            <p className="font-medium text-sm">{due.student?.fullName || '—'}</p>
                            <p className="text-xs text-muted-foreground">{due.student?.studentNumber || ''}</p>
                          </TableCell>
                          <TableCell className="hidden sm:table-cell">
                            <p className="text-sm">{due.description}</p>
                            {due.feeStructure && (
                              <p className="text-xs text-muted-foreground">{due.feeStructure.name}</p>
                            )}
                          </TableCell>
                          <TableCell>
                            <p className="text-sm font-medium">{formatLKR(due.amount)}</p>
                            {due.amountPaid > 0 && (
                              <p className="text-xs text-emerald-600">Paid: {formatLKR(due.amountPaid)}</p>
                            )}
                          </TableCell>
                          <TableCell className="hidden md:table-cell text-sm">
                            {formatDate(due.dueDate)}
                          </TableCell>
                          <TableCell>
                            <Badge className={`text-xs border-0 ${dueStatusColors[due.status] || ''}`}>
                              {statusLabel[due.status] || due.status}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─── Structures Tab ───────────────────────────────────────────── */}
        <TabsContent value="structures" className="mt-4 space-y-4">
          <div className="flex justify-end">
            <Button size="sm" className="gap-2" onClick={openStructureDialog}>
              <Plus className="h-4 w-4" /> Add Fee Structure
            </Button>
          </div>

          {loading ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <Card key={i}>
                  <CardContent className="p-4 space-y-3">
                    <Skeleton className="h-5 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                    <Separator />
                    <Skeleton className="h-7 w-24" />
                    <Skeleton className="h-5 w-20" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : structures.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center px-4">
              <FileText className="h-12 w-12 text-muted-foreground/40 mb-4" />
              <h3 className="font-medium text-lg">No fee structures yet</h3>
              <p className="text-sm text-muted-foreground mt-1 max-w-sm">
                Create your first fee structure to start tracking and collecting fees from students.
              </p>
              <Button className="mt-4 gap-2" onClick={openStructureDialog}>
                <Plus className="h-4 w-4" /> Create Fee Structure
              </Button>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {structures.map((s) => (
                <Card key={s.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <h3 className="font-medium text-sm truncate">{s.name}</h3>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {s.batch?.name
                            ? `${s.batch.name}${s.batch.subject ? ` — ${s.batch.subject.name}` : ''}`
                            : 'General'}{' '}
                          &middot; {s.type}
                        </p>
                      </div>
                      <Badge
                        className={`text-xs border-0 shrink-0 ${
                          s.isRecurring
                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400'
                            : 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400'
                        }`}
                      >
                        {s.isRecurring ? 'Recurring' : 'One-time'}
                      </Badge>
                    </div>

                    <p className="text-lg font-bold mt-3">{formatLKR(s.amount)}</p>

                    {s.isRecurring && s.recurrence && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Due on day {s.dueDay || 1} of each {s.recurrence.replace('_', ' ')}
                        {s.gracePeriodDays ? ` · ${s.gracePeriodDays} day grace` : ''}
                      </p>
                    )}

                    <div className="flex items-center justify-between mt-3 pt-3 border-t">
                      <span className="text-xs text-muted-foreground">
                        {s._count.feeDues} {s._count.feeDues === 1 ? 'due' : 'dues'} generated
                      </span>
                      <Badge className="bg-emerald-100 text-emerald-700 text-xs border-0 dark:bg-emerald-900/40 dark:text-emerald-400">
                        Active
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* ─── Record Payment Tab ──────────────────────────────────────── */}
        <TabsContent value="record" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Receipt className="h-5 w-5" /> Record a Payment
              </CardTitle>
              <CardDescription>Manually record a payment received from a student</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Student *</Label>
                {studentsLoading ? (
                  <Skeleton className="h-10 w-full" />
                ) : students.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No students found. Add students first.</p>
                ) : (
                  <Select
                    value={payForm.studentId}
                    onValueChange={(v) => setPayForm({ ...payForm, studentId: v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Search and select student..." />
                    </SelectTrigger>
                    <SelectContent className="max-h-64 overflow-y-auto">
                      {students
                        .filter(
                          (s) => s.status === 'active'
                        )
                        .map((s) => (
                          <SelectItem key={s.id} value={s.id}>
                            {s.fullName} ({s.studentNumber})
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Amount (LKR) *</Label>
                  <Input
                    type="number"
                    min="1"
                    placeholder="5000"
                    value={payForm.amount}
                    onChange={(e) => setPayForm({ ...payForm, amount: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Payment Method</Label>
                  <Select
                    value={payForm.method}
                    onValueChange={(v) => setPayForm({ ...payForm, method: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cash">Cash</SelectItem>
                      <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                      <SelectItem value="online">Online Payment</SelectItem>
                      <SelectItem value="cheque">Cheque</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Notes</Label>
                <Input
                  placeholder="Optional notes..."
                  value={payForm.notes}
                  onChange={(e) => setPayForm({ ...payForm, notes: e.target.value })}
                />
              </div>
              <Button
                className="gap-2"
                onClick={handleRecordPayment}
                disabled={submitting || !payForm.studentId || !payForm.amount}
              >
                {submitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <CreditCard className="h-4 w-4" />
                )}
                Record Payment
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ─── Record Payment Dialog (Header Button) ──────────────────────── */}
      <Dialog open={showRecordDialog} onOpenChange={(open) => { setShowRecordDialog(open); if (!open) setPayForm({ studentId: '', amount: '', method: 'cash', notes: '' }) }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Receipt className="h-5 w-5" /> Record Payment
            </DialogTitle>
            <DialogDescription>Record a payment received from a student</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Student *</Label>
              {studentsLoading ? (
                <Skeleton className="h-10 w-full" />
              ) : students.length === 0 ? (
                <p className="text-sm text-muted-foreground">No students found.</p>
              ) : (
                <Select
                  value={payForm.studentId}
                  onValueChange={(v) => setPayForm({ ...payForm, studentId: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select student..." />
                  </SelectTrigger>
                  <SelectContent className="max-h-64 overflow-y-auto">
                    {students
                      .filter((s) => s.status === 'active')
                      .map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.fullName} ({s.studentNumber})
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              )}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Amount (LKR) *</Label>
                <Input
                  type="number"
                  min="1"
                  placeholder="5000"
                  value={payForm.amount}
                  onChange={(e) => setPayForm({ ...payForm, amount: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Method</Label>
                <Select
                  value={payForm.method}
                  onValueChange={(v) => setPayForm({ ...payForm, method: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">Cash</SelectItem>
                    <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                    <SelectItem value="online">Online</SelectItem>
                    <SelectItem value="cheque">Cheque</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Notes</Label>
              <Input
                placeholder="Optional notes..."
                value={payForm.notes}
                onChange={(e) => setPayForm({ ...payForm, notes: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRecordDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleRecordPayment}
              disabled={submitting || !payForm.studentId || !payForm.amount}
              className="gap-2"
            >
              {submitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle2 className="h-4 w-4" />
              )}
              Record
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Create Fee Structure Dialog ───────────────────────────────── */}
      <Dialog open={showStructureDialog} onOpenChange={setShowStructureDialog}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5" /> Add Fee Structure
            </DialogTitle>
            <DialogDescription>
              Create a new fee structure for your institute
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Structure Name *</Label>
              <Input
                placeholder="e.g. A/L Physics Monthly Fee"
                value={structForm.name}
                onChange={(e) => setStructForm({ ...structForm, name: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Type *</Label>
                <Select
                  value={structForm.type}
                  onValueChange={(v) => setStructForm({ ...structForm, type: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="term">Term</SelectItem>
                    <SelectItem value="one_time">One-time</SelectItem>
                    <SelectItem value="annual">Annual</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Amount (LKR) *</Label>
                <Input
                  type="number"
                  min="1"
                  placeholder="5000"
                  value={structForm.amount}
                  onChange={(e) => setStructForm({ ...structForm, amount: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Batch (Optional)</Label>
              {batchesLoading ? (
                <Skeleton className="h-10 w-full" />
              ) : (
                <Select
                  value={structForm.batchId}
                  onValueChange={(v) => setStructForm({ ...structForm, batchId: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a batch or leave general" />
                  </SelectTrigger>
                  <SelectContent className="max-h-64 overflow-y-auto">
                    {batches.map((b) => (
                      <SelectItem key={b.id} value={b.id}>
                        {b.name}{b.subject ? ` — ${b.subject.name}` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            <Separator />

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Recurring</Label>
                <button
                  type="button"
                  role="switch"
                  aria-checked={structForm.isRecurring}
                  onClick={() =>
                    setStructForm({ ...structForm, isRecurring: !structForm.isRecurring })
                  }
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${
                    structForm.isRecurring ? 'bg-primary' : 'bg-input'
                  }`}
                >
                  <span
                    className={`pointer-events-none block h-5 w-5 rounded-full bg-background shadow-lg ring-0 transition-transform ${
                      structForm.isRecurring ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            </div>

            {structForm.isRecurring && (
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Recurrence</Label>
                  <Select
                    value={structForm.recurrence}
                    onValueChange={(v) => setStructForm({ ...structForm, recurrence: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="monthly">Monthly</SelectItem>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="quarterly">Quarterly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Due Day</Label>
                  <Input
                    type="number"
                    min="1"
                    max="31"
                    value={structForm.dueDay}
                    onChange={(e) => setStructForm({ ...structForm, dueDay: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Grace (days)</Label>
                  <Input
                    type="number"
                    min="0"
                    value={structForm.gracePeriodDays}
                    onChange={(e) => setStructForm({ ...structForm, gracePeriodDays: e.target.value })}
                  />
                </div>
              </div>
            )}

            {structForm.isRecurring && (
              <div className="space-y-2">
                <Label>Late Fee Amount (LKR)</Label>
                <Input
                  type="number"
                  min="0"
                  placeholder="0"
                  value={structForm.lateFeeAmount}
                  onChange={(e) => setStructForm({ ...structForm, lateFeeAmount: e.target.value })}
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowStructureDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleCreateStructure}
              disabled={submitting || !structForm.name || !structForm.amount}
              className="gap-2"
            >
              {submitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Plus className="h-4 w-4" />
              )}
              Create Structure
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { Separator } from '@/components/ui/separator'
import { Plus, DollarSign, AlertTriangle, Search, FileText, Receipt, Clock, CheckCircle2, Loader2, Inbox, RefreshCw, MoreHorizontal, Pencil, Trash2, Zap, Ban, RotateCcw, Banknote, ChevronLeft, ChevronRight, Filter, X } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { useAppStore } from '@/lib/store'

// ─── Types ───────────────────────────────────────────────────────

interface Student {
  id: string
  fullName: string
  studentNumber: string
}

interface Batch {
  id: string
  name: string
  subject?: { name: string } | null
}

interface FeeDue {
  id: string
  studentId: string
  displayStatus: string
  student: { fullName: string; studentNumber: string; mobile?: string }
  batch: { name: string; subject?: { name: string } | null } | null
  feeStructure: { name: string; type: string } | null
  description: string
  amount: number
  amountPaid: number
  waivedAmount: number
  dueDate: string
  status: string
  periodMonth?: number
  periodYear?: number
}

interface FeeStructure {
  id: string
  name: string
  type: string
  amount: number
  isRecurring: boolean
  recurrence: string | null
  dueDay: number | null
  gracePeriodDays: number | null
  lateFeeAmount: number | null
  description: string | null
  isActive: boolean
  batch: { name: string; subject?: { name: string } | null } | null
  _count?: { feeDues: number }
}

// ─── Constants ───────────────────────────────────────────────────

const ITEMS_PER_PAGE = 20
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
const STATUS_FILTERS = ['all', 'unpaid', 'overdue', 'partial', 'paid'] as const

const STATUS_BADGE_CLASSES: Record<string, string> = {
  unpaid: 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800',
  overdue: 'bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800',
  partial: 'bg-sky-100 text-sky-700 border-sky-200 dark:bg-sky-900/30 dark:text-sky-400 dark:border-sky-800',
  paid: 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800',
}

// ─── Helpers ─────────────────────────────────────────────────────

function formatDate(dateStr: string): string {
  const d = new Date(dateStr)
  const day = String(d.getDate()).padStart(2, '0')
  const shortMonths = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  return `${day} ${shortMonths[d.getMonth()]} ${d.getFullYear()}`
}

function formatLKR(amount: number): string {
  return `Rs. ${amount.toLocaleString('en-LK')}`
}

// ─── Component ───────────────────────────────────────────────────

export default function FeesView() {
  const { toast } = useToast()
  const { currentInstitute, currentUser } = useAppStore()
  const instituteId = currentInstitute?.id || ''

  // ── Dues state ──
  const [dues, setDues] = useState<FeeDue[]>([])
  const [duesSummary, setDuesSummary] = useState({ totalUnpaid: 0, totalUnpaidAmount: 0, totalOverdue: 0, totalOverdueAmount: 0, totalPartial: 0 })
  const [duesPagination, setDuesPagination] = useState({ page: 1, limit: ITEMS_PER_PAGE, total: 0, totalPages: 0 })
  const [duesLoading, setDuesLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<Record<string, boolean>>({})

  // ── Structures state ──
  const [structures, setStructures] = useState<FeeStructure[]>([])
  const [structuresLoading, setStructuresLoading] = useState(true)

  // ── Filter / search state ──
  const [searchQuery, setSearchQuery] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [showFilters, setShowFilters] = useState(false)
  const [filterBatch, setFilterBatch] = useState('')
  const [filterMonth, setFilterMonth] = useState('')
  const [filterYear, setFilterYear] = useState('')

  // ── Reference data ──
  const [batches, setBatches] = useState<Batch[]>([])
  const [students, setStudents] = useState<Student[]>([])

  // ── Dialog states ──
  const [quickPayDue, setQuickPayDue] = useState<FeeDue | null>(null)
  const [waiveDue, setWaiveDue] = useState<FeeDue | null>(null)
  const [showRecordDialog, setShowRecordDialog] = useState(false)
  const [showStructureDialog, setShowStructureDialog] = useState(false)
  const [editingStructure, setEditingStructure] = useState<FeeStructure | null>(null)
  const [generateStructure, setGenerateStructure] = useState<FeeStructure | null>(null)
  const [deleteStructure, setDeleteStructure] = useState<FeeStructure | null>(null)

  // ── Form states ──
  const [quickPayAmount, setQuickPayAmount] = useState('')
  const [quickPayMethod, setQuickPayMethod] = useState('cash')
  const [quickPayNotes, setQuickPayNotes] = useState('')
  const [quickPaySubmitting, setQuickPaySubmitting] = useState(false)

  const [waiveAmount, setWaiveAmount] = useState('')
  const [waiveReason, setWaiveReason] = useState('')
  const [waiveSubmitting, setWaiveSubmitting] = useState(false)

  const [recordForm, setRecordForm] = useState({ studentId: '', amount: '', method: 'cash', notes: '' })
  const [recordSubmitting, setRecordSubmitting] = useState(false)

  const [structForm, setStructForm] = useState({
    name: '', type: 'monthly', amount: '', batchId: '', isRecurring: false,
    recurrence: 'monthly', dueDay: '5', gracePeriodDays: '3', lateFeeAmount: '0', description: '',
  })
  const [structSubmitting, setStructSubmitting] = useState(false)

  const [genMonth, setGenMonth] = useState('')
  const [genYear, setGenYear] = useState('')
  const [genSubmitting, setGenSubmitting] = useState(false)

  const [deleteSubmitting, setDeleteSubmitting] = useState(false)

  // ── Has active filters ──
  const hasActiveFilters = statusFilter !== 'all' || !!filterBatch || !!filterMonth || !!filterYear || !!searchQuery

  // ─── Fetch functions ───────────────────────────────────────────

  const fetchDues = useCallback(async () => {
    if (!instituteId) return
    setDuesLoading(true)
    try {
      const params = new URLSearchParams({
        instituteId,
        page: String(duesPagination.page),
        limit: String(ITEMS_PER_PAGE),
      })
      if (searchQuery) params.set('search', searchQuery)
      if (statusFilter !== 'all') params.set('status', statusFilter)
      if (filterBatch) params.set('batchId', filterBatch)
      if (filterMonth) params.set('periodMonth', filterMonth)
      if (filterYear) params.set('periodYear', filterYear)

      const res = await fetch(`/api/fees/dues?${params}`)
      if (res.ok) {
        const data = await res.json()
        setDues(data.dues || [])
        setDuesSummary(data.summary || { totalUnpaid: 0, totalUnpaidAmount: 0, totalOverdue: 0, totalOverdueAmount: 0, totalPartial: 0 })
        setDuesPagination(data.pagination || { page: 1, limit: ITEMS_PER_PAGE, total: 0, totalPages: 0 })
      }
    } catch {
      toast({ title: 'Error', description: 'Failed to fetch fee dues', variant: 'destructive' })
    } finally {
      setDuesLoading(false)
    }
  }, [instituteId, duesPagination.page, searchQuery, statusFilter, filterBatch, filterMonth, filterYear, toast])

  const fetchStructures = useCallback(async () => {
    if (!instituteId) return
    setStructuresLoading(true)
    try {
      const res = await fetch(`/api/fees/structures?instituteId=${instituteId}`)
      if (res.ok) {
        const data = await res.json()
        setStructures(data.structures || [])
      }
    } catch {
      toast({ title: 'Error', description: 'Failed to fetch fee structures', variant: 'destructive' })
    } finally {
      setStructuresLoading(false)
    }
  }, [instituteId, toast])

  const fetchBatches = useCallback(async () => {
    if (!instituteId) return
    try {
      const res = await fetch(`/api/batches?instituteId=${instituteId}`)
      if (res.ok) {
        const data = await res.json()
        setBatches(data.batches || [])
      }
    } catch { /* silent */ }
  }, [instituteId])

  const fetchStudents = useCallback(async () => {
    if (!instituteId) return
    try {
      const res = await fetch(`/api/students?instituteId=${instituteId}&limit=200`)
      if (res.ok) {
        const data = await res.json()
        setStudents(data.students || [])
      }
    } catch { /* silent */ }
  }, [instituteId])

  // ─── Effects ───────────────────────────────────────────────────

  useEffect(() => {
    fetchDues()
  }, [fetchDues])

  useEffect(() => {
    fetchStructures()
  }, [fetchStructures])

  useEffect(() => {
    fetchBatches()
  }, [fetchBatches])

  // Reset page to 1 when filters change
  useEffect(() => {
    setDuesPagination(prev => prev.page !== 1 ? { ...prev, page: 1 } : prev)
  }, [searchQuery, statusFilter, filterBatch, filterMonth, filterYear])

  // ─── Search handler ────────────────────────────────────────────

  const handleSearch = () => {
    setSearchQuery(searchInput)
  }

  const handleSearchKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSearch()
  }

  const clearAllFilters = () => {
    setSearchQuery('')
    setSearchInput('')
    setStatusFilter('all')
    setFilterBatch('')
    setFilterMonth('')
    setFilterYear('')
    setShowFilters(false)
  }

  // ─── Pagination ────────────────────────────────────────────────

  const goToPage = (page: number) => {
    setDuesPagination(prev => ({ ...prev, page }))
  }

  const getPageNumbers = (): (number | '...')[] => {
    const { page, totalPages } = duesPagination
    if (totalPages <= 5) return Array.from({ length: totalPages }, (_, i) => i + 1)
    const pages: (number | '...')[] = []
    if (page <= 3) {
      pages.push(1, 2, 3, 4, '...', totalPages)
    } else if (page >= totalPages - 2) {
      pages.push(1, '...', totalPages - 3, totalPages - 2, totalPages - 1, totalPages)
    } else {
      pages.push(1, '...', page - 1, page, page + 1, '...', totalPages)
    }
    return pages
  }

  const paginationStart = (duesPagination.page - 1) * ITEMS_PER_PAGE + 1
  const paginationEnd = Math.min(duesPagination.page * ITEMS_PER_PAGE, duesPagination.total)

  // ─── Action handlers ───────────────────────────────────────────

  const isPayable = (due: FeeDue) => due.status === 'unpaid' || due.status === 'partial' || due.displayStatus === 'overdue'

  const openQuickPay = (due: FeeDue) => {
    const remaining = due.amount - due.amountPaid - due.waivedAmount
    setQuickPayDue(due)
    setQuickPayAmount(String(remaining))
    setQuickPayMethod('cash')
    setQuickPayNotes('')
  }

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
        toast({ title: 'Payment recorded', description: `${formatLKR(amount)} payment for ${quickPayDue.student.fullName}` })
        setQuickPayDue(null)
        fetchDues()
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

  const openWaive = (due: FeeDue) => {
    const remaining = due.amount - due.amountPaid - due.waivedAmount
    setWaiveDue(due)
    setWaiveAmount(String(remaining))
    setWaiveReason('')
  }

  const handleWaive = async () => {
    if (!waiveDue) return
    const amount = parseFloat(waiveAmount)
    if (isNaN(amount) || amount <= 0) {
      toast({ title: 'Invalid amount', description: 'Please enter a valid waive amount', variant: 'destructive' })
      return
    }
    setWaiveSubmitting(true)
    try {
      const res = await fetch(`/api/fees/dues/${waiveDue.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'waive', amount, reason: waiveReason || undefined }),
      })
      if (res.ok) {
        toast({ title: 'Fee waived', description: `${formatLKR(amount)} waived for ${waiveDue.student.fullName}` })
        setWaiveDue(null)
        fetchDues()
      } else {
        const err = await res.json().catch(() => ({}))
        toast({ title: 'Waive failed', description: err.error || 'Could not waive fee', variant: 'destructive' })
      }
    } catch {
      toast({ title: 'Error', description: 'Network error', variant: 'destructive' })
    } finally {
      setWaiveSubmitting(false)
    }
  }

  const handleMarkPaid = async (due: FeeDue) => {
    setActionLoading(prev => ({ ...prev, [due.id]: true }))
    try {
      const res = await fetch(`/api/fees/dues/${due.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'mark_paid' }),
      })
      if (res.ok) {
        toast({ title: 'Marked as paid', description: `Fee due for ${due.student.fullName} marked as paid` })
        fetchDues()
      } else {
        const err = await res.json().catch(() => ({}))
        toast({ title: 'Failed', description: err.error || 'Could not mark as paid', variant: 'destructive' })
      }
    } catch {
      toast({ title: 'Error', description: 'Network error', variant: 'destructive' })
    } finally {
      setActionLoading(prev => ({ ...prev, [due.id]: false }))
    }
  }

  const handleReopen = async (due: FeeDue) => {
    setActionLoading(prev => ({ ...prev, [due.id]: true }))
    try {
      const res = await fetch(`/api/fees/dues/${due.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reopen' }),
      })
      if (res.ok) {
        toast({ title: 'Reopened', description: `Fee due for ${due.student.fullName} reopened` })
        fetchDues()
      } else {
        const err = await res.json().catch(() => ({}))
        toast({ title: 'Failed', description: err.error || 'Could not reopen fee due', variant: 'destructive' })
      }
    } catch {
      toast({ title: 'Error', description: 'Network error', variant: 'destructive' })
    } finally {
      setActionLoading(prev => ({ ...prev, [due.id]: false }))
    }
  }

  // ─── Record Payment (standalone) ───────────────────────────────

  const openRecordDialog = () => {
    fetchStudents()
    setRecordForm({ studentId: '', amount: '', method: 'cash', notes: '' })
    setShowRecordDialog(true)
  }

  const handleRecordPayment = async () => {
    if (!currentUser || !recordForm.studentId) return
    const amount = parseFloat(recordForm.amount)
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
          studentId: recordForm.studentId,
          amount,
          paymentMethod: recordForm.method,
          recordedBy: currentUser.id,
          notes: recordForm.notes || undefined,
          instituteId,
        }),
      })
      if (res.ok) {
        toast({ title: 'Payment recorded', description: `${formatLKR(amount)} payment recorded successfully` })
        setShowRecordDialog(false)
        fetchDues()
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

  // ─── Structure CRUD ────────────────────────────────────────────

  const openStructureDialog = (struct?: FeeStructure) => {
    if (struct) {
      setEditingStructure(struct)
      setStructForm({
        name: struct.name,
        type: struct.type,
        amount: String(struct.amount),
        batchId: struct.batch?.id || '',
        isRecurring: struct.isRecurring,
        recurrence: struct.recurrence || 'monthly',
        dueDay: String(struct.dueDay ?? 5),
        gracePeriodDays: String(struct.gracePeriodDays ?? 3),
        lateFeeAmount: String(struct.lateFeeAmount ?? 0),
        description: struct.description || '',
      })
    } else {
      setEditingStructure(null)
      setStructForm({ name: '', type: 'monthly', amount: '', batchId: '', isRecurring: false, recurrence: 'monthly', dueDay: '5', gracePeriodDays: '3', lateFeeAmount: '0', description: '' })
    }
    setShowStructureDialog(true)
  }

  const handleSaveStructure = async () => {
    if (!structForm.name || !structForm.amount) {
      toast({ title: 'Validation error', description: 'Name and amount are required', variant: 'destructive' })
      return
    }
    setStructSubmitting(true)
    try {
      const payload = {
        ...structForm,
        amount: parseFloat(structForm.amount),
        dueDay: parseInt(structForm.dueDay) || 5,
        gracePeriodDays: parseInt(structForm.gracePeriodDays) || 0,
        lateFeeAmount: parseFloat(structForm.lateFeeAmount) || 0,
        instituteId,
      }
      const url = editingStructure
        ? `/api/fees/structures/${editingStructure.id}`
        : '/api/fees/structures'
      const method = editingStructure ? 'PUT' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (res.ok) {
        toast({ title: editingStructure ? 'Structure updated' : 'Structure created', description: structForm.name })
        setShowStructureDialog(false)
        fetchStructures()
      } else {
        const err = await res.json().catch(() => ({}))
        toast({ title: 'Failed', description: err.error || 'Could not save structure', variant: 'destructive' })
      }
    } catch {
      toast({ title: 'Error', description: 'Network error', variant: 'destructive' })
    } finally {
      setStructSubmitting(false)
    }
  }

  const handleDeleteStructure = async () => {
    if (!deleteStructure) return
    setDeleteSubmitting(true)
    try {
      const res = await fetch(`/api/fees/structures/${deleteStructure.id}`, { method: 'DELETE' })
      if (res.ok) {
        toast({ title: 'Structure deleted', description: deleteStructure.name })
        setDeleteStructure(null)
        fetchStructures()
      } else {
        const err = await res.json().catch(() => ({}))
        toast({ title: 'Delete failed', description: err.error || 'Could not delete structure', variant: 'destructive' })
      }
    } catch {
      toast({ title: 'Error', description: 'Network error', variant: 'destructive' })
    } finally {
      setDeleteSubmitting(false)
    }
  }

  // ─── Generate Dues ─────────────────────────────────────────────

  const openGenerateDialog = (struct: FeeStructure) => {
    setGenerateStructure(struct)
    const now = new Date()
    setGenMonth(String(now.getMonth() + 1))
    setGenYear(String(now.getFullYear()))
  }

  const handleGenerateDues = async () => {
    if (!generateStructure || !genMonth || !genYear) return
    setGenSubmitting(true)
    try {
      const res = await fetch(`/api/fees/structures/${generateStructure.id}/generate-dues`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ month: parseInt(genMonth), year: parseInt(genYear), instituteId }),
      })
      if (res.ok) {
        const data = await res.json().catch(() => ({ count: 0 }))
        toast({ title: 'Dues generated', description: `${data.createdCount || 0} fee dues created for ${MONTHS[parseInt(genMonth) - 1]} ${genYear}` })
        setGenerateStructure(null)
        fetchDues()
        fetchStructures()
      } else {
        const err = await res.json().catch(() => ({}))
        toast({ title: 'Generation failed', description: err.error || 'Could not generate dues', variant: 'destructive' })
      }
    } catch {
      toast({ title: 'Error', description: 'Network error', variant: 'destructive' })
    } finally {
      setGenSubmitting(false)
    }
  }

  // ─── Render ────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Fees & Payments</h1>
          <p className="text-sm text-muted-foreground">Manage fee structures and track payments</p>
        </div>
        <Button className="gap-2 bg-emerald-600 hover:bg-emerald-700" onClick={openRecordDialog}>
          <Banknote className="h-4 w-4" /> Record Payment
        </Button>
      </div>

      <Tabs defaultValue="dues">
        <TabsList>
          <TabsTrigger value="dues" className="gap-1.5">
            <Receipt className="h-3.5 w-3.5" />
            Fee Dues {duesPagination.total > 0 && `(${duesPagination.total})`}
          </TabsTrigger>
          <TabsTrigger value="structures" className="gap-1.5">
            <FileText className="h-3.5 w-3.5" />
            Fee Structures ({structures.length})
          </TabsTrigger>
        </TabsList>

        {/* ═══════════════════════════════════════════════════════════ */}
        {/* FEE DUES TAB                                            */}
        {/* ═══════════════════════════════════════════════════════════ */}
        <TabsContent value="dues" className="mt-6 space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <div className="p-1.5 rounded-md bg-amber-100 dark:bg-amber-900/30"><Clock className="h-4 w-4 text-amber-600 dark:text-amber-400" /></div>
                <p className="text-sm text-muted-foreground">Unpaid</p>
              </div>
              <p className="text-2xl font-bold mt-1">{duesSummary.totalUnpaid}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{formatLKR(duesSummary.totalUnpaidAmount)}</p>
            </Card>
            <Card className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <div className="p-1.5 rounded-md bg-red-100 dark:bg-red-900/30"><AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400" /></div>
                <p className="text-sm text-muted-foreground">Overdue</p>
              </div>
              <p className="text-2xl font-bold text-red-600 dark:text-red-400 mt-1">{duesSummary.totalOverdue}</p>
              <p className="text-xs text-red-500 dark:text-red-400 mt-0.5">{formatLKR(duesSummary.totalOverdueAmount)}</p>
            </Card>
            <Card className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <div className="p-1.5 rounded-md bg-sky-100 dark:bg-sky-900/30"><DollarSign className="h-4 w-4 text-sky-600 dark:text-sky-400" /></div>
                <p className="text-sm text-muted-foreground">Partial</p>
              </div>
              <p className="text-2xl font-bold text-amber-600 mt-1">{duesSummary.totalPartial}</p>
            </Card>
            <Card className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <div className="p-1.5 rounded-md bg-emerald-100 dark:bg-emerald-900/30"><FileText className="h-4 w-4 text-emerald-600 dark:text-emerald-400" /></div>
                <p className="text-sm text-muted-foreground">Total Dues</p>
              </div>
              <p className="text-2xl font-bold mt-1">{duesPagination.total}</p>
            </Card>
          </div>

          {/* Search + Filters */}
          <div className="space-y-3">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by student name or number..."
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  onKeyDown={handleSearchKeyDown}
                  className="pl-9"
                />
              </div>
              <Button variant="outline" onClick={handleSearch} className="gap-1.5">
                <Search className="h-4 w-4" /> Search
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowFilters(!showFilters)}
                className="relative gap-1.5"
              >
                <Filter className="h-4 w-4" /> Filters
                {hasActiveFilters && showFilters === false && (
                  <span className="absolute -top-1.5 -right-1.5 h-4 w-4 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">!</span>
                )}
              </Button>
              {hasActiveFilters && (
                <Button variant="ghost" onClick={clearAllFilters} className="gap-1.5 text-muted-foreground">
                  <X className="h-4 w-4" /> Clear
                </Button>
              )}
            </div>

            {/* Status Quick Filter Buttons */}
            <div className="flex flex-wrap gap-2">
              {STATUS_FILTERS.map((s) => (
                <Button
                  key={s}
                  variant={statusFilter === s ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setStatusFilter(s)}
                  className={statusFilter === s ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : ''}
                >
                  {s === 'all' ? 'All' : s.charAt(0).toUpperCase() + s.slice(1)}
                </Button>
              ))}
            </div>

            {/* Extended Filters Panel */}
            {showFilters && (
              <Card className="p-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Batch</Label>
                    <Select value={filterBatch} onValueChange={setFilterBatch}>
                      <SelectTrigger><SelectValue placeholder="All batches" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">All batches</SelectItem>
                        {batches.map((b) => (
                          <SelectItem key={b.id} value={b.id}>{b.name}{b.subject ? ` - ${b.subject.name}` : ''}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Month</Label>
                    <Select value={filterMonth} onValueChange={setFilterMonth}>
                      <SelectTrigger><SelectValue placeholder="All months" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">All months</SelectItem>
                        {MONTHS.map((m, i) => (
                          <SelectItem key={i} value={String(i + 1)}>{m}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Year</Label>
                    <Select value={filterYear} onValueChange={setFilterYear}>
                      <SelectTrigger><SelectValue placeholder="All years" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">All years</SelectItem>
                        {['2024', '2025', '2026', '2027'].map((y) => (
                          <SelectItem key={y} value={y}>{y}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </Card>
            )}
          </div>

          {/* Dues Table */}
          <Card>
            <CardContent className="p-0">
              <div className="max-h-[520px] overflow-y-auto">
                {duesLoading ? (
                  <div className="p-4 space-y-3">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <div key={i} className="flex items-center gap-4">
                        <Skeleton className="h-10 flex-1" />
                        <Skeleton className="h-10 w-24" />
                        <Skeleton className="h-10 w-20" />
                        <Skeleton className="h-10 w-20" />
                        <Skeleton className="h-10 w-24" />
                      </div>
                    ))}
                  </div>
                ) : dues.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
                    <Inbox className="h-12 w-12 text-muted-foreground/40 mb-3" />
                    <p className="text-muted-foreground font-medium">No fee dues found</p>
                    <p className="text-sm text-muted-foreground/70 mt-1">
                      {hasActiveFilters
                        ? 'Try adjusting your search or filters.'
                        : 'Create a fee structure to start generating dues.'}
                    </p>
                    {hasActiveFilters ? (
                      <Button variant="outline" size="sm" onClick={clearAllFilters} className="mt-4 gap-1.5">
                        <X className="h-3.5 w-3.5" /> Clear Filters
                      </Button>
                    ) : (
                      <Button variant="outline" size="sm" onClick={() => openStructureDialog()} className="mt-4 gap-1.5">
                        <Plus className="h-3.5 w-3.5" /> Create Fee Structure
                      </Button>
                    )}
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Student</TableHead>
                        <TableHead className="hidden md:table-cell">Description</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead className="hidden sm:table-cell">Due Date</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {dues.map((due) => {
                        const status = due.displayStatus || due.status
                        const isRowLoading = actionLoading[due.id]
                        return (
                          <TableRow key={due.id}>
                            <TableCell>
                              <p className="font-medium text-sm">{due.student.fullName}</p>
                              <p className="text-xs text-muted-foreground">{due.student.studentNumber}</p>
                            </TableCell>
                            <TableCell className="hidden md:table-cell">
                              <p className="text-sm">{due.description}</p>
                              {due.feeStructure && (
                                <p className="text-xs text-muted-foreground">{due.feeStructure.name}</p>
                              )}
                            </TableCell>
                            <TableCell>
                              <p className="text-sm font-medium">{formatLKR(due.amount)}</p>
                              {(due.amountPaid > 0 || due.waivedAmount > 0) && (
                                <p className="text-xs text-muted-foreground">
                                  Paid: {formatLKR(due.amountPaid)}
                                  {due.waivedAmount > 0 && ` | Waived: ${formatLKR(due.waivedAmount)}`}
                                </p>
                              )}
                            </TableCell>
                            <TableCell className="hidden sm:table-cell text-sm">
                              {formatDate(due.dueDate)}
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant="outline"
                                className={`text-xs ${STATUS_BADGE_CLASSES[status] || STATUS_BADGE_CLASSES.unpaid}`}
                              >
                                {status}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                {isPayable(due) && (
                                  <Button
                                    size="sm"
                                    className="bg-emerald-600 hover:bg-emerald-700 text-white h-8 px-3 text-xs"
                                    onClick={() => openQuickPay(due)}
                                    disabled={isRowLoading}
                                  >
                                    {isRowLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Banknote className="h-3.5 w-3.5" />}
                                    <span className="hidden sm:inline ml-1">Pay</span>
                                  </Button>
                                )}
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0" disabled={isRowLoading}>
                                      <MoreHorizontal className="h-4 w-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    {(status === 'unpaid' || status === 'overdue' || status === 'partial') && (
                                      <DropdownMenuItem onClick={() => openQuickPay(due)}>
                                        <Banknote className="h-4 w-4 mr-2" /> Quick Pay
                                      </DropdownMenuItem>
                                    )}
                                    {(status === 'unpaid' || status === 'overdue' || status === 'partial') && (
                                      <DropdownMenuItem onClick={() => openWaive(due)}>
                                        <Ban className="h-4 w-4 mr-2" /> Waive
                                      </DropdownMenuItem>
                                    )}
                                    {(status === 'unpaid' || status === 'overdue' || status === 'partial') && (
                                      <DropdownMenuItem onClick={() => handleMarkPaid(due)}>
                                        <CheckCircle2 className="h-4 w-4 mr-2" /> Mark Paid
                                      </DropdownMenuItem>
                                    )}
                                    {status === 'paid' && (
                                      <DropdownMenuItem onClick={() => handleReopen(due)}>
                                        <RotateCcw className="h-4 w-4 mr-2" /> Reopen
                                      </DropdownMenuItem>
                                    )}
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </div>
                            </TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                )}
              </div>

              {/* Pagination */}
              {!duesLoading && duesPagination.totalPages > 1 && (
                <>
                  <Separator />
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4">
                    <p className="text-sm text-muted-foreground">
                      Showing {paginationStart}–{paginationEnd} of {duesPagination.total}
                    </p>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 w-8 p-0"
                        disabled={duesPagination.page <= 1}
                        onClick={() => goToPage(duesPagination.page - 1)}
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      {getPageNumbers().map((p, i) =>
                        p === '...' ? (
                          <span key={`ellipsis-${i}`} className="px-1 text-muted-foreground">...</span>
                        ) : (
                          <Button
                            key={p}
                            variant={duesPagination.page === p ? 'default' : 'outline'}
                            size="sm"
                            className={`h-8 w-8 p-0 ${duesPagination.page === p ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : ''}`}
                            onClick={() => goToPage(p)}
                          >
                            {p}
                          </Button>
                        )
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 w-8 p-0"
                        disabled={duesPagination.page >= duesPagination.totalPages}
                        onClick={() => goToPage(duesPagination.page + 1)}
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ═══════════════════════════════════════════════════════════ */}
        {/* FEE STRUCTURES TAB                                     */}
        {/* ═══════════════════════════════════════════════════════════ */}
        <TabsContent value="structures" className="mt-6 space-y-6">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">{structures.length} fee structure{structures.length !== 1 ? 's' : ''}</p>
            <Button size="sm" className="gap-1.5 bg-emerald-600 hover:bg-emerald-700" onClick={() => openStructureDialog()}>
              <Plus className="h-4 w-4" /> Add Structure
            </Button>
          </div>

          {structuresLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <Card key={i} className="p-4"><Skeleton className="h-32" /></Card>
              ))}
            </div>
          ) : structures.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
              <Inbox className="h-12 w-12 text-muted-foreground/40 mb-3" />
              <p className="text-muted-foreground font-medium">No fee structures yet</p>
              <p className="text-sm text-muted-foreground/70 mt-1">Create your first fee structure to start managing dues.</p>
              <Button size="sm" className="mt-4 gap-1.5 bg-emerald-600 hover:bg-emerald-700" onClick={() => openStructureDialog()}>
                <Plus className="h-4 w-4" /> Create Fee Structure
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {structures.map((s) => (
                <Card key={s.id} className="p-4 flex flex-col">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-sm truncate">{s.name}</h3>
                      <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                        <Badge variant="outline" className="text-xs">{s.type.replace('_', ' ')}</Badge>
                        {s.isRecurring && (
                          <Badge variant="outline" className="text-xs bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800">
                            <RefreshCw className="h-3 w-3 mr-0.5" /> {s.recurrence || 'recurring'}
                          </Badge>
                        )}
                        <Badge variant="outline" className={`text-xs ${s.isActive ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800' : 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400 border-gray-200 dark:border-gray-700'}`}>
                          {s.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                      </div>
                    </div>
                  </div>
                  {s.batch && (
                    <p className="text-xs text-muted-foreground mt-2">
                      {s.batch.name}{s.batch.subject ? ` · ${s.batch.subject.name}` : ''}
                    </p>
                  )}
                  <p className="text-xl font-bold mt-3">{formatLKR(s.amount)}</p>
                  {s._count && <p className="text-xs text-muted-foreground mt-1">{s._count.feeDues} dues generated</p>}
                  <Separator className="my-3" />
                  <div className="flex items-center gap-2 mt-auto">
                    {s.isRecurring && s.isActive && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1 gap-1 text-xs border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20"
                        onClick={() => openGenerateDialog(s)}
                      >
                        <Zap className="h-3.5 w-3.5" /> Generate Dues
                      </Button>
                    )}
                    <Button size="sm" variant="outline" className="gap-1 text-xs" onClick={() => openStructureDialog(s)}>
                      <Pencil className="h-3.5 w-3.5" /> Edit
                    </Button>
                    <Button size="sm" variant="outline" className="gap-1 text-xs text-red-600 dark:text-red-400 border-red-200 dark:border-red-800 hover:bg-red-50 dark:hover:bg-red-900/20" onClick={() => setDeleteStructure(s)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* DIALOGS                                                  */}
      {/* ═══════════════════════════════════════════════════════════ */}

      {/* Quick Pay Dialog */}
      <Dialog open={!!quickPayDue} onOpenChange={(open) => !open && setQuickPayDue(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="gap-2 flex items-center"><Banknote className="h-5 w-5" /> Quick Pay</DialogTitle>
            <DialogDescription>Record a payment for this fee due</DialogDescription>
          </DialogHeader>
          {quickPayDue && (
            <div className="space-y-4">
              <div className="rounded-lg bg-muted/50 p-3 space-y-1">
                <p className="text-sm font-medium">{quickPayDue.student.fullName}</p>
                <p className="text-xs text-muted-foreground">{quickPayDue.description}</p>
                <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-400 mt-1">
                  Remaining: {formatLKR(quickPayDue.amount - quickPayDue.amountPaid - quickPayDue.waivedAmount)}
                </p>
              </div>
              <div className="space-y-2">
                <Label>Amount</Label>
                <Input
                  type="number"
                  value={quickPayAmount}
                  onChange={(e) => setQuickPayAmount(e.target.value)}
                  min="1"
                  max={String(quickPayDue.amount - quickPayDue.amountPaid - quickPayDue.waivedAmount)}
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
                <Label>Notes</Label>
                <Input placeholder="Optional notes..." value={quickPayNotes} onChange={(e) => setQuickPayNotes(e.target.value)} />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setQuickPayDue(null)}>Cancel</Button>
            <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={handleQuickPay} disabled={quickPaySubmitting}>
              {quickPaySubmitting && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />}
              Record Payment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Waive Dialog */}
      <Dialog open={!!waiveDue} onOpenChange={(open) => !open && setWaiveDue(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="gap-2 flex items-center"><Ban className="h-5 w-5" /> Waive Fee</DialogTitle>
            <DialogDescription>Waive part or all of this fee due</DialogDescription>
          </DialogHeader>
          {waiveDue && (
            <div className="space-y-4">
              <div className="rounded-lg bg-muted/50 p-3 space-y-1">
                <p className="text-sm font-medium">{waiveDue.student.fullName} — {waiveDue.description}</p>
                <p className="text-sm">Total: {formatLKR(waiveDue.amount)} | Paid: {formatLKR(waiveDue.amountPaid)}</p>
                <p className="text-sm font-semibold">Remaining: {formatLKR(waiveDue.amount - waiveDue.amountPaid - waiveDue.waivedAmount)}</p>
              </div>
              <div className="space-y-2">
                <Label>Waive Amount</Label>
                <Input
                  type="number"
                  value={waiveAmount}
                  onChange={(e) => setWaiveAmount(e.target.value)}
                  min="1"
                  max={String(waiveDue.amount - waiveDue.amountPaid - waiveDue.waivedAmount)}
                />
              </div>
              <div className="space-y-2">
                <Label>Reason</Label>
                <Input placeholder="Reason for waiver..." value={waiveReason} onChange={(e) => setWaiveReason(e.target.value)} />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setWaiveDue(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleWaive} disabled={waiveSubmitting}>
              {waiveSubmitting && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />}
              Waive Fee
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Record Payment Dialog (standalone) */}
      <Dialog open={showRecordDialog} onOpenChange={setShowRecordDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="gap-2 flex items-center"><Banknote className="h-5 w-5" /> Record Payment</DialogTitle>
            <DialogDescription>Manually record a payment from a student</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Student *</Label>
              <Select value={recordForm.studentId} onValueChange={(v) => setRecordForm({ ...recordForm, studentId: v })}>
                <SelectTrigger><SelectValue placeholder="Select student..." /></SelectTrigger>
                <SelectContent>
                  {students.map((s) => (
                    <SelectItem key={s.id} value={s.id}>{s.fullName} ({s.studentNumber})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Amount (Rs.) *</Label>
                <Input
                  type="number"
                  placeholder="5000"
                  value={recordForm.amount}
                  onChange={(e) => setRecordForm({ ...recordForm, amount: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Method</Label>
                <Select value={recordForm.method} onValueChange={(v) => setRecordForm({ ...recordForm, method: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
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
              <Input placeholder="Optional notes..." value={recordForm.notes} onChange={(e) => setRecordForm({ ...recordForm, notes: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRecordDialog(false)}>Cancel</Button>
            <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={handleRecordPayment} disabled={recordSubmitting || !recordForm.studentId}>
              {recordSubmitting && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />}
              Record Payment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add / Edit Structure Dialog */}
      <Dialog open={showStructureDialog} onOpenChange={setShowStructureDialog}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingStructure ? 'Edit Fee Structure' : 'Add Fee Structure'}</DialogTitle>
            <DialogDescription>
              {editingStructure ? 'Update fee structure details' : 'Create a new fee structure for your institute'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2 sm:col-span-2">
                <Label>Name *</Label>
                <Input placeholder="e.g., Monthly Physics Fee" value={structForm.name} onChange={(e) => setStructForm({ ...structForm, name: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Type</Label>
                <Select value={structForm.type} onValueChange={(v) => setStructForm({ ...structForm, type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="one_time">One Time</SelectItem>
                    <SelectItem value="custom">Custom</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Amount (Rs.) *</Label>
                <Input type="number" placeholder="5000" value={structForm.amount} onChange={(e) => setStructForm({ ...structForm, amount: e.target.value })} />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label>Batch</Label>
                <Select value={structForm.batchId} onValueChange={(v) => setStructForm({ ...structForm, batchId: v })}>
                  <SelectTrigger><SelectValue placeholder="General (no specific batch)" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">General</SelectItem>
                    {batches.map((b) => (
                      <SelectItem key={b.id} value={b.id}>{b.name}{b.subject ? ` - ${b.subject.name}` : ''}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div>
                <Label>Recurring</Label>
                <p className="text-xs text-muted-foreground">Auto-generate dues each period</p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={structForm.isRecurring}
                onClick={() => setStructForm({ ...structForm, isRecurring: !structForm.isRecurring })}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${structForm.isRecurring ? 'bg-emerald-600' : 'bg-input'}`}
              >
                <span className={`pointer-events-none block h-5 w-5 rounded-full bg-background shadow-lg ring-0 transition-transform ${structForm.isRecurring ? 'translate-x-5' : 'translate-x-0'}`} />
              </button>
            </div>
            {structForm.isRecurring && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Recurrence</Label>
                  <Select value={structForm.recurrence} onValueChange={(v) => setStructForm({ ...structForm, recurrence: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="monthly">Monthly</SelectItem>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="quarterly">Quarterly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Due Day</Label>
                  <Input type="number" min="1" max="31" value={structForm.dueDay} onChange={(e) => setStructForm({ ...structForm, dueDay: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Grace Period (days)</Label>
                  <Input type="number" min="0" value={structForm.gracePeriodDays} onChange={(e) => setStructForm({ ...structForm, gracePeriodDays: e.target.value })} />
                </div>
                <div className="space-y-2 sm:col-span-3">
                  <Label>Late Fee Amount (Rs.)</Label>
                  <Input type="number" min="0" value={structForm.lateFeeAmount} onChange={(e) => setStructForm({ ...structForm, lateFeeAmount: e.target.value })} />
                </div>
              </div>
            )}
            <div className="space-y-2">
              <Label>Description</Label>
              <Input placeholder="Optional description..." value={structForm.description} onChange={(e) => setStructForm({ ...structForm, description: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowStructureDialog(false)}>Cancel</Button>
            <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={handleSaveStructure} disabled={structSubmitting}>
              {structSubmitting && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />}
              {editingStructure ? 'Update Structure' : 'Create Structure'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Generate Dues Dialog */}
      <Dialog open={!!generateStructure} onOpenChange={(open) => !open && setGenerateStructure(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="gap-2 flex items-center"><Zap className="h-5 w-5" /> Generate Dues</DialogTitle>
            <DialogDescription>Generate fee dues for {generateStructure?.name}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Month</Label>
              <Select value={genMonth} onValueChange={setGenMonth}>
                <SelectTrigger><SelectValue placeholder="Select month" /></SelectTrigger>
                <SelectContent>
                  {MONTHS.map((m, i) => (
                    <SelectItem key={i} value={String(i + 1)}>{m}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Year</Label>
              <Select value={genYear} onValueChange={setGenYear}>
                <SelectTrigger><SelectValue placeholder="Select year" /></SelectTrigger>
                <SelectContent>
                  {['2024', '2025', '2026', '2027'].map((y) => (
                    <SelectItem key={y} value={y}>{y}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setGenerateStructure(null)}>Cancel</Button>
            <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={handleGenerateDues} disabled={genSubmitting}>
              {genSubmitting && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />}
              Generate
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Structure Confirmation */}
      <AlertDialog open={!!deleteStructure} onOpenChange={(open) => !open && setDeleteStructure(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Fee Structure</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{deleteStructure?.name}&quot;? This action cannot be undone.
              {deleteStructure?._count && deleteStructure._count.feeDues > 0 && (
                <span className="block mt-2 text-amber-600 font-medium">
                  ⚠ This structure has {deleteStructure._count.feeDues} associated dues.
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteSubmitting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => { e.preventDefault(); handleDeleteStructure() }}
              disabled={deleteSubmitting}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {deleteSubmitting && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

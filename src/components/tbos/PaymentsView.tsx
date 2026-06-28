'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAppStore } from '@/lib/store'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { FileText, Loader2, Banknote, Search, CalendarDays, ChevronLeft, ChevronRight, Filter, X } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

const ITEMS_PER_PAGE = 15

function formatLKR(amount: number): string {
  return `Rs. ${amount.toLocaleString('en-LK')}`
}

function formatDate(dateStr: string): string {
  try {
    const d = new Date(dateStr)
    return d.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }) + ' ' + d.toLocaleTimeString('en-GB', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    })
  } catch {
    return dateStr
  }
}

function formatShortDate(dateStr: string): string {
  try {
    const d = new Date(dateStr)
    return d.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    })
  } catch {
    return dateStr
  }
}

interface Allocation {
  id: string
  amount: number
  feeDue: {
    description: string
    periodMonth: number
    periodYear: number
  } | null
}

interface Payment {
  id: string
  receipt: { paymentId: string; receiptNumber: string } | null
  student: { fullName: string; studentNumber: string }
  amount: number
  paymentMethod: string
  recordedAt: string
  recordedBy: string
  recordedByName?: string
  status: string
  allocations: Allocation[]
}

interface ReceiptData {
  receiptNumber: string
  studentName: string
  amount: number
  date: string
  method: string
  status: string
  allocations?: { description: string; amount: number }[]
}

const methodLabels: Record<string, string> = {
  cash: 'Cash',
  bank_transfer: 'Bank Transfer',
  online: 'Online',
  cheque: 'Cheque',
}

const statusColors: Record<string, string> = {
  completed: 'bg-emerald-100 text-emerald-700',
  pending: 'bg-amber-100 text-amber-700',
  failed: 'bg-red-100 text-red-700',
  refunded: 'bg-gray-100 text-gray-600',
}

export default function PaymentsView() {
  const { currentInstitute, currentUser } = useAppStore()
  const { toast } = useToast()

  const [payments, setPayments] = useState<Payment[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  const [summaryTotalPayments, setSummaryTotalPayments] = useState(0)
  const [summaryTotalAmount, setSummaryTotalAmount] = useState(0)

  const [search, setSearch] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [showFilters, setShowFilters] = useState(false)
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [methodFilter, setMethodFilter] = useState('')

  const [receiptDialogOpen, setReceiptDialogOpen] = useState(false)
  const [receiptData, setReceiptData] = useState<ReceiptData | null>(null)
  const [receiptLoading, setReceiptLoading] = useState<string | null>(null)

  const hasActiveFilters = !!(dateFrom || dateTo || methodFilter)

  const fetchPayments = useCallback(async () => {
    if (!currentInstitute?.id) return
    setLoading(true)

    const params = new URLSearchParams()
    params.set('instituteId', currentInstitute.id)
    params.set('page', String(page))
    params.set('limit', String(ITEMS_PER_PAGE))
    if (search) params.set('search', search)
    if (dateFrom) params.set('dateFrom', dateFrom)
    if (dateTo) params.set('dateTo', dateTo)
    if (methodFilter) params.set('method', methodFilter)

    try {
      const res = await fetch(`/api/payments?${params.toString()}`)
      if (res.ok) {
        const data = await res.json()
        setPayments(data.payments || [])
        setTotalCount(data.pagination?.total || 0)
        setTotalPages(data.pagination?.totalPages || 0)
        setSummaryTotalPayments(data.summary?.totalPayments || 0)
        setSummaryTotalAmount(data.summary?.totalAmount || 0)
      } else {
        toast({ title: 'Error', description: 'Failed to load payments', variant: 'destructive' })
      }
    } catch {
      toast({ title: 'Error', description: 'Network error', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }, [currentInstitute?.id, page, search, dateFrom, dateTo, methodFilter, toast])

  useEffect(() => {
    fetchPayments()
  }, [fetchPayments])

  const applySearch = () => {
    setSearch(searchInput)
    setPage(1)
  }

  const clearSearch = () => {
    setSearchInput('')
    setSearch('')
    setPage(1)
  }

  const clearFilters = () => {
    setDateFrom('')
    setDateTo('')
    setMethodFilter('')
    setPage(1)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') applySearch()
  }

  // Client-side computed stats from current page data
  const now = new Date()
  const todayStr = now.toISOString().split('T')[0]
  const currentMonth = now.getMonth()
  const currentYear = now.getFullYear()

  const todayPayments = payments.filter((p) => {
    try {
      return p.recordedAt.startsWith(todayStr)
    } catch {
      return false
    }
  })
  const todaySum = todayPayments.reduce((sum, p) => sum + p.amount, 0)

  const monthPayments = payments.filter((p) => {
    try {
      const d = new Date(p.recordedAt)
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear
    } catch {
      return false
    }
  })
  const monthSum = monthPayments.reduce((sum, p) => sum + p.amount, 0)

  // Pagination
  const startItem = totalCount === 0 ? 0 : (page - 1) * ITEMS_PER_PAGE + 1
  const endItem = Math.min(page * ITEMS_PER_PAGE, totalCount)

  const getPageNumbers = () => {
    const pages: number[] = []
    let start = Math.max(1, page - 2)
    let end = Math.min(totalPages, start + 4)
    if (end - start < 4) start = Math.max(1, end - 4)
    for (let i = start; i <= end; i++) pages.push(i)
    return pages
  }

  // Receipt handling
  const handleViewReceipt = async (payment: Payment) => {
    if (!currentInstitute?.id) return
    setReceiptLoading(payment.id)
    setReceiptDialogOpen(true)
    setReceiptData(null)

    try {
      // Check for existing receipt
      const getRes = await fetch(
        `/api/receipt?paymentId=${payment.id}&instituteId=${currentInstitute.id}`
      )
      if (getRes.ok) {
        const data = await getRes.json()
        if (data.receipt) {
          setReceiptData({
            receiptNumber: data.receipt.receiptNumber,
            studentName: data.receipt.student?.fullName || payment.student.fullName,
            amount: data.receipt.payment?.amount || payment.amount,
            date: data.receipt.payment?.recordedAt || payment.recordedAt,
            method: data.receipt.payment?.paymentMethod || payment.paymentMethod,
            status: data.receipt.payment?.status || payment.status,
            allocations: data.receipt.allocations?.map((a: { feeDue?: { description: string } | null; amount: number }) => ({
              description: a.feeDue?.description || 'Payment allocation',
              amount: a.amount,
            })),
          })
          setReceiptLoading(null)
          return
        }
      }

      // Create receipt
      const postRes = await fetch('/api/receipt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paymentId: payment.id,
          instituteId: currentInstitute.id,
        }),
      })
      if (postRes.ok) {
        const created = await postRes.json()
        setReceiptData({
          receiptNumber: created.receipt?.receiptNumber || payment.receipt?.receiptNumber || 'N/A',
          studentName: payment.student.fullName,
          amount: payment.amount,
          date: payment.recordedAt,
          method: payment.paymentMethod,
          status: payment.status,
          allocations: payment.allocations?.map((a) => ({
            description: a.feeDue?.description || 'Payment allocation',
            amount: a.amount,
          })),
        })
      } else {
        toast({ title: 'Error', description: 'Failed to generate receipt', variant: 'destructive' })
        setReceiptDialogOpen(false)
      }
    } catch {
      toast({ title: 'Error', description: 'Network error fetching receipt', variant: 'destructive' })
      setReceiptDialogOpen(false)
    } finally {
      setReceiptLoading(null)
    }
  }

  // No institute state
  if (!currentInstitute?.id) {
    return (
      <div className="space-y-4">
        <div>
          <h1 className="text-2xl font-bold">Payments</h1>
          <p className="text-sm text-muted-foreground">Track all payment transactions</p>
        </div>
        <Card className="p-8 text-center">
          <Banknote className="h-12 w-12 mx-auto text-muted-foreground/40" />
          <p className="mt-4 text-muted-foreground">No institute selected</p>
          <p className="text-sm text-muted-foreground/70 mt-1">Please select an institute to view payments</p>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Payments</h1>
        <p className="text-sm text-muted-foreground">Track all payment transactions</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Total Collected</p>
          <p className="text-2xl font-bold mt-1">{formatLKR(summaryTotalAmount)}</p>
          <p className="text-xs text-muted-foreground">{summaryTotalPayments} transactions</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Today</p>
          <p className="text-2xl font-bold mt-1">{formatLKR(todaySum)}</p>
          <p className="text-xs text-muted-foreground">{todayPayments.length} payments</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">This Month</p>
          <p className="text-2xl font-bold mt-1">{formatLKR(monthSum)}</p>
          <p className="text-xs text-muted-foreground">{monthPayments.length} payments</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Showing</p>
          <p className="text-2xl font-bold mt-1">{payments.length}</p>
          <p className="text-xs text-muted-foreground">of {totalCount} total</p>
        </Card>
      </div>

      {/* Search + Filters */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by student name, student number, or receipt number..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={handleKeyDown}
            className="pl-9 pr-9"
          />
          {search && (
            <button
              onClick={clearSearch}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        <Button
          variant="outline"
          size="default"
          onClick={applySearch}
          className="shrink-0"
        >
          <Search className="h-4 w-4 mr-2" />
          Search
        </Button>
        <Button
          variant={showFilters ? 'default' : 'outline'}
          size="default"
          onClick={() => setShowFilters(!showFilters)}
          className="shrink-0 gap-2 relative"
        >
          <Filter className="h-4 w-4" />
          Filters
          {hasActiveFilters && (
            <span className="absolute -top-1.5 -right-1.5 h-4 w-4 rounded-full bg-destructive text-destructive-foreground text-[10px] flex items-center justify-center font-bold">
              !
            </span>
          )}
        </Button>
        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="default"
            onClick={clearFilters}
            className="shrink-0 gap-2 text-destructive hover:text-destructive"
          >
            <X className="h-4 w-4" />
            Clear
          </Button>
        )}
      </div>

      {/* Extended Filters Panel */}
      {showFilters && (
        <Card className="p-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium flex items-center gap-1.5">
                <CalendarDays className="h-3.5 w-3.5 text-muted-foreground" />
                From Date
              </label>
              <Input
                type="date"
                value={dateFrom}
                onChange={(e) => { setDateFrom(e.target.value); setPage(1) }}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium flex items-center gap-1.5">
                <CalendarDays className="h-3.5 w-3.5 text-muted-foreground" />
                To Date
              </label>
              <Input
                type="date"
                value={dateTo}
                onChange={(e) => { setDateTo(e.target.value); setPage(1) }}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Payment Method</label>
              <Select
                value={methodFilter}
                onValueChange={(v) => { setMethodFilter(v === '__all__' ? '' : v); setPage(1) }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All Methods" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">All Methods</SelectItem>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                  <SelectItem value="online">Online</SelectItem>
                  <SelectItem value="cheque">Cheque</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </Card>
      )}

      {/* Payments Table */}
      <Card>
        <CardContent className="p-0">
          <div className="max-h-[520px] overflow-y-auto">
            {loading ? (
              <div className="p-4">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Receipt #</TableHead>
                      <TableHead>Student</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead className="hidden sm:table-cell">Method</TableHead>
                      <TableHead className="hidden md:table-cell">Date & Time</TableHead>
                      <TableHead className="hidden lg:table-cell">Allocations</TableHead>
                      <TableHead className="hidden lg:table-cell">Recorded By</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="w-12"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {Array.from({ length: 5 }).map((_, i) => (
                      <TableRow key={i}>
                        <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-36" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                        <TableCell className="hidden sm:table-cell"><Skeleton className="h-5 w-24" /></TableCell>
                        <TableCell className="hidden md:table-cell"><Skeleton className="h-4 w-32" /></TableCell>
                        <TableCell className="hidden lg:table-cell"><Skeleton className="h-4 w-28" /></TableCell>
                        <TableCell className="hidden lg:table-cell"><Skeleton className="h-4 w-24" /></TableCell>
                        <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                        <TableCell><Skeleton className="h-8 w-8" /></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : payments.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center px-4">
                <Banknote className="h-12 w-12 text-muted-foreground/30" />
                <p className="mt-4 text-muted-foreground font-medium">
                  {search || hasActiveFilters ? 'No matching payments found' : 'No payments recorded yet'}
                </p>
                <p className="text-sm text-muted-foreground/70 mt-1">
                  {search || hasActiveFilters
                    ? 'Try adjusting your search or filters'
                    : 'Payments will appear here once transactions are recorded'}
                </p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Receipt #</TableHead>
                    <TableHead>Student</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead className="hidden sm:table-cell">Method</TableHead>
                    <TableHead className="hidden md:table-cell">Date & Time</TableHead>
                    <TableHead className="hidden lg:table-cell">Allocations</TableHead>
                    <TableHead className="hidden lg:table-cell">Recorded By</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payments.map((payment) => (
                    <TableRow key={payment.id}>
                      <TableCell className="font-mono text-xs">
                        {payment.receipt?.receiptNumber || '—'}
                      </TableCell>
                      <TableCell>
                        <p className="font-medium text-sm">{payment.student.fullName}</p>
                        <p className="text-xs text-muted-foreground">{payment.student.studentNumber}</p>
                      </TableCell>
                      <TableCell className="font-semibold text-sm">{formatLKR(payment.amount)}</TableCell>
                      <TableCell className="hidden sm:table-cell">
                        <Badge variant="secondary" className="text-xs">
                          {methodLabels[payment.paymentMethod] || payment.paymentMethod}
                        </Badge>
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                        {formatDate(payment.recordedAt)}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                        {payment.allocations && payment.allocations.length > 0 ? (
                          <div className="text-xs">
                            {payment.allocations.slice(0, 2).map((a, i) => (
                              <div key={a.id || i} className="truncate max-w-[200px]">
                                {a.feeDue?.description || 'Allocation'} — {formatLKR(a.amount)}
                              </div>
                            ))}
                            {payment.allocations.length > 2 && (
                              <span className="text-muted-foreground">
                                +{payment.allocations.length - 2} more
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">
                        {payment.recordedByName || payment.recordedBy}
                      </TableCell>
                      <TableCell>
                        <Badge className={`text-xs ${statusColors[payment.status] || 'bg-gray-100 text-gray-600'}`}>
                          {payment.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => handleViewReceipt(payment)}
                          disabled={receiptLoading === payment.id}
                        >
                          {receiptLoading === payment.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <FileText className="h-4 w-4" />
                          )}
                          <span className="sr-only">View Receipt</span>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalCount > 0 && !loading && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-sm text-muted-foreground">
            Showing {startItem}–{endItem} of {totalCount}
          </p>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
            >
              <ChevronLeft className="h-4 w-4" />
              <span className="sr-only">Previous page</span>
            </Button>
            {getPageNumbers().map((p) => (
              <Button
                key={p}
                variant={p === page ? 'default' : 'outline'}
                size="icon"
                className="h-8 w-8"
                onClick={() => setPage(p)}
              >
                {p}
                <span className="sr-only">Page {p}</span>
              </Button>
            ))}
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              disabled={page >= totalPages}
              onClick={() => setPage(page + 1)}
            >
              <ChevronRight className="h-4 w-4" />
              <span className="sr-only">Next page</span>
            </Button>
          </div>
        </div>
      )}

      {/* Receipt Dialog */}
      <Dialog open={receiptDialogOpen} onOpenChange={(open) => { if (!open) setReceiptDialogOpen(false) }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {receiptLoading
                ? 'Loading Receipt...'
                : receiptData
                  ? `Receipt ${receiptData.receiptNumber}`
                  : 'Receipt'}
            </DialogTitle>
            <DialogDescription>
              {receiptData ? 'Payment receipt details' : 'Fetching receipt information...'}
            </DialogDescription>
          </DialogHeader>

          {receiptLoading && !receiptData && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          )}

          {receiptData && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Student</p>
                  <p className="font-medium mt-0.5">{receiptData.studentName}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Amount</p>
                  <p className="font-bold mt-0.5">{formatLKR(receiptData.amount)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Date</p>
                  <p className="mt-0.5">{formatShortDate(receiptData.date)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Method</p>
                  <p className="mt-0.5">{methodLabels[receiptData.method] || receiptData.method}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Status</p>
                  <Badge className={`text-xs mt-0.5 ${statusColors[receiptData.status] || 'bg-gray-100 text-gray-600'}`}>
                    {receiptData.status}
                  </Badge>
                </div>
              </div>

              {receiptData.allocations && receiptData.allocations.length > 0 && (
                <>
                  <div className="border-t pt-3" />
                  <div>
                    <p className="text-sm font-medium mb-2">Allocations</p>
                    <div className="space-y-1.5">
                      {receiptData.allocations.map((a, i) => (
                        <div key={i} className="flex justify-between text-sm">
                          <span className="text-muted-foreground">{a.description}</span>
                          <span className="font-medium">{formatLKR(a.amount)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setReceiptDialogOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
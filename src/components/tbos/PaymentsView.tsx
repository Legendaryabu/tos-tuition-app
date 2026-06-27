'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useAppStore } from '@/lib/store'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { FileText, Loader2, Banknote, Search } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import ReceiptPreview, { ReceiptData } from '@/components/tbos/ReceiptPreview'

function formatLKR(amount: number): string {
  return `Rs. ${amount.toLocaleString('en-LK')}`
}

interface Payment {
  id: string
  uuid?: string
  receiptNumber: string
  studentName: string
  amount: number
  method: string
  recordedAt: string
  recordedBy: string
  status: string
  instituteId?: string
  studentId?: string
  receipt?: { paymentId: string; receiptNumber: string } | null
}

const methodLabels: Record<string, string> = {
  cash: 'Cash',
  bank_transfer: 'Bank Transfer',
  online: 'Online',
  cheque: 'Cheque',
}

function statusVariant(status: string) {
  switch (status) {
    case 'completed':
      return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
    case 'pending':
      return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
    case 'failed':
      return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
    case 'refunded':
      return 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
    default:
      return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
  }
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
    })
  } catch {
    return dateStr
  }
}

export default function PaymentsView() {
  const { toast } = useToast()
  const { currentInstitute, currentUser } = useAppStore()
  const [payments, setPayments] = useState<Payment[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  // Receipt preview state
  const [receiptOpen, setReceiptOpen] = useState(false)
  const [receiptData, setReceiptData] = useState<ReceiptData | null>(null)
  const [receiptLoading, setReceiptLoading] = useState<string | null>(null)

  const instituteId = currentInstitute?.id

  useEffect(() => {
    if (!instituteId) {
      setPayments([])
      setLoading(false)
      return
    }

    setLoading(true)
    fetch(`/api/payments?instituteId=${instituteId}`)
      .then(res => {
        if (res.ok) return res.json()
        throw new Error('Failed to fetch')
      })
      .then(d => {
        const enriched: Payment[] = (d.payments || []).map((p: any) => ({
          id: p.id,
          uuid: p.uuid,
          instituteId: p.instituteId,
          studentId: p.studentId,
          receiptNumber: p.receipt?.receiptNumber || '—',
          studentName: p.student?.fullName || 'Unknown',
          amount: p.amount,
          method: p.paymentMethod,
          recordedAt: p.recordedAt,
          recordedBy: p.recordedBy,
          status: p.status,
          receipt: p.receipt || null,
        }))
        setPayments(enriched)
      })
      .catch(() => {
        setPayments([])
        toast({
          title: 'Failed to load payments',
          description: 'Could not fetch payment data. Please try again.',
          variant: 'destructive',
        })
      })
      .finally(() => {
        setLoading(false)
      })
  }, [instituteId, toast])

  const handleViewReceipt = useCallback(async (payment: Payment) => {
    if (!instituteId || !payment.id) {
      toast({ title: 'Error', description: 'Cannot view receipt without institute context.', variant: 'destructive' })
      return
    }

    setReceiptLoading(payment.id)
    setReceiptData(null)

    try {
      // Check if receipt already exists
      const checkRes = await fetch(
        `/api/receipt?paymentId=${payment.id}&instituteId=${instituteId}`
      )
      const checkData = await checkRes.json()

      if (checkData.receipt) {
        setReceiptData(checkData.receipt)
        setReceiptOpen(true)
        setReceiptLoading(null)
        return
      }

      // No receipt exists, generate one
      const genRes = await fetch('/api/receipt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paymentId: payment.id,
          instituteId,
          generatedBy: currentUser?.id || 'system',
        }),
      })
      const genData = await genRes.json()

      if (genData.receipt) {
        setReceiptData(genData.receipt)
        setReceiptOpen(true)
        toast({ title: 'Receipt generated', description: `Receipt ${genData.receipt.receiptNumber} has been created.` })
      } else {
        toast({ title: 'Error', description: genData.error || 'Failed to generate receipt.', variant: 'destructive' })
      }
    } catch {
      toast({ title: 'Error', description: 'Failed to load receipt.', variant: 'destructive' })
    } finally {
      setReceiptLoading(null)
    }
  }, [instituteId, currentUser, toast])

  const filtered = useMemo(() =>
    payments.filter(p =>
      search === '' ||
      p.studentName.toLowerCase().includes(search.toLowerCase()) ||
      p.receiptNumber.toLowerCase().includes(search.toLowerCase())
    ),
    [payments, search]
  )

  const todayStr = useMemo(() => new Date().toISOString().slice(0, 10), [])
  const currentMonthStr = useMemo(() => todayStr.slice(0, 7), [todayStr])

  const totalCollected = useMemo(() => payments.reduce((sum, p) => sum + p.amount, 0), [payments])
  const todayPayments = useMemo(() => payments.filter(p => p.recordedAt.startsWith(todayStr)), [payments, todayStr])
  const todayTotal = useMemo(() => todayPayments.reduce((sum, p) => sum + p.amount, 0), [todayPayments])
  const monthPayments = useMemo(() => payments.filter(p => p.recordedAt.startsWith(currentMonthStr)), [payments, currentMonthStr])
  const monthTotal = useMemo(() => monthPayments.reduce((sum, p) => sum + p.amount, 0), [monthPayments])

  const noInstitute = !instituteId && !loading

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Payments</h1>
        <p className="text-sm text-muted-foreground">Track all payment transactions</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Total Collected</p>
          {loading ? (
            <Skeleton className="h-8 w-28 mt-2" />
          ) : (
            <>
              <p className="text-2xl font-bold mt-1">{formatLKR(totalCollected)}</p>
              <p className="text-xs text-muted-foreground">{payments.length} transactions</p>
            </>
          )}
        </Card>
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Today</p>
          {loading ? (
            <Skeleton className="h-8 w-24 mt-2" />
          ) : (
            <>
              <p className="text-2xl font-bold mt-1">{todayPayments.length > 0 ? formatLKR(todayTotal) : '—'}</p>
              <p className="text-xs text-muted-foreground">{todayPayments.length} payment{todayPayments.length !== 1 ? 's' : ''}</p>
            </>
          )}
        </Card>
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">This Month</p>
          {loading ? (
            <Skeleton className="h-8 w-28 mt-2" />
          ) : (
            <>
              <p className="text-2xl font-bold mt-1">{monthPayments.length > 0 ? formatLKR(monthTotal) : '—'}</p>
              <p className="text-xs text-muted-foreground">{monthPayments.length} payment{monthPayments.length !== 1 ? 's' : ''}</p>
            </>
          )}
        </Card>
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Transactions</p>
          {loading ? (
            <Skeleton className="h-8 w-12 mt-2" />
          ) : (
            <p className="text-2xl font-bold mt-1">{payments.length}</p>
          )}
        </Card>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
        <Input
          placeholder="Search by student name or receipt number..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-6 space-y-3">
              <div className="flex gap-4">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-24 hidden sm:block" />
                <Skeleton className="h-4 w-28 hidden md:block" />
                <Skeleton className="h-4 w-24 hidden md:block" />
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-8" />
              </div>
              {[1, 2, 3, 4, 5].map(i => (
                <div key={i} className="flex gap-4 py-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-4 w-24 hidden sm:block" />
                  <Skeleton className="h-4 w-28 hidden md:block" />
                  <Skeleton className="h-4 w-24 hidden md:block" />
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-4 w-8" />
                </div>
              ))}
            </div>
          ) : noInstitute ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="rounded-full bg-muted p-4 mb-4">
                <Banknote className="size-8 text-muted-foreground" />
              </div>
              <h3 className="font-semibold text-lg">No institute selected</h3>
              <p className="text-sm text-muted-foreground mt-1 max-w-sm">
                Please select an institute to view payments.
              </p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="rounded-full bg-muted p-4 mb-4">
                <Banknote className="size-8 text-muted-foreground" />
              </div>
              <h3 className="font-semibold text-lg">No payments recorded yet</h3>
              <p className="text-sm text-muted-foreground mt-1 max-w-sm">
                {search
                  ? 'No payments match your search. Try a different keyword.'
                  : 'Payments will appear here when you record them from the Fees section.'}
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
                  <TableHead className="hidden md:table-cell">Recorded By</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map(payment => (
                  <TableRow key={payment.id}>
                    <TableCell className="font-mono text-xs">{payment.receiptNumber}</TableCell>
                    <TableCell className="font-medium text-sm">{payment.studentName}</TableCell>
                    <TableCell className="font-medium text-sm">{formatLKR(payment.amount)}</TableCell>
                    <TableCell className="hidden sm:table-cell text-sm">{methodLabels[payment.method] || payment.method}</TableCell>
                    <TableCell className="hidden md:table-cell text-sm text-muted-foreground">{formatDate(payment.recordedAt)}</TableCell>
                    <TableCell className="hidden md:table-cell text-sm text-muted-foreground">{payment.recordedBy}</TableCell>
                    <TableCell>
                      <Badge className={`text-xs capitalize ${statusVariant(payment.status)}`}>
                        {payment.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                        onClick={() => handleViewReceipt(payment)}
                        disabled={receiptLoading === payment.id}
                        aria-label="View Receipt"
                      >
                        {receiptLoading === payment.id ? (
                          <Loader2 className="size-4 animate-spin" />
                        ) : (
                          <FileText className="size-4" />
                        )}
                        <span className="sr-only">View Receipt</span>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Receipt Preview Dialog */}
      <ReceiptPreview
        open={receiptOpen}
        onOpenChange={setReceiptOpen}
        data={receiptData}
      />
    </div>
  )
}
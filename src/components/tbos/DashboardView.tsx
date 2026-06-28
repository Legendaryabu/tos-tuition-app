'use client'

import { useState, useEffect } from 'react'
import { useAppStore } from '@/lib/store'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  GraduationCap, Layers, DollarSign, CheckCircle, UserPlus,
  Banknote, ClipboardCheck, ArrowRight, Clock, CalendarDays,
  TrendingUp, AlertTriangle, CreditCard, Users, Eye,
} from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

// ─── Types ───────────────────────────────────────────────────────

interface DashboardStats {
  totalStudents: number
  totalBatches: number
  activeBatches: number
  totalTeachers: number
  monthlyRevenue: number
  attendanceRate: number
  unpaidDues: { count: number; totalAmount: number }
  overdueDues: { count: number; totalAmount: number }
  todayPayments: { count: number; totalAmount: number }
  newStudentsThisMonth: number
}

interface TodayClass {
  id: string
  startTime?: string
  endTime?: string
  isOnline: boolean
  status: string
  topic?: string
  batch?: { name: string; subject?: { name: string; color?: string } | null } | null
  teacher?: { firstName: string; lastName: string } | null
  sessionDate: string
}

interface RecentPayment {
  id: string
  amount: number
  paymentMethod: string
  recordedAt: string
  status: string
  notes?: string
  student?: { fullName: string; studentNumber: string } | null
}

interface UpcomingDue {
  id: string
  studentId: string
  student: { fullName: string; studentNumber: string } | null
  description: string
  amount: number
  remaining: number
  dueDate: string
  displayStatus: string
}

interface RevenuePoint {
  month: string
  revenue: number
}

interface DashboardData {
  stats: DashboardStats
  todayClasses: TodayClass[]
  upcomingSessions: TodayClass[]
  recentPayments: RecentPayment[]
  revenueHistory: RevenuePoint[]
  upcomingDues: UpcomingDue[]
}

// ─── Helpers ─────────────────────────────────────────────────────

function formatLKR(amount: number): string {
  return `Rs. ${amount.toLocaleString('en-LK')}`
}

function formatTime(timeStr?: string): string {
  if (!timeStr) return ''
  const [h, m] = timeStr.split(':').map(Number)
  const ampm = h >= 12 ? 'PM' : 'AM'
  const hour12 = h % 12 || 12
  return `${hour12}:${m.toString().padStart(2, '0')} ${ampm}`
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr)
  return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
}

function formatShortDate(dateStr: string): string {
  const date = new Date(dateStr)
  return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })
}

const METHOD_LABELS: Record<string, string> = {
  cash: 'Cash',
  bank_transfer: 'Bank Transfer',
  online: 'Online',
  cheque: 'Cheque',
}

const statusColors: Record<string, string> = {
  live: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  in_progress: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  scheduled: 'bg-sky-50 text-sky-700 border-sky-200',
  completed: 'bg-gray-100 text-gray-500 border-gray-200',
  cancelled: 'bg-red-50 text-red-500 border-red-200',
}

// ─── Component ───────────────────────────────────────────────────

export default function DashboardView() {
  const { currentInstitute, setActiveView } = useAppStore()
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!currentInstitute?.id) return
    const fetchData = async () => {
      setLoading(true)
      setError(null)
      try {
        const res = await fetch(`/api/dashboard/stats?instituteId=${currentInstitute.id}`)
        if (!res.ok) throw new Error('Failed to load dashboard')
        const json = await res.json()
        setData(json)
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Something went wrong')
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [currentInstitute?.id])

  const quickActions = [
    { label: 'Add Student', icon: <UserPlus className="h-4 w-4" />, view: 'students' as const, color: 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100' },
    { label: 'Create Batch', icon: <Layers className="h-4 w-4" />, view: 'batches' as const, color: 'bg-teal-50 text-teal-600 hover:bg-teal-100' },
    { label: 'Record Payment', icon: <Banknote className="h-4 w-4" />, view: 'fees' as const, color: 'bg-amber-50 text-amber-600 hover:bg-amber-100' },
    { label: 'Mark Attendance', icon: <ClipboardCheck className="h-4 w-4" />, view: 'attendance' as const, color: 'bg-rose-50 text-rose-600 hover:bg-rose-100' },
  ]

  if (error) {
    return (
      <div className="space-y-6">
        <Card className="border-destructive/50">
          <CardContent className="p-8 text-center">
            <AlertTriangle className="h-10 w-10 text-destructive mx-auto mb-3" />
            <h3 className="font-semibold text-lg">Failed to load dashboard</h3>
            <p className="text-sm text-muted-foreground mt-1">{error}</p>
            <Button variant="outline" className="mt-4" onClick={() => window.location.reload()}>Try Again</Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const stats = data?.stats
  const hasOverdue = (stats?.overdueDues.count ?? 0) > 0

  return (
    <div className="space-y-6">
      {/* Welcome */}
      <div>
        <h1 className="text-2xl font-bold">Welcome back!</h1>
        <p className="text-muted-foreground mt-1">
          Here&apos;s what&apos;s happening at {currentInstitute?.name || 'your institute'} today.
        </p>
      </div>

      {/* ── Stat Cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="p-4"><Skeleton className="h-4 w-24 mb-3" /><Skeleton className="h-8 w-20" /><Skeleton className="h-3 w-16 mt-2" /></Card>
          ))
        ) : (
          <>
            {/* Students */}
            <Card className="p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm text-muted-foreground">Students</span>
                <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center"><GraduationCap className="h-4 w-4 text-emerald-600" /></div>
              </div>
              <p className="text-2xl font-bold">{stats?.totalStudents ?? 0}</p>
              {(stats?.newStudentsThisMonth ?? 0) > 0 && (
                <p className="text-xs text-emerald-600 mt-1">+{stats!.newStudentsThisMonth} this month</p>
              )}
            </Card>

            {/* Batches */}
            <Card className="p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm text-muted-foreground">Active Batches</span>
                <div className="w-8 h-8 rounded-lg bg-teal-50 flex items-center justify-center"><Layers className="h-4 w-4 text-teal-600" /></div>
              </div>
              <p className="text-2xl font-bold">{stats?.activeBatches ?? 0}</p>
              {(stats?.totalTeachers ?? 0) > 0 && (
                <p className="text-xs text-muted-foreground mt-1">{stats!.totalTeachers} teachers</p>
              )}
            </Card>

            {/* Revenue */}
            <Card className="p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm text-muted-foreground">This Month</span>
                <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center"><DollarSign className="h-4 w-4 text-amber-600" /></div>
              </div>
              <p className="text-2xl font-bold">{formatLKR(stats?.monthlyRevenue ?? 0)}</p>
              {(stats?.todayPayments.count ?? 0) > 0 ? (
                <p className="text-xs text-emerald-600 mt-1">
                  Today: {formatLKR(stats!.todayPayments.totalAmount)} ({stats!.todayPayments.count} payments)
                </p>
              ) : (
                <p className="text-xs text-muted-foreground mt-1">No payments today</p>
              )}
            </Card>

            {/* Unpaid / Overdue */}
            <Card className={`p-4 ${hasOverdue ? 'border-red-200 bg-red-50/30' : ''}`}>
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm text-muted-foreground">Outstanding</span>
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${hasOverdue ? 'bg-red-100' : 'bg-amber-50'}`}>
                  <AlertTriangle className={`h-4 w-4 ${hasOverdue ? 'text-red-600' : 'text-amber-600'}`} />
                </div>
              </div>
              <p className={`text-2xl font-bold ${hasOverdue ? 'text-red-700' : ''}`}>{formatLKR(stats?.unpaidDues.totalAmount ?? 0)}</p>
              {hasOverdue ? (
                <p className="text-xs text-red-600 mt-1 font-medium">
                  {stats!.overdueDues.count} overdue ({formatLKR(stats!.overdueDues.totalAmount)})
                </p>
              ) : stats && stats.unpaidDues.count > 0 ? (
                <p className="text-xs text-amber-600 mt-1">{stats.unpaidDues.count} unpaid dues</p>
              ) : (
                <p className="text-xs text-emerald-600 mt-1">All dues paid</p>
              )}
            </Card>
          </>
        )}
      </div>

      {/* ── Quick Actions ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {quickActions.map((action) => (
          <Button
            key={action.view}
            variant="outline"
            className={`h-auto py-4 flex-col gap-2 font-medium ${action.color} border-0`}
            onClick={() => setActiveView(action.view)}
          >
            {action.icon}
            <span className="text-xs">{action.label}</span>
          </Button>
        ))}
      </div>

      {/* ── Main Grid: Classes + Dues + Payments ── */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Today's Classes */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <CalendarDays className="h-4 w-4" />
                Today&apos;s Classes
              </CardTitle>
              <Button variant="ghost" size="sm" onClick={() => setActiveView('sessions')}>
                View All <ArrowRight className="h-3 w-3 ml-1" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-16 w-full rounded-lg" />)}</div>
            ) : !data?.todayClasses?.length ? (
              <div className="py-8 text-center">
                <Clock className="h-10 w-10 text-muted-foreground/30 mx-auto mb-2" />
                <p className="text-sm font-medium text-muted-foreground">No classes scheduled today</p>
                <p className="text-xs text-muted-foreground mt-1">Create batches and timetable to see classes here</p>
              </div>
            ) : (
              <div className="space-y-3">
                {data.todayClasses.map((cls) => (
                  <div key={cls.id} className="flex items-center gap-4 p-3 rounded-lg border hover:bg-muted/50 transition-colors">
                    <div className="text-center min-w-[60px]">
                      <p className="text-sm font-bold">{formatTime(cls.startTime)}</p>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{cls.topic || cls.batch?.name || 'Untitled Class'}</p>
                      <p className="text-xs text-muted-foreground">
                        {cls.teacher ? `${cls.teacher.firstName} ${cls.teacher.lastName}` : 'No teacher assigned'}
                        {cls.batch?.subject ? ` \u00b7 ${cls.batch.subject.name}` : ''}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {cls.isOnline && <Badge variant="outline" className="text-[10px]">Online</Badge>}
                      <Badge variant="outline" className={`text-[10px] ${statusColors[cls.status] || ''}`}>
                        {cls.status === 'in_progress' && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1 animate-pulse" />}
                        {cls.status.replace('_', ' ')}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Upcoming / Overdue Dues */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <AlertTriangle className={`h-4 w-4 ${hasOverdue ? 'text-red-500' : 'text-amber-500'}`} />
                {hasOverdue ? 'Overdue Dues' : 'Upcoming Dues'}
              </CardTitle>
              <Button variant="ghost" size="sm" onClick={() => setActiveView('fees')}>
                View All <ArrowRight className="h-3 w-3 ml-1" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-14 w-full rounded-lg" />)}</div>
            ) : !data?.upcomingDues?.length ? (
              <div className="py-8 text-center">
                <CheckCircle className="h-10 w-10 text-emerald-200 mx-auto mb-2" />
                <p className="text-sm font-medium text-emerald-600">All clear!</p>
                <p className="text-xs text-muted-foreground mt-1">No overdue or upcoming dues</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {data.upcomingDues.map((due) => (
                  <div key={due.id} className="flex gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-[10px] font-bold ${
                      due.displayStatus === 'overdue' ? 'bg-red-100 text-red-600' : 'bg-amber-100 text-amber-600'
                    }`}>
                      Rs
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{due.student?.fullName || 'Unknown'}</p>
                      <p className="text-xs text-muted-foreground truncate">{due.description}</p>
                      <div className="flex items-center justify-between mt-0.5">
                        <p className={`text-[10px] ${due.displayStatus === 'overdue' ? 'text-red-600 font-medium' : 'text-muted-foreground'}`}>
                          Due: {formatShortDate(due.dueDate)}
                        </p>
                        <p className="text-xs font-semibold">{formatLKR(due.remaining)}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Second Row: Recent Payments + Revenue Chart ── */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Recent Payments */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <CreditCard className="h-4 w-4" />
                Recent Payments
              </CardTitle>
              <Button variant="ghost" size="sm" onClick={() => setActiveView('payments')}>
                View All <ArrowRight className="h-3 w-3 ml-1" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-14 w-full rounded-lg" />)}</div>
            ) : !data?.recentPayments?.length ? (
              <div className="py-8 text-center">
                <Banknote className="h-10 w-10 text-muted-foreground/30 mx-auto mb-2" />
                <p className="text-sm font-medium text-muted-foreground">No payments yet</p>
                <p className="text-xs text-muted-foreground mt-1">Payments will appear here once recorded</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-80 overflow-y-auto">
                {data.recentPayments.map((p) => (
                  <div key={p.id} className="flex gap-3">
                    <div className="w-8 h-8 rounded-full bg-amber-50 flex items-center justify-center shrink-0 text-[10px] font-bold text-amber-600">Rs</div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{p.student?.fullName || 'Unknown Student'}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatLKR(p.amount)} &middot; {METHOD_LABELS[p.paymentMethod] || p.paymentMethod}
                      </p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">{formatDate(p.recordedAt)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Revenue Chart */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  Revenue Overview
                </CardTitle>
                <CardDescription>Monthly revenue for the last 6 months</CardDescription>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setActiveView('payments')}>
                View All <ArrowRight className="h-3 w-3 ml-1" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-64 w-full rounded-lg" />
            ) : !data?.revenueHistory?.some(r => r.revenue > 0) ? (
              <div className="py-12 text-center">
                <TrendingUp className="h-10 w-10 text-muted-foreground/30 mx-auto mb-2" />
                <p className="text-sm font-medium text-muted-foreground">No revenue data yet</p>
                <p className="text-xs text-muted-foreground mt-1">Revenue will appear here once payments are recorded</p>
              </div>
            ) : (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.revenueHistory} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="oklch(0.92 0.01 163)" />
                    <XAxis dataKey="month" tick={{ fontSize: 12, fill: 'oklch(0.556 0 0)' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 12, fill: 'oklch(0.556 0 0)' }} axisLine={false} tickLine={false} tickFormatter={(v) => `${(v / 1000).toFixed(0)}K`} />
                    <Tooltip
                      formatter={(value: number) => [formatLKR(value), 'Revenue']}
                      contentStyle={{ borderRadius: '8px', border: '1px solid oklch(0.92 0.01 163)', fontSize: '12px' }}
                    />
                    <Bar dataKey="revenue" fill="oklch(0.51 0.12 163)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Quick Stats Row ── */}
      {!loading && data && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Card className="p-3 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-emerald-50 flex items-center justify-center"><Users className="h-4 w-4 text-emerald-600" /></div>
            <div>
              <p className="text-lg font-bold">{stats!.totalStudents}</p>
              <p className="text-[11px] text-muted-foreground">Total Students</p>
            </div>
          </Card>
          <Card className="p-3 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-amber-50 flex items-center justify-center"><Eye className="h-4 w-4 text-amber-600" /></div>
            <div>
              <p className="text-lg font-bold">{stats!.attendanceRate}%</p>
              <p className="text-[11px] text-muted-foreground">Attendance (30d)</p>
            </div>
          </Card>
          <Card className="p-3 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-sky-50 flex items-center justify-center"><DollarSign className="h-4 w-4 text-sky-600" /></div>
            <div>
              <p className="text-lg font-bold">{stats!.todayPayments.count}</p>
              <p className="text-[11px] text-muted-foreground">Payments Today</p>
            </div>
          </Card>
          <Card className="p-3 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-rose-50 flex items-center justify-center"><UserPlus className="h-4 w-4 text-rose-600" /></div>
            <div>
              <p className="text-lg font-bold">{stats!.newStudentsThisMonth}</p>
              <p className="text-[11px] text-muted-foreground">New This Month</p>
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}
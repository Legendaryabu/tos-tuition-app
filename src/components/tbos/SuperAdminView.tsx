'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useAppStore } from '@/lib/store'
import { useToast } from '@/hooks/use-toast'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Building2,
  Users,
  GraduationCap,
  DollarSign,
  Activity,
  Search,
  Eye,
  Power,
  PowerOff,
  RotateCcw,
  Shield,
  ArrowUpDown,
  UserX,
  UserCheck,
  LogOut,
  Clock,
  Globe,
  Mail,
  MapPin,
} from 'lucide-react'

// --- Type Definitions ---

interface OverviewStats {
  totalInstitutes: number
  totalUsers: number
  totalStudents: number
  totalRevenue: number
  activeInstitutes: number
  inactiveInstitutes: number
  trialInstitutes: number
}

interface Institute {
  id: string
  name: string
  slug: string
  ownerName: string
  ownerEmail: string
  city: string
  plan: string
  studentCount: number
  status: 'active' | 'inactive' | 'trial'
  createdAt: string
}

interface User {
  id: string
  firstName: string
  lastName: string
  email: string
  type: 'owner' | 'teacher' | 'student'
  instituteName: string
  status: 'active' | 'inactive'
  lastLogin: string | null
  createdAt: string
}

interface ActivityLog {
  id: string
  action: string
  performedBy: string
  target: string
  timestamp: string
  instituteName: string
  details: string
}

type SortDir = 'asc' | 'desc'

// --- Helper: Status Badge ---

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { variant: 'default' | 'destructive' | 'secondary' | 'outline'; className: string }> = {
    active: { variant: 'default', className: 'bg-emerald-600 hover:bg-emerald-700 text-white border-transparent' },
    inactive: { variant: 'destructive', className: '' },
    trial: { variant: 'secondary', className: 'bg-amber-500 hover:bg-amber-600 text-white border-transparent' },
  }
  const c = config[status] ?? config.inactive
  return (
    <Badge variant={c.variant} className={c.className}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </Badge>
  )
}

function UserTypeBadge({ type }: { type: string }) {
  const config: Record<string, string> = {
    owner: 'bg-purple-600 hover:bg-purple-700 text-white border-transparent',
    teacher: 'bg-sky-600 hover:bg-sky-700 text-white border-transparent',
    student: 'bg-emerald-600 hover:bg-emerald-700 text-white border-transparent',
  }
  return (
    <Badge variant="default" className={config[type] ?? ''}>
      {type.charAt(0).toUpperCase() + type.slice(1)}
    </Badge>
  )
}

// --- Skeleton Loaders ---

function StatCardSkeleton() {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-8 w-16" />
          </div>
          <Skeleton className="h-10 w-10 rounded-lg" />
        </div>
      </CardContent>
    </Card>
  )
}

function TableSkeleton({ rows = 5, cols = 6 }: { rows?: number; cols?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex gap-4">
          {Array.from({ length: cols }).map((_, j) => (
            <Skeleton key={j} className="h-8 flex-1" />
          ))}
        </div>
      ))}
    </div>
  )
}

// --- Main Component ---

export default function SuperAdminView() {
  const { toast } = useToast()
  const { setCurrentUser, setCurrentInstitute, setActiveView } = useAppStore()

  // Tab state
  const [activeTab, setActiveTab] = useState('overview')

  // Data state
  const [stats, setStats] = useState<OverviewStats | null>(null)
  const [institutes, setInstitutes] = useState<Institute[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([])

  // UI state
  const [loading, setLoading] = useState<Record<string, boolean>>({})
  const [searchQuery, setSearchQuery] = useState('')
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean
    action: string
    id: string
    label: string
  }>({ open: false, action: '', id: '', label: '' })
  const [detailDialog, setDetailDialog] = useState<{ open: boolean; institute: Institute | null }>({
    open: false,
    institute: null,
  })

  // Sorting
  const [sortField, setSortField] = useState<string>('')
  const [sortDir, setSortDir] = useState<SortDir>('asc')

  // --- Data Fetching ---
  const loadingRef = useRef<Record<string, boolean>>({})

  const fetchTabData = useCallback(
    async (tab: string) => {
      if (loadingRef.current[tab]) return
      loadingRef.current[tab] = true
      setLoading((prev) => ({ ...prev, [tab]: true }))
      try {
        const res = await fetch(`/api/admin?tab=${tab}`)
        if (!res.ok) throw new Error('Failed to fetch data')
        const data = await res.json()

        switch (tab) {
          case 'overview':
            setStats(data)
            break
          case 'institutes':
            setInstitutes(data.institutes || [])
            break
          case 'users':
            setUsers(data.users || [])
            break
          case 'activity':
            setActivityLogs(data)
            break
        }
      } catch {
        toast({ title: 'Error', description: `Failed to load ${tab} data`, variant: 'destructive' })
      } finally {
        loadingRef.current[tab] = false
        setLoading((prev) => ({ ...prev, [tab]: false }))
      }
    },
    [toast]
  )

  useEffect(() => {
    fetchTabData(activeTab)
  }, [activeTab, fetchTabData])

  // --- Actions ---

  const handleAction = async (action: string, id: string) => {
    try {
      const res = await fetch('/api/admin', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, id }),
      })
      if (!res.ok) throw new Error('Action failed')
      toast({ title: 'Success', description: `${action.replace(/_/g, ' ')} completed` })
      fetchTabData(activeTab)
    } catch {
      toast({ title: 'Error', description: 'Failed to perform action', variant: 'destructive' })
    }
    setConfirmDialog({ open: false, action: '', id: '', label: '' })
  }

  const handleViewAsOwner = async (institute: Institute) => {
    toast({ title: 'Switching view...', description: `Loading ${institute.name} as owner` })
    try {
      const res = await fetch(`/api/admin?tab=institute_user&instituteId=${institute.id}`)
      if (!res.ok) throw new Error('Failed')
      const owner = await res.json()
      if (owner) {
        setCurrentUser({
          id: owner.id,
          firstName: owner.firstName,
          lastName: owner.lastName,
          email: owner.email,
          type: 'owner',
          instituteId: institute.id,
        })
        setCurrentInstitute({
          id: institute.id,
          name: institute.name,
          slug: institute.slug,
          phone: '',
          email: institute.ownerEmail,
          city: institute.city,
          zoomEnabled: false,
          onboardingCompleted: true,
        })
        setActiveView('dashboard')
      }
    } catch {
      toast({ title: 'Error', description: 'Failed to switch to owner view', variant: 'destructive' })
    }
  }

  // --- Sorting Helper ---

  function toggleSort(field: string) {
    if (sortField === field) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortField(field)
      setSortDir('asc')
    }
  }

  function sortData<T>(data: T[], field: keyof T): T[] {
    if (!sortField || sortField !== field) return data
    return [...data].sort((a, b) => {
      const aVal = String(a[field] ?? '')
      const bVal = String(b[field] ?? '')
      return sortDir === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal)
    })
  }

  function filterData<T extends Record<string, unknown>>(data: T[], query: string): T[] {
    if (!query.trim()) return data
    const q = query.toLowerCase()
    return data.filter((item) => Object.values(item).some((v) => String(v).toLowerCase().includes(q)))
  }

  // --- Sortable Table Head ---

  function SortableHead({ field, children }: { field: string; children: React.ReactNode }) {
    return (
      <TableHead>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 -ml-3 gap-1 font-medium"
          onClick={() => toggleSort(field)}
        >
          {children}
          <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground" />
        </Button>
      </TableHead>
    )
  }

  // --- Empty State ---

  function EmptyState({ message }: { message: string }) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
        <Users className="h-12 w-12 mb-3 opacity-40" />
        <p className="text-sm font-medium">{message}</p>
      </div>
    )
  }

  // --- Render Helpers ---

  const filteredInstitutes = sortData(filterData(institutes, searchQuery), 'name' as keyof Institute)
  const filteredUsers = sortData(filterData(users, searchQuery), 'firstName' as keyof User)

  function formatCurrency(amount: number) {
    return `Rs. ${amount.toLocaleString('en-LK')}`
  }

  function formatDate(dateStr: string | null) {
    if (!dateStr) return '—'
    return new Date(dateStr).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
  }

  function timeAgo(dateStr: string) {
    const now = Date.now()
    const diff = now - new Date(dateStr).getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 1) return 'Just now'
    if (mins < 60) return `${mins}m ago`
    const hrs = Math.floor(mins / 60)
    if (hrs < 24) return `${hrs}h ago`
    const days = Math.floor(hrs / 24)
    if (days < 30) return `${days}d ago`
    return formatDate(dateStr)
  }

  // ==================== OVERVIEW TAB ====================

  function renderOverview() {
    if (loading.overview && !stats) {
      return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <StatCardSkeleton key={i} />
          ))}
        </div>
      )
    }

    const statCards = [
      { label: 'Total Institutes', value: stats?.totalInstitutes ?? 0, icon: Building2, color: 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20' },
      { label: 'Total Users', value: stats?.totalUsers ?? 0, icon: Users, color: 'text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/20' },
      { label: 'Total Students', value: stats?.totalStudents ?? 0, icon: GraduationCap, color: 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20' },
      { label: 'Total Revenue', value: formatCurrency(stats?.totalRevenue ?? 0), icon: DollarSign, color: 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20' },
    ]

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {statCards.map((card) => (
            <Card key={card.label}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">{card.label}</p>
                    <p className="text-2xl font-bold mt-1">{card.value}</p>
                  </div>
                  <div className={`p-2.5 rounded-lg ${card.color}`}>
                    <card.icon className="h-5 w-5" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Active Institutes</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <UserCheck className="h-5 w-5 text-emerald-600" />
                <span className="text-2xl font-bold">{stats?.activeInstitutes ?? 0}</span>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Inactive Institutes</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <UserX className="h-5 w-5 text-red-500" />
                <span className="text-2xl font-bold">{stats?.inactiveInstitutes ?? 0}</span>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Trial Institutes</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-amber-500" />
                <span className="text-2xl font-bold">{stats?.trialInstitutes ?? 0}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  // ==================== INSTITUTES TAB ====================

  function renderInstitutes() {
    if (loading.institutes && institutes.length === 0) return <TableSkeleton rows={6} cols={7} />

    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <div>
            <CardTitle className="text-lg">All Institutes</CardTitle>
            <CardDescription className="text-sm text-muted-foreground">
              {filteredInstitutes.length} institute{filteredInstitutes.length !== 1 ? 's' : ''} found
            </CardDescription>
          </div>
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search institutes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {filteredInstitutes.length === 0 ? (
            <EmptyState message={searchQuery ? 'No institutes match your search' : 'No institutes registered yet'} />
          ) : (
            <div className="max-h-[520px] overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <SortableHead field="name">Name</SortableHead>
                    <TableHead>Slug</TableHead>
                    <TableHead>Owner</TableHead>
                    <SortableHead field="city">City</SortableHead>
                    <TableHead>Plan</TableHead>
                    <SortableHead field="studentCount">Students</SortableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredInstitutes.map((inst) => (
                    <TableRow key={inst.id}>
                      <TableCell className="font-medium">{inst.name}</TableCell>
                      <TableCell className="text-muted-foreground font-mono text-xs">{inst.slug}</TableCell>
                      <TableCell>
                        <div>
                          <p className="text-sm">{inst.ownerName}</p>
                          <p className="text-xs text-muted-foreground">{inst.ownerEmail}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5">
                          <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                          {inst.city}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="capitalize">{inst.plan}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5">
                          <GraduationCap className="h-3.5 w-3.5 text-muted-foreground" />
                          {inst.studentCount}
                        </div>
                      </TableCell>
                      <TableCell><StatusBadge status={inst.status} /></TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            title="View details"
                            onClick={() => setDetailDialog({ open: true, institute: inst })}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            title={inst.status === 'active' ? 'Deactivate' : 'Activate'}
                            onClick={() =>
                              setConfirmDialog({
                                open: true,
                                action: inst.status === 'active' ? 'deactivate_institute' : 'activate_institute',
                                id: inst.id,
                                label: inst.name,
                              })
                            }
                          >
                            {inst.status === 'active' ? (
                              <PowerOff className="h-4 w-4 text-red-500" />
                            ) : (
                              <Power className="h-4 w-4 text-emerald-500" />
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            title="View as owner"
                            onClick={() => handleViewAsOwner(inst)}
                          >
                            <Globe className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    )
  }

  // ==================== USERS TAB ====================

  function renderUsers() {
    if (loading.users && users.length === 0) return <TableSkeleton rows={6} cols={6} />

    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <div>
            <CardTitle className="text-lg">All Users</CardTitle>
            <CardDescription className="text-sm text-muted-foreground">
              {filteredUsers.length} user{filteredUsers.length !== 1 ? 's' : ''} across all institutes
            </CardDescription>
          </div>
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search users..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {filteredUsers.length === 0 ? (
            <EmptyState message={searchQuery ? 'No users match your search' : 'No users found'} />
          ) : (
            <div className="max-h-[520px] overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <SortableHead field="firstName">Name</SortableHead>
                    <SortableHead field="email">Email</SortableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Institute</TableHead>
                    <TableHead>Status</TableHead>
                    <SortableHead field="lastLogin">Last Login</SortableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">
                        {user.firstName} {user.lastName}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        <div className="flex items-center gap-1.5">
                          <Mail className="h-3.5 w-3.5" />
                          {user.email}
                        </div>
                      </TableCell>
                      <TableCell><UserTypeBadge type={user.type} /></TableCell>
                      <TableCell className="max-w-[180px] truncate">{user.instituteName}</TableCell>
                      <TableCell><StatusBadge status={user.status} /></TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        <div className="flex items-center gap-1.5">
                          <Clock className="h-3.5 w-3.5" />
                          {user.lastLogin ? timeAgo(user.lastLogin) : 'Never'}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            title={user.status === 'active' ? 'Deactivate user' : 'Activate user'}
                            onClick={() =>
                              setConfirmDialog({
                                open: true,
                                action: user.status === 'active' ? 'deactivate_user' : 'activate_user',
                                id: user.id,
                                label: `${user.firstName} ${user.lastName}`,
                              })
                            }
                          >
                            {user.status === 'active' ? (
                              <UserX className="h-4 w-4 text-red-500" />
                            ) : (
                              <UserCheck className="h-4 w-4 text-emerald-500" />
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            title="Reset password"
                            onClick={() =>
                              setConfirmDialog({
                                open: true,
                                action: 'reset_password',
                                id: user.id,
                                label: `${user.firstName} ${user.lastName}`,
                              })
                            }
                          >
                            <RotateCcw className="h-4 w-4 text-amber-500" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    )
  }

  // ==================== ACTIVITY LOG TAB ====================

  function renderActivityLog() {
    if (loading.activity && activityLogs.length === 0) return <TableSkeleton rows={8} cols={5} />

    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <div>
            <CardTitle className="text-lg">Activity Log</CardTitle>
            <CardDescription className="text-sm text-muted-foreground">
              Recent system-wide activity
            </CardDescription>
          </div>
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search logs..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {activityLogs.length === 0 ? (
            <EmptyState message={searchQuery ? 'No logs match your search' : 'No activity recorded yet'} />
          ) : (
            <div className="max-h-[520px] overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Action</TableHead>
                    <TableHead>Performed By</TableHead>
                    <TableHead>Target</TableHead>
                    <TableHead>Institute</TableHead>
                    <TableHead>Details</TableHead>
                    <SortableHead field="timestamp">Time</SortableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filterData(activityLogs, searchQuery).map((log) => (
                    <TableRow key={log.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Activity className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium text-sm">{log.action}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">{log.performedBy}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{log.target}</TableCell>
                      <TableCell className="text-sm">{log.instituteName}</TableCell>
                      <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">{log.details}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        <div className="flex items-center gap-1.5">
                          <Clock className="h-3.5 w-3.5" />
                          {timeAgo(log.timestamp)}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    )
  }

  // ==================== MAIN RENDER ====================

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <header className="bg-gray-900 text-white px-6 py-5">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-white/10">
              <Shield className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight">Super Admin Panel</h1>
              <p className="text-sm text-gray-400">System-wide management and monitoring</p>
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 py-6">
        <Tabs value={activeTab} onValueChange={(v) => { setActiveTab(v); setSearchQuery('') }}>
          <TabsList className="mb-6">
            <TabsTrigger value="overview" className="gap-2">
              <Activity className="h-4 w-4" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="institutes" className="gap-2">
              <Building2 className="h-4 w-4" />
              Institutes
            </TabsTrigger>
            <TabsTrigger value="users" className="gap-2">
              <Users className="h-4 w-4" />
              Users
            </TabsTrigger>
            <TabsTrigger value="activity" className="gap-2">
              <LogOut className="h-4 w-4" />
              Activity
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview">{renderOverview()}</TabsContent>
          <TabsContent value="institutes">{renderInstitutes()}</TabsContent>
          <TabsContent value="users">{renderUsers()}</TabsContent>
          <TabsContent value="activity">{renderActivityLog()}</TabsContent>
        </Tabs>
      </main>

      {/* Confirm Action Dialog */}
      <Dialog open={confirmDialog.open} onOpenChange={(open) => setConfirmDialog({ ...confirmDialog, open })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Action</DialogTitle>
            <DialogDescription>
              Are you sure you want to{' '}
              <span className="font-semibold text-foreground">
                {confirmDialog.action.replace(/_/g, ' ')}
              </span>{' '}
              for <span className="font-semibold text-foreground">{confirmDialog.label}</span>?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setConfirmDialog({ open: false, action: '', id: '', label: '' })}>
              Cancel
            </Button>
            <Button
              variant={confirmDialog.action.includes('deactivate') || confirmDialog.action === 'reset_password' ? 'destructive' : 'default'}
              onClick={() => handleAction(confirmDialog.action, confirmDialog.id)}
            >
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Institute Detail Dialog */}
      <Dialog open={detailDialog.open} onOpenChange={(open) => setDetailDialog({ open, institute: null })}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Institute Details</DialogTitle>
            <DialogDescription>Complete information about this institute</DialogDescription>
          </DialogHeader>
          {detailDialog.institute && (
            <div className="space-y-4 py-2">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Name</p>
                  <p className="font-medium">{detailDialog.institute.name}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Slug</p>
                  <p className="font-mono text-xs">{detailDialog.institute.slug}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Owner</p>
                  <p className="font-medium">{detailDialog.institute.ownerName}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Owner Email</p>
                  <p className="font-medium">{detailDialog.institute.ownerEmail}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">City</p>
                  <p className="font-medium">{detailDialog.institute.city}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Plan</p>
                  <Badge variant="outline" className="capitalize">{detailDialog.institute.plan}</Badge>
                </div>
                <div>
                  <p className="text-muted-foreground">Students</p>
                  <p className="font-medium">{detailDialog.institute.studentCount}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Status</p>
                  <StatusBadge status={detailDialog.institute.status} />
                </div>
                <div className="col-span-2">
                  <p className="text-muted-foreground">Created</p>
                  <p className="font-medium">{formatDate(detailDialog.institute.createdAt)}</p>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDetailDialog({ open: false, institute: null })}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
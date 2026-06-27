'use client'

import { useEffect, useCallback, useState } from 'react'
import { Command } from 'cmdk'
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { useAppStore, type ViewName } from '@/lib/store'
import {
  LayoutDashboard,
  GraduationCap,
  Layers,
  Video,
  CheckSquare,
  CreditCard,
  Calendar,
  BookOpen,
  Users,
  Banknote,
  Settings,
  UserPlus,
  PlusCircle,
  Wallet,
  ClipboardCheck,
  Clock,
  Search,
} from 'lucide-react'

// ── Types ──────────────────────────────────────────────────────────────────

interface CommandItem {
  id: string
  label: string
  icon: React.ReactNode
  view: ViewName
  keywords?: string[]
  group?: 'navigation' | 'quick-action'
}

// ── Data ───────────────────────────────────────────────────────────────────

const navigationItems: CommandItem[] = [
  {
    id: 'nav-dashboard',
    label: 'Dashboard',
    icon: <LayoutDashboard className="h-4 w-4" />,
    view: 'dashboard',
    keywords: ['home', 'overview', 'stats'],
  },
  {
    id: 'nav-students',
    label: 'Students',
    icon: <GraduationCap className="h-4 w-4" />,
    view: 'students',
    keywords: ['student', 'learner', 'pupil'],
  },
  {
    id: 'nav-batches',
    label: 'Batches',
    icon: <Layers className="h-4 w-4" />,
    view: 'batches',
    keywords: ['batch', 'group', 'class', 'section'],
  },
  {
    id: 'nav-sessions',
    label: 'Sessions',
    icon: <Calendar className="h-4 w-4" />,
    view: 'sessions',
    keywords: ['session', 'class', 'schedule'],
  },
  {
    id: 'nav-zoom',
    label: 'Online Classes',
    icon: <Video className="h-4 w-4" />,
    view: 'zoom-meetings',
    keywords: ['zoom', 'online', 'meeting', 'video', 'live'],
  },
  {
    id: 'nav-attendance',
    label: 'Attendance',
    icon: <CheckSquare className="h-4 w-4" />,
    view: 'attendance',
    keywords: ['attendance', 'present', 'absent', 'mark'],
  },
  {
    id: 'nav-fees',
    label: 'Fees',
    icon: <CreditCard className="h-4 w-4" />,
    view: 'fees',
    keywords: ['fee', 'fees', 'payment', 'invoice', 'due'],
  },
  {
    id: 'nav-payments',
    label: 'Payments',
    icon: <Banknote className="h-4 w-4" />,
    view: 'payments',
    keywords: ['payment', 'pay', 'transaction', 'receipt'],
  },
  {
    id: 'nav-timetable',
    label: 'Timetable',
    icon: <Calendar className="h-4 w-4" />,
    view: 'timetable',
    keywords: ['timetable', 'schedule', 'time', 'slot'],
  },
  {
    id: 'nav-subjects',
    label: 'Subjects',
    icon: <BookOpen className="h-4 w-4" />,
    view: 'subjects',
    keywords: ['subject', 'course', 'topic'],
  },
  {
    id: 'nav-teachers',
    label: 'Teachers',
    icon: <Users className="h-4 w-4" />,
    view: 'teachers',
    keywords: ['teacher', 'tutor', 'instructor', 'staff', 'faculty'],
  },
  {
    id: 'nav-settings',
    label: 'Settings',
    icon: <Settings className="h-4 w-4" />,
    view: 'settings',
    keywords: ['settings', 'preference', 'config', 'profile'],
  },
]

const quickActionItems: CommandItem[] = [
  {
    id: 'action-add-student',
    label: 'Add Student',
    icon: <UserPlus className="h-4 w-4" />,
    view: 'students',
    keywords: ['add', 'new', 'create', 'student', 'register'],
    group: 'quick-action',
  },
  {
    id: 'action-create-batch',
    label: 'Create Batch',
    icon: <PlusCircle className="h-4 w-4" />,
    view: 'batches',
    keywords: ['create', 'new', 'batch', 'group', 'class'],
    group: 'quick-action',
  },
  {
    id: 'action-record-payment',
    label: 'Record Payment',
    icon: <Wallet className="h-4 w-4" />,
    view: 'payments',
    keywords: ['record', 'payment', 'pay', 'add', 'new'],
    group: 'quick-action',
  },
  {
    id: 'action-mark-attendance',
    label: 'Mark Attendance',
    icon: <ClipboardCheck className="h-4 w-4" />,
    view: 'attendance',
    keywords: ['mark', 'attendance', 'present', 'absent', 'today'],
    group: 'quick-action',
  },
]

const STORAGE_KEY = 'tbos-recent-views'
const MAX_RECENT = 5

function getRecentViews(): ViewName[] {
  if (typeof window === 'undefined') return []
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    return stored ? (JSON.parse(stored) as ViewName[]) : []
  } catch {
    return []
  }
}

function addRecentView(view: ViewName) {
  try {
    const recent = getRecentViews().filter((v) => v !== view)
    recent.unshift(view)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(recent.slice(0, MAX_RECENT)))
  } catch {
    // ignore storage errors
  }
}

// ── Component ──────────────────────────────────────────────────────────────

export default function CommandPalette() {
  const [open, setOpen] = useState(false)
  const { currentUser, setActiveView, activeView } = useAppStore()

  // Read recent views directly from localStorage (synchronous, no effect needed)
  const recentViews = open ? getRecentViews() : []
  const hasRecent = recentViews.length > 0

  // Global keyboard shortcut: Cmd+K / Ctrl+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setOpen((prev) => !prev)
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [])

  const handleSelect = useCallback(
    (view: ViewName) => {
      setActiveView(view)
      addRecentView(view)
      setOpen(false)
    },
    [setActiveView]
  )

  // Build a lookup map for quick access to item metadata
  const itemLookup = new Map<string, CommandItem>()
  for (const item of [...navigationItems, ...quickActionItems]) {
    itemLookup.set(item.view, item)
  }

  // Don't render anything if user is not logged in
  if (!currentUser) return null

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent
        showCloseButton={false}
        className="overflow-hidden p-0 sm:max-w-lg top-[20%] translate-y-0"
      >
        <DialogTitle className="sr-only">Command Palette</DialogTitle>
        <DialogDescription className="sr-only">
          Search and navigate to any page or action
        </DialogDescription>

        <Command className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-muted-foreground [&_[cmdk-group]]:px-2 [&_[cmdk-input-wrapper]_svg]:h-5 [&_[cmdk-input-wrapper]_svg]:w-5 [&_[cmdk-input]]:h-12 [&_[cmdk-item]]:px-2 [&_[cmdk-item]]:py-2.5 [&_[cmdk-item]_svg]:h-4 [&_[cmdk-item]_svg]:w-4">
          <div className="flex items-center border-b px-3">
            <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
            <Command.Input
              placeholder="Type a command or search..."
              className="flex-1 h-12 bg-transparent px-3 py-3 text-sm outline-none placeholder:text-muted-foreground"
            />
            <kbd className="pointer-events-none hidden sm:inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
              ESC
            </kbd>
          </div>

          <Command.List className="max-h-80 overflow-y-auto p-1">
            <Command.Empty className="py-6 text-center text-sm text-muted-foreground">
              No results found.
            </Command.Empty>

            {/* Recent Views */}
            {hasRecent && (
              <Command.Group heading="Recent" className="[&_[cmdk-group-items]]:space-y-0.5">
                {recentViews.map((view) => {
                  const item = itemLookup.get(view)
                  if (!item) return null
                  return (
                    <Command.Item
                      key={`recent-${view}`}
                      value={`recent-${view} ${item.label}`}
                      onSelect={() => handleSelect(item.view)}
                      className="flex items-center gap-3 rounded-md px-3 py-2.5 text-sm cursor-pointer data-[selected=true]:bg-accent data-[selected=true]:text-accent-foreground"
                    >
                      <span className="text-muted-foreground">{item.icon}</span>
                      <span className="flex-1">{item.label}</span>
                      <Clock className="h-3 w-3 text-muted-foreground/60" />
                    </Command.Item>
                  )
                })}
              </Command.Group>
            )}

            <Command.Separator alwaysRender={hasRecent} className="my-1 h-px bg-border" />

            {/* Navigation */}
            <Command.Group heading="Navigation" className="[&_[cmdk-group-items]]:space-y-0.5">
              {navigationItems.map((item) => (
                <Command.Item
                  key={item.id}
                  value={`${item.id} ${item.label} ${item.keywords?.join(' ') || ''}`}
                  onSelect={() => handleSelect(item.view)}
                  className={`flex items-center gap-3 rounded-md px-3 py-2.5 text-sm cursor-pointer data-[selected=true]:bg-accent data-[selected=true]:text-accent-foreground ${
                    activeView === item.view ? 'text-primary' : ''
                  }`}
                >
                  <span className={activeView === item.view ? 'text-primary' : 'text-muted-foreground'}>
                    {item.icon}
                  </span>
                  <span className="flex-1">{item.label}</span>
                  {activeView === item.view && (
                    <span className="text-[10px] text-muted-foreground font-medium">
                      Current
                    </span>
                  )}
                </Command.Item>
              ))}
            </Command.Group>

            <Command.Separator className="my-1 h-px bg-border" />

            {/* Quick Actions */}
            <Command.Group heading="Quick Actions" className="[&_[cmdk-group-items]]:space-y-0.5">
              {quickActionItems.map((item) => (
                <Command.Item
                  key={item.id}
                  value={`${item.id} ${item.label} ${item.keywords?.join(' ') || ''}`}
                  onSelect={() => handleSelect(item.view)}
                  className="flex items-center gap-3 rounded-md px-3 py-2.5 text-sm cursor-pointer data-[selected=true]:bg-accent data-[selected=true]:text-accent-foreground"
                >
                  <span className="text-muted-foreground">{item.icon}</span>
                  <span className="flex-1">{item.label}</span>
                </Command.Item>
              ))}
            </Command.Group>
          </Command.List>

          {/* Footer */}
          <div className="border-t px-3 py-2 flex items-center justify-between text-[11px] text-muted-foreground">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1">
                <kbd className="inline-flex h-4 min-w-4 items-center justify-center rounded border bg-muted px-0.5 font-mono text-[9px]">↑↓</kbd>
                Navigate
              </span>
              <span className="flex items-center gap-1">
                <kbd className="inline-flex h-4 min-w-4 items-center justify-center rounded border bg-muted px-1.5 font-mono text-[9px]">↵</kbd>
                Select
              </span>
            </div>
            <span className="flex items-center gap-1">
              <kbd className="inline-flex h-4 min-w-4 items-center justify-center rounded border bg-muted px-1.5 font-mono text-[9px]">esc</kbd>
              Close
            </span>
          </div>
        </Command>
      </DialogContent>
    </Dialog>
  )
}
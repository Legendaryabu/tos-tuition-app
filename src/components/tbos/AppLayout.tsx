'use client'

import React, { type ReactNode } from 'react'
import { useAppStore, type ViewName } from '@/lib/store'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
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
  LogOut,
  Menu,
  Bell,
  Search,
  X,
  ChevronLeft,
  Shield,
} from 'lucide-react'
import { Input } from '@/components/ui/input'

interface NavItem {
  label: string
  icon: ReactNode
  view: ViewName
  badge?: string
  prominent?: boolean
}

const navItems: NavItem[] = [
  { label: 'Dashboard', icon: <LayoutDashboard className="h-4 w-4" />, view: 'dashboard' },
  { label: 'Students', icon: <GraduationCap className="h-4 w-4" />, view: 'students' },
  { label: 'Batches', icon: <Layers className="h-4 w-4" />, view: 'batches' },
  {
    label: 'Online Classes',
    icon: <Video className="h-4 w-4" />,
    view: 'zoom-meetings',
    badge: 'Zoom',
    prominent: true,
  },
  { label: 'Attendance', icon: <CheckSquare className="h-4 w-4" />, view: 'attendance' },
  { label: 'Fees', icon: <CreditCard className="h-4 w-4" />, view: 'fees' },
  { label: 'Timetable', icon: <Calendar className="h-4 w-4" />, view: 'timetable' },
  { label: 'Subjects', icon: <BookOpen className="h-4 w-4" />, view: 'subjects' },
  { label: 'Teachers', icon: <Users className="h-4 w-4" />, view: 'teachers' },
  { label: 'Payments', icon: <Banknote className="h-4 w-4" />, view: 'payments' },
  { label: 'Settings', icon: <Settings className="h-4 w-4" />, view: 'settings' },
]

const viewTitles: Record<string, string> = {
  dashboard: 'Dashboard',
  students: 'Students',
  'student-detail': 'Student Details',
  batches: 'Batches',
  'batch-detail': 'Batch Details',
  sessions: 'Sessions',
  'zoom-meetings': 'Online Classes / Zoom',
  attendance: 'Attendance',
  fees: 'Fees & Payments',
  timetable: 'Timetable',
  settings: 'Settings',
  subjects: 'Subjects',
  teachers: 'Teachers',
  payments: 'Payments',
}

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const { activeView, setActiveView, currentUser, currentInstitute, setCurrentUser, setCurrentInstitute } = useAppStore()

  const handleNav = (view: ViewName) => {
    setActiveView(view)
    onNavigate?.()
  }

  const handleLogout = () => {
    setCurrentUser(null)
    setCurrentInstitute(null)
    setActiveView('login')
    onNavigate?.()
  }

  const initials = currentUser
    ? `${currentUser.firstName.charAt(0)}${currentUser.lastName.charAt(0)}`.toUpperCase()
    : 'U'

  return (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="p-4 pb-2">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center">
            <span className="text-primary-foreground font-bold text-sm">T</span>
          </div>
          <div className="min-w-0">
            <h1 className="font-bold text-sm leading-tight truncate">TBOS</h1>
            <p className="text-[11px] text-muted-foreground truncate">
              {currentInstitute?.name || 'Tuition OS'}
            </p>
          </div>
        </div>
      </div>

      <Separator className="my-2" />

      {/* Navigation */}
      <ScrollArea className="flex-1 px-3 py-2">
        <nav className="space-y-1">
          {/* Super Admin back link */}
          {currentUser?.isSuperAdmin && (
            <button
              onClick={() => {
                setCurrentInstitute(null)
                setActiveView('super-admin')
                onNavigate?.()
              }}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors text-left text-amber-600 hover:bg-amber-50 border border-amber-200 mb-2"
            >
              <Shield className="h-4 w-4 shrink-0" />
              <span className="truncate flex-1">Admin Panel</span>
              <Badge className="text-[10px] px-1.5 py-0 h-5 bg-amber-100 text-amber-700 border-amber-200">Admin</Badge>
            </button>
          )}
          {navItems.map((item) => {
            const isActive = activeView === item.view
            return (
              <button
                key={item.view}
                onClick={() => handleNav(item.view)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors text-left ${
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : item.prominent
                      ? 'text-primary hover:bg-accent'
                      : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                }`}
              >
                <span className="shrink-0">{item.icon}</span>
                <span className="truncate flex-1">{item.label}</span>
                {item.badge && (
                  <Badge
                    variant={isActive ? 'secondary' : 'default'}
                    className={`text-[10px] px-1.5 py-0 h-5 ${
                      item.prominent && !isActive
                        ? 'bg-primary/10 text-primary border-primary/20'
                        : ''
                    }`}
                  >
                    {item.badge}
                  </Badge>
                )}
              </button>
            )
          })}
        </nav>
      </ScrollArea>

      <Separator className="my-2" />

      {/* User section */}
      <div className="p-3">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-accent transition-colors text-left">
              <Avatar className="h-8 w-8">
                <AvatarImage src={currentUser?.profilePhoto} />
                <AvatarFallback className="text-xs bg-primary/10 text-primary">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">
                  {currentUser ? `${currentUser.firstName} ${currentUser.lastName}` : 'User'}
                </p>
                <p className="text-[11px] text-muted-foreground truncate capitalize">
                  {currentUser?.type || 'owner'}
                </p>
              </div>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem onClick={() => handleNav('settings')}>
              <Settings className="h-4 w-4 mr-2" />
              Settings
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout} className="text-destructive">
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  )
}

function Sidebar() {
  return (
    <aside className="hidden lg:flex lg:flex-col lg:w-64 lg:fixed lg:inset-y-0 border-r bg-card">
      <SidebarContent />
    </aside>
  )
}

function MobileSidebar() {
  const { sidebarOpen, setSidebarOpen } = useAppStore()

  return (
    <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
      <SheetContent side="left" className="w-72 p-0">
        <SheetHeader className="sr-only">
          <SheetTitle>Navigation</SheetTitle>
        </SheetHeader>
        <SidebarContent onNavigate={() => setSidebarOpen(false)} />
      </SheetContent>
    </Sheet>
  )
}

function Header() {
  const { activeView, toggleSidebar, notifications, unreadCount, markAllRead, markAsRead, currentUser, setCurrentUser, setCurrentInstitute, setActiveView } = useAppStore()
  const title = viewTitles[activeView] || 'Dashboard'

  const initials = currentUser
    ? `${currentUser.firstName.charAt(0)}${currentUser.lastName.charAt(0)}`.toUpperCase()
    : 'U'

  const handleLogout = () => {
    setCurrentUser(null)
    setCurrentInstitute(null)
    setActiveView('login')
  }

  return (
    <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-sm border-b">
      <div className="flex items-center gap-3 px-4 py-3 lg:px-6">
        {/* Mobile menu button */}
        <Button variant="ghost" size="icon" className="lg:hidden" onClick={toggleSidebar}>
          <Menu className="h-5 w-5" />
        </Button>

        {/* Title */}
        <h2 className="font-semibold text-lg hidden sm:block">{title}</h2>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Search */}
        <div className="relative hidden md:block w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search..."
            className="pl-9 h-9 bg-muted/50 border-0 focus-visible:ring-1"
          />
        </div>

        {/* Notifications */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="h-5 w-5" />
              {unreadCount() > 0 && (
                <span className="absolute -top-0.5 -right-0.5 h-4 w-4 rounded-full bg-destructive text-destructive-foreground text-[10px] flex items-center justify-center font-bold">
                  {unreadCount() > 9 ? '9+' : unreadCount()}
                </span>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80">
            <div className="flex items-center justify-between px-3 py-2">
              <span className="font-semibold text-sm">Notifications</span>
              {unreadCount() > 0 && (
                <button
                  onClick={markAllRead}
                  className="text-xs text-primary hover:underline"
                >
                  Mark all read
                </button>
              )}
            </div>
            <DropdownMenuSeparator />
            {notifications.length === 0 ? (
              <div className="p-6 text-center text-sm text-muted-foreground">
                No notifications
              </div>
            ) : (
              notifications.slice(0, 5).map((n) => (
                <DropdownMenuItem
                  key={n.id}
                  onClick={() => markAsRead(n.id)}
                  className={`flex flex-col items-start gap-1 p-3 ${!n.isRead ? 'bg-primary/5' : ''}`}
                >
                  <span className="text-sm font-medium">{n.title}</span>
                  <span className="text-xs text-muted-foreground line-clamp-2">
                    {n.body}
                  </span>
                </DropdownMenuItem>
              ))
            )}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* User menu with Logout (always visible) */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="relative">
              <Avatar className="h-8 w-8">
                <AvatarImage src={currentUser?.profilePhoto} />
                <AvatarFallback className="text-xs bg-primary/10 text-primary">
                  {initials}
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <div className="px-3 py-2">
              <p className="text-sm font-medium truncate">
                {currentUser ? `${currentUser.firstName} ${currentUser.lastName}` : 'User'}
              </p>
              <p className="text-xs text-muted-foreground truncate capitalize">
                {currentUser?.type?.replace('_', ' ') || 'owner'}
              </p>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => setActiveView('settings')}>
              <Settings className="h-4 w-4 mr-2" />
              Settings
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout} className="text-destructive focus:text-destructive">
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}

interface AppLayoutProps {
  children: ReactNode
}

export default function AppLayout({ children }: AppLayoutProps) {
  return (
    <div className="min-h-screen flex flex-col">
      <Sidebar />
      <MobileSidebar />
      <div className="lg:pl-64 flex flex-col min-h-screen">
        <Header />
        <main className="flex-1 p-4 lg:p-6">{children}</main>
        <footer className="border-t px-4 py-3 lg:px-6 mt-auto">
          <p className="text-xs text-muted-foreground text-center">
            TBOS - Tuition Business Operating System &copy; {new Date().getFullYear()}
          </p>
        </footer>
      </div>
    </div>
  )
}
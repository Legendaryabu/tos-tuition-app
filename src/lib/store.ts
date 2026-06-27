import { create } from 'zustand'

export type ViewName =
  | 'login'
  | 'register'
  | 'onboarding'
  | 'super-admin'
  | 'dashboard'
  | 'students'
  | 'student-detail'
  | 'batches'
  | 'batch-detail'
  | 'sessions'
  | 'zoom'
  | 'zoom-meetings'
  | 'attendance'
  | 'fees'
  | 'timetable'
  | 'settings'
  | 'subjects'
  | 'teachers'
  | 'payments'

export interface CurrentUser {
  id: string
  firstName: string
  lastName: string
  email: string
  profilePhoto?: string
  type: string
  instituteId?: string
  isSuperAdmin?: boolean
}

export interface CurrentInstitute {
  id: string
  name: string
  slug: string
  logo?: string
  phone: string
  email: string
  city: string
  zoomEnabled: boolean
  onboardingCompleted: boolean
}

export interface AppNotification {
  id: string
  type: string
  title: string
  body: string
  isRead: boolean
  createdAt: string
  data?: string
}

interface AppState {
  // Navigation
  activeView: ViewName
  previousView: ViewName | null
  setActiveView: (view: ViewName) => void
  goBack: () => void

  // Auth
  currentUser: CurrentUser | null
  setCurrentUser: (user: CurrentUser | null) => void
  isLoggedIn: () => boolean

  // Institute
  currentInstitute: CurrentInstitute | null
  setCurrentInstitute: (institute: CurrentInstitute | null) => void

  // UI
  sidebarOpen: boolean
  setSidebarOpen: (open: boolean) => void
  toggleSidebar: () => void

  // Selected items for detail views
  selectedStudentId: string | null
  setSelectedStudentId: (id: string | null) => void
  selectedBatchId: string | null
  setSelectedBatchId: (id: string | null) => void

  // Notifications
  notifications: AppNotification[]
  setNotifications: (notifications: AppNotification[]) => void
  unreadCount: () => number
  markAsRead: (id: string) => void
  markAllRead: () => void

  // Loading
  isLoading: boolean
  setLoading: (loading: boolean) => void
}

export const useAppStore = create<AppState>((set, get) => ({
  // Navigation
  activeView: 'login',
  previousView: null,
  setActiveView: (view) =>
    set((state) => ({ previousView: state.activeView, activeView: view })),
  goBack: () =>
    set((state) => {
      if (state.previousView) {
        return { activeView: state.previousView, previousView: null }
      }
      return state
    }),

  // Auth
  currentUser: null,
  setCurrentUser: (user) => set({ currentUser: user }),
  isLoggedIn: () => get().currentUser !== null,

  // Institute
  currentInstitute: null,
  setCurrentInstitute: (institute) => set({ currentInstitute: institute }),

  // UI
  sidebarOpen: false,
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),

  // Selected items
  selectedStudentId: null,
  setSelectedStudentId: (id) => set({ selectedStudentId: id }),
  selectedBatchId: null,
  setSelectedBatchId: (id) => set({ selectedBatchId: id }),

  // Notifications
  notifications: [],
  setNotifications: (notifications) => set({ notifications }),
  unreadCount: () => get().notifications.filter((n) => !n.isRead).length,
  markAsRead: (id) =>
    set((state) => ({
      notifications: state.notifications.map((n) =>
        n.id === id ? { ...n, isRead: true } : n
      ),
    })),
  markAllRead: () =>
    set((state) => ({
      notifications: state.notifications.map((n) => ({ ...n, isRead: true })),
    })),

  // Loading
  isLoading: false,
  setLoading: (loading) => set({ isLoading: loading }),
}))
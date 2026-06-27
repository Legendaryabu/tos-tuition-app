'use client'

import { useAppStore } from '@/lib/store'
import AppLayout from '@/components/tbos/AppLayout'
import LoginView from '@/components/tbos/LoginView'
import OnboardingView from '@/components/tbos/OnboardingView'
import SuperAdminView from '@/components/tbos/SuperAdminView'
import DashboardView from '@/components/tbos/DashboardView'
import StudentsView from '@/components/tbos/StudentsView'
import StudentDetailView from '@/components/tbos/StudentDetailView'
import BatchesView from '@/components/tbos/BatchesView'
import BatchDetailView from '@/components/tbos/BatchDetailView'
import ZoomMeetingsView from '@/components/tbos/ZoomMeetingsView'
import SessionsView from '@/components/tbos/SessionsView'
import AttendanceView from '@/components/tbos/AttendanceView'
import FeesView from '@/components/tbos/FeesView'
import TimetableView from '@/components/tbos/TimetableView'
import SubjectsView from '@/components/tbos/SubjectsView'
import TeachersView from '@/components/tbos/TeachersView'
import PaymentsView from '@/components/tbos/PaymentsView'
import SettingsView from '@/components/tbos/SettingsView'

function ViewRouter() {
  const { activeView } = useAppStore()

  switch (activeView) {
    case 'super-admin':
      return <SuperAdminView />
    case 'dashboard':
      return <DashboardView />
    case 'students':
      return <StudentsView />
    case 'student-detail':
      return <StudentDetailView />
    case 'batches':
      return <BatchesView />
    case 'batch-detail':
      return <BatchDetailView />
    case 'zoom':
    case 'zoom-meetings':
      return <ZoomMeetingsView />
    case 'sessions':
      return <SessionsView />
    case 'attendance':
      return <AttendanceView />
    case 'fees':
      return <FeesView />
    case 'timetable':
      return <TimetableView />
    case 'subjects':
      return <SubjectsView />
    case 'teachers':
      return <TeachersView />
    case 'payments':
      return <PaymentsView />
    case 'settings':
      return <SettingsView />
    default:
      return <DashboardView />
  }
}

export default function Home() {
  const { currentUser, currentInstitute, activeView } = useAppStore()

  // Not logged in
  if (!currentUser) {
    return <LoginView />
  }

  // Super admin - has its own layout
  if (currentUser.isSuperAdmin && activeView === 'super-admin') {
    return <SuperAdminView />
  }

  // Super admin viewing an institute (switched context)
  if (currentUser.isSuperAdmin && !currentInstitute) {
    return <SuperAdminView />
  }

  // Logged in but onboarding not complete
  if (currentInstitute && !currentInstitute.onboardingCompleted) {
    return <OnboardingView />
  }

  // Main app
  return <AppLayout><ViewRouter /></AppLayout>
}
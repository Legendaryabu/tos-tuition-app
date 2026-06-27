'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Calendar, Video, MapPin, ChevronLeft, ChevronRight } from 'lucide-react'

interface TimetableSlot {
  id: string
  day: number
  startTime: string
  endTime: string
  batchName: string
  subject: string
  teacher: string
  hall?: string
  isOnline: boolean
  color: string
}

const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const timeSlots = [
  '7:00 AM', '8:00 AM', '9:00 AM', '10:00 AM', '11:00 AM',
  '12:00 PM', '1:00 PM', '2:00 PM', '3:00 PM', '4:00 PM', '5:00 PM', '6:00 PM',
]

const slotColors = [
  'bg-emerald-100 border-emerald-200 text-emerald-800',
  'bg-teal-100 border-teal-200 text-teal-800',
  'bg-amber-100 border-amber-200 text-amber-800',
  'bg-rose-100 border-rose-200 text-rose-800',
  'bg-sky-100 border-sky-200 text-sky-800',
  'bg-orange-100 border-orange-200 text-orange-800',
]

const demoSlots: TimetableSlot[] = [
  { id: '1', day: 0, startTime: '8:00 AM', endTime: '9:30 AM', batchName: 'A/L Physics', subject: 'Physics', teacher: 'Mr. Perera', hall: 'Hall A', isOnline: false, color: slotColors[0] },
  { id: '2', day: 0, startTime: '2:00 PM', endTime: '4:00 PM', batchName: 'A/L Chemistry', subject: 'Chemistry', teacher: 'Dr. Bandara', isOnline: true, color: slotColors[1] },
  { id: '3', day: 0, startTime: '4:30 PM', endTime: '6:00 PM', batchName: 'O/L Maths B', subject: 'Maths', teacher: 'Mrs. Fernando', hall: 'Hall B', isOnline: false, color: slotColors[2] },
  { id: '4', day: 1, startTime: '10:00 AM', endTime: '11:30 AM', batchName: 'O/L Maths A', subject: 'Maths', teacher: 'Mrs. Fernando', isOnline: true, color: slotColors[2] },
  { id: '5', day: 1, startTime: '4:00 PM', endTime: '5:30 PM', batchName: 'A/L Biology', subject: 'Biology', teacher: 'Ms. Kumari', isOnline: true, color: slotColors[3] },
  { id: '6', day: 2, startTime: '8:00 AM', endTime: '9:30 AM', batchName: 'A/L Physics', subject: 'Physics', teacher: 'Mr. Perera', hall: 'Hall A', isOnline: false, color: slotColors[0] },
  { id: '7', day: 2, startTime: '2:00 PM', endTime: '4:00 PM', batchName: 'A/L Chemistry', subject: 'Chemistry', teacher: 'Dr. Bandara', isOnline: true, color: slotColors[1] },
  { id: '8', day: 3, startTime: '10:00 AM', endTime: '11:30 AM', batchName: 'O/L Maths A', subject: 'Maths', teacher: 'Mrs. Fernando', isOnline: true, color: slotColors[2] },
  { id: '9', day: 3, startTime: '1:00 PM', endTime: '2:30 PM', batchName: 'Grade 9 Science', subject: 'Science', teacher: 'Ms. Jayawardena', hall: 'Hall B', isOnline: false, color: slotColors[4] },
  { id: '10', day: 3, startTime: '4:00 PM', endTime: '5:30 PM', batchName: 'A/L Biology', subject: 'Biology', teacher: 'Ms. Kumari', isOnline: true, color: slotColors[3] },
  { id: '11', day: 4, startTime: '8:00 AM', endTime: '9:30 AM', batchName: 'A/L Physics', subject: 'Physics', teacher: 'Mr. Perera', hall: 'Hall A', isOnline: false, color: slotColors[0] },
  { id: '12', day: 4, startTime: '4:30 PM', endTime: '6:00 PM', batchName: 'O/L Maths B', subject: 'Maths', teacher: 'Mrs. Fernando', hall: 'Hall B', isOnline: false, color: slotColors[2] },
  { id: '13', day: 5, startTime: '9:00 AM', endTime: '10:30 AM', batchName: 'Grade 9 Science', subject: 'Science', teacher: 'Ms. Jayawardena', hall: 'Hall A', isOnline: false, color: slotColors[4] },
  { id: '14', day: 5, startTime: '1:00 PM', endTime: '2:30 PM', batchName: 'Scholarship Maths', subject: 'Maths', teacher: 'Mr. Perera', hall: 'Hall A', isOnline: false, color: slotColors[5] },
]

function getSlotForPosition(day: number, time: string): TimetableSlot | undefined {
  return demoSlots.find(s => s.day === day && s.startTime === time)
}

export default function TimetableView() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Timetable</h1>
        <p className="text-sm text-muted-foreground">Weekly class schedule overview</p>
      </div>

      <div className="flex gap-4 text-xs">
        <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded bg-emerald-200" /><span>Physical</span></div>
        <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded bg-sky-200" /><span>Online</span></div>
      </div>

      {/* Timetable Grid */}
      <div className="overflow-x-auto">
        <div className="min-w-[800px]">
          {/* Header row */}
          <div className="grid grid-cols-7 gap-px bg-border rounded-t-lg overflow-hidden">
            <div className="bg-muted p-2 text-center text-xs font-medium text-muted-foreground">Time</div>
            {days.map(day => (
              <div key={day} className="bg-muted p-2 text-center text-xs font-semibold">{day}</div>
            ))}
          </div>

          {/* Time rows */}
          {timeSlots.map(time => (
            <div key={time} className="grid grid-cols-7 gap-px bg-border border-t last:rounded-b-lg overflow-hidden">
              <div className="bg-muted p-2 flex items-center justify-center text-[11px] text-muted-foreground min-h-[50px]">
                {time}
              </div>
              {[0, 1, 2, 3, 4, 5].map(dayIdx => {
                const slot = getSlotForPosition(dayIdx, time)
                if (slot) {
                  return (
                    <div key={dayIdx} className="bg-white p-1.5 min-h-[50px]">
                      <div className={`${slot.color} border rounded p-1.5 h-full flex flex-col justify-center`}>
                        <p className="text-[11px] font-semibold leading-tight truncate">{slot.batchName}</p>
                        <p className="text-[10px] opacity-75 truncate">{slot.teacher}</p>
                        <div className="flex items-center gap-1 mt-0.5">
                          {slot.isOnline ? (
                            <Video className="h-2.5 w-2.5" />
                          ) : (
                            <MapPin className="h-2.5 w-2.5" />
                          )}
                          <span className="text-[9px] opacity-60">
                            {slot.isOnline ? 'Online' : slot.hall}
                          </span>
                        </div>
                      </div>
                    </div>
                  )
                }
                return <div key={dayIdx} className="bg-white min-h-[50px]" />
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
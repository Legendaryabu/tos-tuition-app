import { PrismaClient } from '@prisma/client'

const db = new PrismaClient()

const SRI_LANKAN_DISTRICTS = [
  'Colombo', 'Gampaha', 'Kalutara', 'Kandy', 'Matale', 'Nuwara Eliya',
  'Galle', 'Matara', 'Hambantota', 'Jaffna', 'Kilinochchi', 'Mannar',
  'Mullaitivu', 'Vavuniya', 'Trincomalee', 'Batticaloa', 'Ampara',
  'Kurunegala', 'Puttalam', 'Anuradhapura', 'Polonnaruwa', 'Badulla',
  'Monaragala', 'Ratnapura', 'Kegalle'
]

const SCHOOLS = [
  'Royal College Colombo', 'Visakha Vidyalaya', 'Ananda College', 'Nalanda College',
  'Dharmaraja College Kandy', 'Kingswood College Kandy', 'Mahamaya Girls College Kandy',
  'St. Joseph\'s College Colombo', 'St. Bridget\'s Convent', 'Thurstan College',
  'Prince of Wales College', 'Princess of Wales College', 'Richmond College Galle',
  'Rahula College Matara', 'St. Thomas\' College Mt. Lavinia', 'St. Sylvester\'s College',
  'Maliyadeva College Kurunegala', 'Musantheevu Central College', 'Jaffna Central College',
  'St. Anthony\'s College Kandy', 'Chundikuli Girls College Jaffna'
]

async function main() {
  console.log('🌱 Seeding TBOS database...')

  // 1. Create Plans
  const freePlan = await db.plan.create({
    data: {
      name: 'Free',
      slug: 'free',
      priceMonthly: 0,
      priceYearly: 0,
      maxStudents: 50,
      maxTeachers: 5,
      maxBranches: 2,
      features: JSON.stringify(['students', 'batches', 'attendance', 'fees', 'materials', 'zoom', 'timetable', 'subjects', 'teachers']),
      trialDays: 30,
      sortOrder: 0,
    }
  })

  const proPlan = await db.plan.create({
    data: {
      name: 'Pro',
      slug: 'pro',
      priceMonthly: 2990,
      priceYearly: 29900,
      maxStudents: 500,
      maxTeachers: 20,
      maxBranches: 10,
      features: JSON.stringify(['students', 'batches', 'attendance', 'fees', 'materials', 'zoom', 'timetable', 'subjects', 'teachers', 'exams', 'assignments', 'videos', 'payroll']),
      trialDays: 14,
      sortOrder: 1,
    }
  })

  console.log('  ✅ Plans created')

  // 1.5 Create Super Admin
  await db.user.create({
    data: {
      firstName: 'TBOS',
      lastName: 'Admin',
      email: 'admin@tbos.lk',
      password: 'admin123',
      type: 'super_admin',
      status: 'active',
      instituteId: null,
    }
  })

  console.log('  ✅ Super Admin created (admin@tbos.lk / admin123)')

  // 2. Create Institutes
  const institute1Owner = await db.user.create({
    data: {
      firstName: 'Rajesh',
      lastName: 'Fernando',
      email: 'owner@csa.lk',
      password: 'password123',
      mobile: '+94771234567',
      whatsapp: '+94771234567',
      type: 'owner',
      status: 'active',
      instituteId: null,
      onboardingStep: 6,
    }
  })

  const institute1 = await db.institute.create({
    data: {
      name: 'Colombo Science Academy',
      slug: 'colombo-science-academy',
      type: 'tuition_center',
      phone: '+94112345678',
      whatsapp: '+94771234567',
      email: 'info@csa.lk',
      city: 'Colombo',
      district: 'Colombo',
      addressLine1: '45 Galle Road, Bambalapitiya',
      currency: 'LKR',
      receiptPrefix: 'CSA-RCP',
      invoicePrefix: 'CSA-INV',
      studentNumberPrefix: 'CSA',
      studentNumberSeq: 1,
      zoomEnabled: true,
      zoomApiKey: 'demo_zoom_api_key',
      zoomApiSecret: 'demo_zoom_secret',
      onboardingCompleted: true,
      planId: proPlan.id,
      ownerId: institute1Owner.id,
    }
  })

  // Update owner's instituteId
  await db.user.update({
    where: { id: institute1Owner.id },
    data: { instituteId: institute1.id },
  })

  // Second institute (individual tutor)
  const institute2Owner = await db.user.create({
    data: {
      firstName: 'Nimali',
      lastName: 'Perera',
      email: 'nimali@maths.lk',
      password: 'password123',
      mobile: '+94789876543',
      whatsapp: '+94789876543',
      type: 'owner',
      status: 'active',
      onboardingStep: 6,
    }
  })

  const institute2 = await db.institute.create({
    data: {
      name: 'Kandy Maths Tutor',
      slug: 'kandy-maths-tutor',
      type: 'individual',
      phone: '+94812345678',
      whatsapp: '+94789876543',
      email: 'nimali@maths.lk',
      city: 'Kandy',
      district: 'Kandy',
      addressLine1: '12 Peradeniya Road, Kandy',
      currency: 'LKR',
      zoomEnabled: false,
      onboardingCompleted: true,
      planId: freePlan.id,
      ownerId: institute2Owner.id,
    }
  })

  await db.user.update({
    where: { id: institute2Owner.id },
    data: { instituteId: institute2.id },
  })

  console.log('  ✅ Institutes created')

  // 3. Create Subjects for Institute 1
  const subjects = await Promise.all([
    db.subject.create({
      data: {
        instituteId: institute1.id, name: 'Information & Communication Technology', code: 'ICT',
        gradeLevel: 'AL', category: 'Technology', color: '#10b981', isActive: true,
        nameSinhala: 'තොරතුරා හා සන්නිවේදන තාක්ෂණය',
      }
    }),
    db.subject.create({
      data: {
        instituteId: institute1.id, name: 'Combined Mathematics', code: 'CMATH',
        gradeLevel: 'AL', category: 'Science', color: '#f59e0b', isActive: true,
        nameSinhala: 'ඒකාබද්ධ ගණිතය',
      }
    }),
    db.subject.create({
      data: {
        instituteId: institute1.id, name: 'Physics', code: 'PHY',
        gradeLevel: 'AL', category: 'Science', color: '#ef4444', isActive: true,
        nameSinhala: 'භෞතික විද්‍යාව',
      }
    }),
    db.subject.create({
      data: {
        instituteId: institute1.id, name: 'Mathematics', code: 'MATH',
        gradeLevel: 'OL', category: 'Science', color: '#8b5cf6', isActive: true,
      }
    }),
    db.subject.create({
      data: {
        instituteId: institute1.id, name: 'Science', code: 'SCI',
        gradeLevel: 'OL', category: 'Science', color: '#06b6d4', isActive: true,
      }
    }),
  ])

  // Subjects for Institute 2
  await db.subject.create({
    data: {
      instituteId: institute2.id, name: 'Combined Mathematics', code: 'KMATH',
      gradeLevel: 'AL', category: 'Science', color: '#f59e0b', isActive: true,
    }
  })

  console.log('  ✅ Subjects created')

  // 4. Create Teachers
  const teacher1User = await db.user.create({
    data: {
      firstName: 'Chaminda', lastName: 'Wickramasinghe', email: 'chaminda@csa.lk',
      password: 'password123', mobile: '+94762345678', type: 'teacher', status: 'active',
      instituteId: institute1.id,
    }
  })
  const teacher1 = await db.teacher.create({
    data: {
      userId: teacher1User.id, instituteId: institute1.id, employeeNumber: 'CSA-T001',
      bio: 'Experienced ICT teacher with 15+ years of teaching A/L students. Former lecturer at University of Colombo School of Computing.',
      qualifications: 'BSc (Hons) Computer Science, University of Colombo; MSc IT, SLIIT',
      experienceYears: 15, specializations: JSON.stringify(['ICT', 'Programming', 'Database Systems']),
      employmentType: 'full_time', salaryType: 'hybrid', basicSalary: 75000, commissionPercentage: 10,
      zoomPersonalLink: 'https://zoom.us/my/chaminda',
      isActive: true,
    }
  })

  const teacher2User = await db.user.create({
    data: {
      firstName: 'Dilini', lastName: 'Jayasuriya', email: 'dilini@csa.lk',
      password: 'password123', mobile: '+94713456789', type: 'teacher', status: 'active',
      instituteId: institute1.id,
    }
  })
  const teacher2 = await db.teacher.create({
    data: {
      userId: teacher2User.id, instituteId: institute1.id, employeeNumber: 'CSA-T002',
      bio: 'Passionate mathematics educator specializing in A/L Combined Mathematics.',
      qualifications: 'BSc Mathematics, University of Peradeniya',
      experienceYears: 8, specializations: JSON.stringify(['Combined Mathematics', 'Statistics']),
      employmentType: 'part_time', salaryType: 'commission', commissionPercentage: 30,
      isActive: true,
    }
  })

  const teacher3User = await db.user.create({
    data: {
      firstName: 'Saman', lastName: 'Kumara', email: 'saman@csa.lk',
      password: 'password123', mobile: '+94754567890', type: 'teacher', status: 'active',
      instituteId: institute1.id,
    }
  })
  const teacher3 = await db.teacher.create({
    data: {
      userId: teacher3User.id, instituteId: institute1.id, employeeNumber: 'CSA-T003',
      bio: 'Physics expert with practical approach to teaching.',
      qualifications: 'BSc Physics (Hons), University of Colombo; PGDE',
      experienceYears: 12, specializations: JSON.stringify(['Physics', 'Mechanics']),
      employmentType: 'full_time', salaryType: 'fixed', basicSalary: 85000,
      isActive: true,
    }
  })

  console.log('  ✅ Teachers created')

  // 5. Create Batches
  const batch1 = await db.batch.create({
    data: {
      instituteId: institute1.id, subjectId: subjects[0].id, teacherId: teacher1.id,
      name: '2027 AL ICT - Batch A', code: 'ICT-27-A', gradeLevel: 'AL',
      academicYear: '2025', medium: 'english', classType: 'online',
      maxStudents: 30, currentStudents: 0, monthlyFee: 3500, registrationFee: 1000,
      daysOfWeek: JSON.stringify([1, 3, 5]), startTime: '16:00', endTime: '17:30',
      typicalDurationMin: 90, onlinePlatform: 'zoom',
      status: 'active', isVisibleToStudents: true, isEnrollmentOpen: true,
    }
  })

  const batch2 = await db.batch.create({
    data: {
      instituteId: institute1.id, subjectId: subjects[1].id, teacherId: teacher2.id,
      name: '2027 AL Combined Maths - Batch A', code: 'CMATH-27-A', gradeLevel: 'AL',
      academicYear: '2025', medium: 'sinhala', classType: 'physical',
      maxStudents: 25, currentStudents: 0, monthlyFee: 4000, registrationFee: 1500,
      daysOfWeek: JSON.stringify([2, 4, 6]), startTime: '08:00', endTime: '09:30',
      typicalDurationMin: 90, status: 'active', isVisibleToStudents: true, isEnrollmentOpen: true,
    }
  })

  const batch3 = await db.batch.create({
    data: {
      instituteId: institute1.id, subjectId: subjects[2].id, teacherId: teacher3.id,
      name: '2027 AL Physics - Batch A', code: 'PHY-27-A', gradeLevel: 'AL',
      academicYear: '2025', medium: 'english', classType: 'hybrid',
      maxStudents: 25, currentStudents: 0, monthlyFee: 3500,
      daysOfWeek: JSON.stringify([1, 4]), startTime: '10:00', endTime: '11:30',
      typicalDurationMin: 90, onlinePlatform: 'zoom', status: 'active',
      isVisibleToStudents: true, isEnrollmentOpen: true,
    }
  })

  const batch4 = await db.batch.create({
    data: {
      instituteId: institute1.id, subjectId: subjects[3].id, teacherId: teacher2.id,
      name: '2026 O/L Mathematics - Batch A', code: 'MATH-OL-26-A', gradeLevel: 'OL',
      academicYear: '2025', medium: 'sinhala', classType: 'physical',
      maxStudents: 35, currentStudents: 0, monthlyFee: 2500,
      daysOfWeek: JSON.stringify([2, 5]), startTime: '14:00', endTime: '15:00',
      typicalDurationMin: 60, status: 'active', isVisibleToStudents: true, isEnrollmentOpen: true,
    }
  })

  const batch5 = await db.batch.create({
    data: {
      instituteId: institute1.id, subjectId: subjects[0].id, teacherId: teacher1.id,
      name: '2027 AL ICT - Batch B (Weekend)', code: 'ICT-27-B', gradeLevel: 'AL',
      academicYear: '2025', medium: 'english', classType: 'online',
      maxStudents: 25, currentStudents: 0, monthlyFee: 3500,
      daysOfWeek: JSON.stringify([6]), startTime: '09:00', endTime: '12:00',
      typicalDurationMin: 180, onlinePlatform: 'zoom', status: 'active',
      isVisibleToStudents: true, isEnrollmentOpen: true,
    }
  })

  console.log('  ✅ Batches created')

  // 6. Create Students with Sri Lankan data
  const studentData = [
    { first: 'Tharindu', last: 'Jayawardena', grade: 'AL', stream: 'Technology', school: 'Royal College Colombo', examYear: 2027, gender: 'male' },
    { first: 'Nadeesha', last: 'Fernando', grade: 'AL', stream: 'Technology', school: 'Visakha Vidyalaya', examYear: 2027, gender: 'female' },
    { first: 'Kamal', last: 'Perera', grade: 'AL', stream: 'Science', school: 'Ananda College', examYear: 2027, gender: 'male' },
    { first: 'Sachini', last: 'Wickramasinghe', grade: 'AL', stream: 'Science', school: 'St. Bridget\'s Convent', examYear: 2027, gender: 'female' },
    { first: 'Dinesh', last: 'Silva', grade: 'AL', stream: 'Technology', school: 'Thurstan College', examYear: 2027, gender: 'male' },
    { first: 'Ashani', last: 'Rathnayake', grade: 'AL', stream: 'Science', school: 'Mahamaya Girls College Kandy', examYear: 2027, gender: 'female' },
    { first: 'Nuwan', last: 'Bandara', grade: 'AL', stream: 'Technology', school: 'Dharmaraja College Kandy', examYear: 2027, gender: 'male' },
    { first: 'Isuri', last: 'Gunaratne', grade: 'AL', stream: 'Science', school: 'Princess of Wales College', examYear: 2027, gender: 'female' },
    { first: 'Ravindu', last: 'Seneviratne', grade: 'AL', stream: 'Technology', school: 'Prince of Wales College', examYear: 2027, gender: 'male' },
    { first: 'Thilini', last: 'de Silva', grade: 'AL', stream: 'Science', school: 'St. Joseph\'s College Colombo', examYear: 2027, gender: 'female' },
    { first: 'Pasindu', last: 'Wickramarachchi', grade: 'OL', stream: null, school: 'Royal College Colombo', examYear: 2026, gender: 'male' },
    { first: 'Sanduni', last: 'Kumari', grade: 'OL', stream: null, school: 'Visakha Vidyalaya', examYear: 2026, gender: 'female' },
    { first: 'Kavinda', last: 'Herath', grade: 'OL', stream: null, school: 'Ananda College', examYear: 2026, gender: 'male' },
    { first: 'Dilshan', last: 'Weerasinghe', grade: 'AL', stream: 'Technology', school: 'Richmond College Galle', examYear: 2027, gender: 'male' },
    { first: 'Hiruni', last: 'Dissanayake', grade: 'AL', stream: 'Science', school: 'Kingswood College Kandy', examYear: 2027, gender: 'female' },
  ]

  const students: any[] = []
  for (let i = 0; i < studentData.length; i++) {
    const s = studentData[i]
    const phoneNum = `+947${6 + (i % 4)}${String(1000000 + i * 123456).slice(0, 7)}`
    const user = await db.user.create({
      data: {
        firstName: s.first, lastName: s.last,
        email: `${s.first.toLowerCase()}.${s.last.toLowerCase().replace(/\s/g, '')}@gmail.com`,
        mobile: phoneNum, whatsapp: phoneNum, type: 'student', status: 'active',
        gender: s.gender, instituteId: institute1.id,
      }
    })
    const studentNum = `${institute1.studentNumberPrefix}-${String(institute1.studentNumberSeq).padStart(4, '0')}`
    await db.institute.update({
      where: { id: institute1.id },
      data: { studentNumberSeq: { increment: 1 } },
    })
    const student = await db.student.create({
      data: {
        userId: user.id, instituteId: institute1.id,
        studentNumber: studentNum, fullName: `${s.first} ${s.last}`,
        gender: s.gender, grade: s.grade, stream: s.stream,
        schoolName: s.school, examYear: s.examYear,
        mobile: phoneNum, whatsapp: phoneNum,
        city: i % 3 === 0 ? 'Kandy' : 'Colombo',
        district: i % 3 === 0 ? 'Kandy' : 'Colombo',
        status: 'active',
      }
    })
    students.push(student)
  }

  console.log('  ✅ Students created')

  // 7. Enroll students in batches
  // ICT Batch A: students 0-4, 6, 8, 13
  const ictStudents = [0, 1, 4, 6, 8, 13]
  for (const idx of ictStudents) {
    await db.batchStudent.create({
      data: { batchId: batch1.id, studentId: students[idx].id, status: 'active' }
    })
  }
  await db.batch.update({ where: { id: batch1.id }, data: { currentStudents: ictStudents.length } })

  // Combined Maths Batch A: students 2, 3, 5, 7, 9, 14
  const cmathStudents = [2, 3, 5, 7, 9, 14]
  for (const idx of cmathStudents) {
    await db.batchStudent.create({
      data: { batchId: batch2.id, studentId: students[idx].id, status: 'active' }
    })
  }
  await db.batch.update({ where: { id: batch2.id }, data: { currentStudents: cmathStudents.length } })

  // Physics Batch A: students 0, 2, 3, 5, 9, 14
  const phyStudents = [0, 2, 3, 5, 9, 14]
  for (const idx of phyStudents) {
    await db.batchStudent.create({
      data: { batchId: batch3.id, studentId: students[idx].id, status: 'active' }
    })
  }
  await db.batch.update({ where: { id: batch3.id }, data: { currentStudents: phyStudents.length } })

  // O/L Maths: students 10, 11, 12
  const olStudents = [10, 11, 12]
  for (const idx of olStudents) {
    await db.batchStudent.create({
      data: { batchId: batch4.id, studentId: students[idx].id, status: 'active' }
    })
  }
  await db.batch.update({ where: { id: batch4.id }, data: { currentStudents: olStudents.length } })

  // ICT Batch B: students 1, 4, 6, 8, 13
  const ictBStudents = [1, 4, 6, 8, 13]
  for (const idx of ictBStudents) {
    await db.batchStudent.create({
      data: { batchId: batch5.id, studentId: students[idx].id, status: 'active' }
    })
  }
  await db.batch.update({ where: { id: batch5.id }, data: { currentStudents: ictBStudents.length } })

  console.log('  ✅ Students enrolled in batches')

  // 8. Create Timetable Slots
  const slots = [
    { batchId: batch1.id, dayOfWeek: 1, startTime: '16:00', endTime: '17:30', teacherId: teacher1.id },
    { batchId: batch1.id, dayOfWeek: 3, startTime: '16:00', endTime: '17:30', teacherId: teacher1.id },
    { batchId: batch1.id, dayOfWeek: 5, startTime: '16:00', endTime: '17:30', teacherId: teacher1.id },
    { batchId: batch2.id, dayOfWeek: 2, startTime: '08:00', endTime: '09:30', teacherId: teacher2.id },
    { batchId: batch2.id, dayOfWeek: 4, startTime: '08:00', endTime: '09:30', teacherId: teacher2.id },
    { batchId: batch2.id, dayOfWeek: 6, startTime: '08:00', endTime: '09:30', teacherId: teacher2.id },
    { batchId: batch3.id, dayOfWeek: 1, startTime: '10:00', endTime: '11:30', teacherId: teacher3.id },
    { batchId: batch3.id, dayOfWeek: 4, startTime: '10:00', endTime: '11:30', teacherId: teacher3.id },
    { batchId: batch4.id, dayOfWeek: 2, startTime: '14:00', endTime: '15:00', teacherId: teacher2.id },
    { batchId: batch4.id, dayOfWeek: 5, startTime: '14:00', endTime: '15:00', teacherId: teacher2.id },
    { batchId: batch5.id, dayOfWeek: 6, startTime: '09:00', endTime: '12:00', teacherId: teacher1.id },
  ]

  for (const slot of slots) {
    await db.timetableSlot.create({
      data: {
        instituteId: institute1.id, ...slot, isActive: true,
        effectiveFrom: new Date('2025-01-01'),
      }
    })
  }

  console.log('  ✅ Timetable slots created')

  // 9. Create Class Sessions (past and upcoming)
  const today = new Date()
  const sessions: any[] = []

  // Create past sessions (completed)
  for (let d = -14; d <= -1; d++) {
    const date = new Date(today)
    date.setDate(date.getDate() + d)
    const dow = date.getDay()

    for (const slot of slots) {
      if (slot.dayOfWeek === dow) {
        const session = await db.classSession.create({
          data: {
            instituteId: institute1.id, batchId: slot.batchId,
            teacherId: slot.teacherId, timetableSlotId: undefined,
            sessionDate: new Date(date.getFullYear(), date.getMonth(), date.getDate()),
            startTime: slot.startTime, endTime: slot.endTime,
            durationMinutes: 90, topic: `Chapter ${Math.ceil(Math.abs(d) / 2)} - Lesson ${dow}`,
            isOnline: slot.batchId === batch1.id || slot.batchId === batch5.id || (slot.batchId === batch3.id && dow === 4),
            onlinePlatform: (slot.batchId === batch1.id || slot.batchId === batch5.id) ? 'zoom' : (slot.batchId === batch3.id && dow === 4) ? 'zoom' : null,
            status: 'completed', createdBy: institute1Owner.id,
            actualStartedAt: new Date(date.getFullYear(), date.getMonth(), date.getDate(), parseInt(slot.startTime.split(':')[0]), parseInt(slot.startTime.split(':')[1])),
            actualEndedAt: new Date(date.getFullYear(), date.getMonth(), date.getDate(), parseInt(slot.endTime.split(':')[0]), parseInt(slot.endTime.split(':')[1])),
          }
        })
        sessions.push(session)
      }
    }
  }

  // Create today's sessions
  const todayDow = today.getDay()
  for (const slot of slots) {
    if (slot.dayOfWeek === todayDow) {
      const isAfternoon = parseInt(slot.startTime.split(':')[0]) >= 12
      const session = await db.classSession.create({
        data: {
          instituteId: institute1.id, batchId: slot.batchId,
          teacherId: slot.teacherId,
          sessionDate: new Date(today.getFullYear(), today.getMonth(), today.getDate()),
          startTime: slot.startTime, endTime: slot.endTime,
          durationMinutes: 90, topic: `Regular Class - ${subjects.find(s => s.id === (slot.batchId === batch1.id ? subjects[0].id : slot.batchId === batch2.id ? subjects[1].id : slot.batchId === batch3.id ? subjects[2].id : subjects[3].id))?.name || 'Subject'}`,
          isOnline: slot.batchId === batch1.id || slot.batchId === batch5.id,
          onlinePlatform: (slot.batchId === batch1.id || slot.batchId === batch5.id) ? 'zoom' : null,
          status: isAfternoon ? 'scheduled' : 'completed',
          createdBy: institute1Owner.id,
          actualStartedAt: isAfternoon ? null : new Date(today.getFullYear(), today.getMonth(), today.getDate(), parseInt(slot.startTime.split(':')[0]), parseInt(slot.startTime.split(':')[1])),
          actualEndedAt: isAfternoon ? null : new Date(today.getFullYear(), today.getMonth(), today.getDate(), parseInt(slot.endTime.split(':')[0]), parseInt(slot.endTime.split(':')[1])),
        }
      })
      sessions.push(session)
    }
  }

  // Create future sessions (next 7 days)
  for (let d = 1; d <= 7; d++) {
    const date = new Date(today)
    date.setDate(date.getDate() + d)
    const dow = date.getDay()
    for (const slot of slots) {
      if (slot.dayOfWeek === dow) {
        const session = await db.classSession.create({
          data: {
            instituteId: institute1.id, batchId: slot.batchId,
            teacherId: slot.teacherId,
            sessionDate: new Date(date.getFullYear(), date.getMonth(), date.getDate()),
            startTime: slot.startTime, endTime: slot.endTime,
            durationMinutes: slot.batchId === batch5.id ? 180 : 90,
            topic: 'Upcoming Class',
            isOnline: slot.batchId === batch1.id || slot.batchId === batch5.id || (slot.batchId === batch3.id && dow === 4),
            onlinePlatform: (slot.batchId === batch1.id || slot.batchId === batch5.id) ? 'zoom' : null,
            status: 'scheduled', createdBy: institute1Owner.id,
          }
        })
        sessions.push(session)
      }
    }
  }

  console.log(`  ✅ ${sessions.length} class sessions created`)

  // 10. Create Zoom Meetings
  const onlineSessions = sessions.filter(s => s.isOnline && s.status !== 'completed').slice(0, 8)
  for (const session of onlineSessions) {
    const meetingNum = 800000000 + Math.floor(Math.random() * 100000000)
    await db.zoomMeeting.create({
      data: {
        instituteId: institute1.id,
        batchId: session.batchId,
        classSessionId: session.id,
        teacherId: session.teacherId,
        zoomMeetingId: `zm_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        zoomMeetingNumber: meetingNum,
        topic: `${session.topic} - Zoom Class`,
        hostEmail: 'chaminda@csa.lk',
        joinUrl: `https://zoom.us/j/${meetingNum}`,
        startUrl: `https://zoom.us/s/${meetingNum}`,
        passcode: Math.random().toString(36).slice(2, 8),
        status: session.status === 'completed' ? 'ended' : 'scheduled',
        startTime: new Date(`${session.sessionDate.toISOString().split('T')[0]}T${session.startTime || '09:00'}`),
        durationMinutes: session.durationMinutes || 60,
        participantCount: session.status === 'completed' ? Math.floor(Math.random() * 15) + 5 : 0,
        tbosCreated: true,
      }
    })

    // Update session with Zoom details
    await db.classSession.update({
      where: { id: session.id },
      data: {
        onlineMeetingUrl: `https://zoom.us/j/${meetingNum}`,
        onlineMeetingId: String(meetingNum),
        onlinePasscode: Math.random().toString(36).slice(2, 8),
      }
    })
  }

  // Create a "live" Zoom meeting for demo
  const liveMeetingNum = 1234567890
  await db.zoomMeeting.create({
    data: {
      instituteId: institute1.id,
      batchId: batch1.id,
      teacherId: teacher1.id,
      zoomMeetingId: 'zm_live_demo',
      zoomMeetingNumber: liveMeetingNum,
      topic: 'AL ICT - Live Revision Session',
      hostEmail: 'chaminda@csa.lk',
      joinUrl: `https://zoom.us/j/${liveMeetingNum}`,
      startUrl: `https://zoom.us/s/${liveMeetingNum}`,
      passcode: 'tbos2025',
      status: 'started',
      startTime: new Date(),
      durationMinutes: 90,
      participantCount: 12,
      tbosCreated: true,
    }
  })

  console.log('  ✅ Zoom meetings created')

  // 11. Create Attendance Records for past sessions
  const completedSessions = sessions.filter(s => s.status === 'completed')
  for (const session of completedSessions) {
    const batchStudentsList = await db.batchStudent.findMany({
      where: { batchId: session.batchId, status: 'active' },
      select: { studentId: true },
    })
    for (const bs of batchStudentsList) {
      const rand = Math.random()
      let status = 'present'
      if (rand > 0.9) status = 'absent'
      else if (rand > 0.85) status = 'late'
      else if (rand > 0.82) status = 'excused'

      await db.attendanceRecord.create({
        data: {
          classSessionId: session.id, studentId: bs.studentId,
          batchId: session.batchId, instituteId: session.instituteId,
          status, markedBy: institute1Owner.id,
          checkInTime: session.startTime,
        }
      })
    }
  }

  console.log('  ✅ Attendance records created')

  // 12. Create Fee Structures
  await db.feeStructure.create({
    data: {
      instituteId: institute1.id, batchId: batch1.id, name: 'AL ICT Monthly Fee',
      type: 'monthly', amount: 3500, isRecurring: true, recurrence: 'monthly',
      dueDay: 5, gracePeriodDays: 7, lateFeeAmount: 200, lateFeeType: 'fixed',
      isActive: true,
    }
  })
  await db.feeStructure.create({
    data: {
      instituteId: institute1.id, batchId: batch2.id, name: 'AL Combined Maths Monthly Fee',
      type: 'monthly', amount: 4000, isRecurring: true, recurrence: 'monthly',
      dueDay: 5, gracePeriodDays: 5, lateFeeAmount: 250, lateFeeType: 'fixed',
      isActive: true,
    }
  })
  await db.feeStructure.create({
    data: {
      instituteId: institute1.id, batchId: batch4.id, name: 'O/L Maths Monthly Fee',
      type: 'monthly', amount: 2500, isRecurring: true, recurrence: 'monthly',
      dueDay: 10, gracePeriodDays: 5, isActive: true,
    }
  })
  await db.feeStructure.create({
    data: {
      instituteId: institute1.id, name: 'Registration Fee',
      type: 'registration', amount: 1000, isActive: true,
    }
  })

  console.log('  ✅ Fee structures created')

  // 13. Create Fee Dues
  const allBatches = await db.batch.findMany({ where: { instituteId: institute1.id } })
  const batchMap = new Map(allBatches.map(b => [b.id, b]))

  for (const student of students) {
    const enrollments = await db.batchStudent.findMany({
      where: { studentId: student.id, status: 'active' },
    })
    for (const enrollment of enrollments) {
      const batch = batchMap.get(enrollment.batchId)
      if (!batch) continue
      // Create dues for last 3 months
      for (let m = 0; m < 3; m++) {
        const dueDate = new Date(today.getFullYear(), today.getMonth() - m, 5)
        const isPaid = m > 0 || Math.random() > 0.3
        const fee = batch.monthlyFee || 3000
        await db.feeDue.create({
          data: {
            instituteId: institute1.id, studentId: student.id,
            batchId: enrollment.batchId,
            type: 'monthly',
            description: `${batch.name} - Monthly Fee`,
            amount: fee, dueDate,
            periodMonth: today.getMonth() - m + 1, periodYear: today.getFullYear(),
            status: isPaid ? 'paid' : (dueDate < today ? 'overdue' : 'unpaid'),
            amountPaid: isPaid ? fee : (m === 0 ? Math.floor(fee * 0.5) : 0),
            paidAt: isPaid ? new Date(today.getFullYear(), today.getMonth() - m, 3) : null,
          }
        })
      }
    }
  }

  console.log('  ✅ Fee dues created')

  // 14. Create Payments
  const someDues = await db.feeDue.findMany({
    where: { instituteId: institute1.id, status: 'paid' },
    take: 20,
  })
  for (let i = 0; i < someDues.length; i++) {
    const due = someDues[i]
    const payDate = new Date(due.paidAt || due.dueDate)
    await db.payment.create({
      data: {
        instituteId: institute1.id, studentId: due.studentId,
        amount: due.amount, currency: 'LKR',
        paymentMethod: ['cash', 'bank_transfer', 'online'][i % 3],
        referenceNumber: `REF${String(1000 + i).padStart(6, '0')}`,
        bankName: i % 3 === 1 ? ['BOC', 'People\'s Bank', 'HNB', 'Sampath Bank'][i % 4] : null,
        verificationStatus: 'not_required', status: 'completed',
        recordedBy: institute1Owner.id,
        recordedAt: payDate,
      }
    })
  }

  console.log('  ✅ Payments created')

  // 15. Create Exams
  const exam1 = await db.exam.create({
    data: {
      instituteId: institute1.id, batchId: batch1.id, subjectId: subjects[0].id,
      name: 'ICT - Term 1 Exam 2025', type: 'combined',
      examDate: new Date(today.getFullYear(), 3, 15),
      startTime: '09:00', endTime: '12:00', totalMarks: 100, passMarks: 35,
      status: 'completed', isResultsPublished: true,
      resultsPublishedAt: new Date(today.getFullYear(), 3, 25),
    }
  })

  // Exam results for ICT exam
  for (let i = 0; i < ictStudents.length; i++) {
    const marks = [78, 85, 62, 91, 73, 88]
    await db.examResult.create({
      data: {
        examId: exam1.id, studentId: students[ictStudents[i]].id,
        marksObtained: marks[i], grade: marks[i] >= 75 ? 'A' : marks[i] >= 65 ? 'B' : marks[i] >= 50 ? 'C' : 'S',
        rank: i + 1, enteredAt: new Date(today.getFullYear(), 3, 20),
      }
    })
  }

  console.log('  ✅ Exams and results created')

  // 16. Create Notifications
  await db.notification.createMany({
    data: [
      { userId: institute1Owner.id, type: 'fee_due', title: 'Fee Due Alert', body: '5 students have overdue fees totaling LKR 17,500', isRead: false },
      { userId: institute1Owner.id, type: 'zoom', title: 'Zoom Meeting Starting', body: 'AL ICT - Live Revision Session is starting now', isRead: false },
      { userId: institute1Owner.id, type: 'attendance', title: 'Low Attendance', body: 'Physics Batch A had only 50% attendance yesterday', isRead: true },
      { userId: institute1Owner.id, type: 'system', title: 'Welcome to TBOS!', body: 'Your account has been set up successfully. Explore the dashboard to get started.', isRead: true },
    ]
  })

  console.log('  ✅ Notifications created')

  // 17. Create Subscriptions
  await db.subscription.create({
    data: {
      instituteId: institute1.id, planId: proPlan.id,
      status: 'active', billingCycle: 'monthly', amount: 2990,
      startedAt: new Date('2025-01-01'),
      endsAt: new Date('2026-01-01'),
    }
  })
  await db.subscription.create({
    data: {
      instituteId: institute2.id, planId: freePlan.id,
      status: 'active', billingCycle: 'monthly', amount: 0,
      startedAt: new Date('2025-03-01'),
      endsAt: new Date('2026-03-01'),
      trialEndsAt: new Date('2025-04-01'),
    }
  })

  console.log('  ✅ Subscriptions created')

  console.log('')
  console.log('🎉 Seed complete!')
  console.log('   Institute 1: Colombo Science Academy (owner@csa.lk / password123)')
  console.log('   Institute 2: Kandy Maths Tutor (nimali@maths.lk / password123)')
  console.log(`   ${students.length} students, ${5} batches, ${sessions.length} sessions, ${onlineSessions.length} Zoom meetings`)
}

main()
  .then(async () => { await db.$disconnect() })
  .catch(async (e) => { console.error(e); await db.$disconnect(); process.exit(1) })
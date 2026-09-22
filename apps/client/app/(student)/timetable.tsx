import { colors, surfaces } from '../../src/theme';
import React, { useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../src/services/api';

type TimetableTab = 'DAILY' | 'EXAMS';

function displayDate(value: any) { return String(value || '').slice(0, 10); }
function displayTime(value: any) { const text = String(value || ''); return text.includes('T') ? text.slice(11, 16) : text.slice(0, 5); }
function duration(start: any, end: any) {
  const startText = displayTime(start); const endText = displayTime(end);
  const [startHour, startMinute] = startText.split(':').map(Number); const [endHour, endMinute] = endText.split(':').map(Number);
  const total = Math.max((endHour * 60 + endMinute) - (startHour * 60 + startMinute), 0);
  const hours = Math.floor(total / 60); const minutes = total % 60;
  return `${hours ? `${hours} hr ` : ''}${minutes ? `${minutes} min` : ''}`.trim() || '—';
}

export default function Screen() {
  const [tab, setTab] = useState<TimetableTab>('DAILY');
  const daily = useQuery({ queryKey: ['student-auto-timetable'], queryFn: async () => (await api.get('/timetable')).data, enabled: tab === 'DAILY' });
  const exams = useQuery<any[]>({ queryKey: ['student-exam-timetable'], queryFn: async () => (await api.get('/exam-timetables')).data, enabled: tab === 'EXAMS' });
  const data = daily.data;

  return <View style={s.page}><ScrollView contentContainerStyle={s.content}>
    <View style={s.hero}><Text style={s.eyebrow}>{tab === 'DAILY' ? 'AUTO-GENERATED DAILY TIMETABLE' : 'ADMIN-PUBLISHED EXAM TIMETABLE'}</Text><Text style={s.title}>{tab === 'DAILY' ? 'Today’s Schedule' : 'Exam Timetable'}</Text><Text style={s.date}>{tab === 'DAILY' ? (data?.dayName ? `${data.dayName}, ${data.date}` : 'Current date') : 'Your section-wise examination schedule'}</Text><Text style={s.meta}>{data?.className ? `Class ${data.className} • Section ${data.sectionName}` : 'Your academic schedule'}</Text></View>
    <View style={s.tabs}><TouchableOpacity accessibilityRole="tab" accessibilityState={{ selected: tab === 'DAILY' }} style={[s.tab, tab === 'DAILY' && s.tabActive]} onPress={() => setTab('DAILY')}><Text style={[s.tabText, tab === 'DAILY' && s.tabTextActive]}>Daily timetable</Text></TouchableOpacity><TouchableOpacity accessibilityRole="tab" accessibilityState={{ selected: tab === 'EXAMS' }} style={[s.tab, tab === 'EXAMS' && s.tabActive]} onPress={() => setTab('EXAMS')}><Text style={[s.tabText, tab === 'EXAMS' && s.tabTextActive]}>Exam timetable</Text></TouchableOpacity></View>
    {tab === 'DAILY' ? <>{daily.isLoading ? <View style={s.state}><ActivityIndicator color="#C88728"/><Text style={s.stateText}>Loading your academic timetable…</Text></View> : daily.isError ? <View style={s.state}><Text style={s.error}>Timetable could not be loaded.</Text></View> : <View style={s.list}>{(data?.periods || []).map((period: any) => <View key={period.periodNumber} style={s.period}><View style={s.time}><Text style={s.periodNo}>P{period.periodNumber}</Text><Text style={s.timeText}>{period.startTime}–{period.endTime}</Text></View><View style={s.subject}><Text style={s.subjectName}>{period.subject.name}</Text><Text style={s.teacher}>{period.teacher?.name || 'Teacher not assigned'}</Text></View><View style={[s.badge, period.status === 'CLASS_WORK' && s.workBadge]}><Text style={[s.badgeText, period.status === 'CLASS_WORK' && s.workText]}>{period.status === 'CLASS_WORK' ? 'CLASS WORK' : 'SCHEDULED'}</Text></View></View>)}</View>}{!daily.isLoading && !daily.isError && !(data?.periods || []).length ? <View style={s.state}><Text style={s.stateText}>No academic subjects are available yet.</Text></View> : null}</> : exams.isLoading ? <View style={s.state}><ActivityIndicator color="#C88728"/><Text style={s.stateText}>Loading your exam timetable…</Text></View> : exams.isError ? <View style={s.state}><Text style={s.error}>Exam timetable could not be loaded.</Text></View> : exams.data?.length ? <View style={s.examList}>{exams.data.map((timetable: any) => <View style={s.examCard} key={timetable.id}><Text style={s.examTitle}>{timetable.title}</Text><Text style={s.examMeta}>{timetable.type} · {timetable.schoolClass?.name || 'Class'} · Section {timetable.section?.name || '—'}</Text><Text style={s.examMeta}>{displayDate(timetable.startDate)} to {displayDate(timetable.endDate)}</Text>{(timetable.entries || []).map((entry: any) => <View style={s.examRow} key={entry.id}><View style={s.examDate}><Text style={s.examDateText}>{displayDate(entry.date)}</Text><Text style={s.examDuration}>{entry.isHoliday ? 'Holiday' : duration(entry.startTime, entry.endTime)}</Text></View><View style={s.examSubject}><Text style={s.subjectName}>{entry.subject?.name || entry.holidayTitle || 'Holiday'}</Text>{entry.isHoliday ? null : <Text style={s.teacher}>{displayTime(entry.startTime)}–{displayTime(entry.endTime)} · Max {entry.maximumMarks || '—'} · Pass {entry.passMarks || '—'}</Text>}</View></View>)}</View>)}</View> : <View style={s.state}><Text style={s.stateText}>No exam timetable has been published for your section yet.</Text></View>}
  </ScrollView></View>;
}

const s=StyleSheet.create({page: { flex:1, backgroundColor: colors.background },
  content: { ...surfaces.content },
  hero: { ...surfaces.card, marginBottom:18, padding: 24, borderRadius: 16, backgroundColor: '#FFFFFF', flexWrap: 'wrap' },
  eyebrow: { fontWeight:'800', fontSize: 10, letterSpacing: 1.4, color: colors.blue },
  title: { marginTop:8, fontSize: 28, color: colors.ink, fontWeight: '700' },
  date: { color: colors.ink, fontSize:18,fontWeight:'700',marginTop:10 },
  meta: { color: colors.muted,fontSize:13,marginTop:6 },
  tabs: { flexDirection: 'row', gap: 10, marginBottom: 18 },
  tab: { flex: 1, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: colors.border, borderRadius: 12, paddingVertical: 13, alignItems: 'center' },
  tabActive: { backgroundColor: colors.blue, borderColor: colors.blue },
  tabText: { color: colors.ink, fontSize: 13, fontWeight: '700' },
  tabTextActive: { color: '#FFFFFF' },
  list: { gap:10 },
  period: { backgroundColor:'#fff',borderRadius:16,padding:16,flexDirection:'row',alignItems:'center',gap:14,borderWidth:1,borderColor:'#E5EBF3' },
  time: { width:125 },
  periodNo: { color:'#3563E9',fontSize:11,fontWeight:'800' },
  timeText: { color:'#60758A',fontSize:12,marginTop:4 },
  subject: { flex:1 },
  subjectName: { color:'#203451',fontSize:16,fontWeight:'800' },
  teacher: { color:'#718096',fontSize:13,marginTop:5 },
  badge: { backgroundColor:'#EAF4EF',borderRadius:20,paddingHorizontal:10,paddingVertical:6 },
  badgeText: { color:'#287A54',fontSize:10,fontWeight:'800' },
  workBadge: { backgroundColor:'#FFF4DD' },
  workText: { color:'#3563E9' },
  examList: { gap: 14 },
  examCard: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 18, borderWidth: 1, borderColor: '#E5EBF3' },
  examTitle: { color: colors.ink, fontSize: 18, fontWeight: '800' },
  examMeta: { color: colors.muted, fontSize: 12, marginTop: 5 },
  examRow: { flexDirection: 'row', gap: 14, alignItems: 'center', borderTopWidth: 1, borderTopColor: '#E5EBF3', marginTop: 14, paddingTop: 13 },
  examDate: { width: 95 },
  examDateText: { color: colors.blue, fontSize: 12, fontWeight: '800' },
  examDuration: { color: colors.muted, fontSize: 11, marginTop: 4 },
  examSubject: { flex: 1 },
  state: { ...surfaces.card, backgroundColor:'#fff',padding:40,alignItems:'center', borderRadius: 14 },
  stateText: { color:'#718096',fontSize:13,marginTop:10,textAlign:'center' },
  error: { color:'#B42318',fontWeight:'700' }});

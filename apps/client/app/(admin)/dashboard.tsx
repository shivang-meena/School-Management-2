import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Header } from '../../src/components/Header';
import { AdminNav } from '../../src/components/AdminNav';
import { useStudents, useStaff, useAccountsOverview, useAcademics } from '../../src/hooks/useQueries';

const actions = [
  ['Students', 'Admissions, enrollment and transfers', '/(admin)/students', '01'],
  ['Employees', 'Roles, permissions and assignments', '/(admin)/staff', '02'],
  ['Attendance', 'Student and employee daily register', '/(admin)/attendance', '03'],
  ['Fees', 'Structures, receipts and payment status', '/(admin)/fees', '04'],
  ['Salary', 'Draft, finalize and record payments', '/(admin)/salary', '05'],
  ['Assessments', 'Schedules, marks and publication', '/(admin)/exams', '06'],
  ['Timetable', 'Periods, teachers and conflicts', '/(admin)/timetable', '07'],
  ['Accounts', 'Linked income and expense ledger', '/(admin)/accounts', '08'],
];

export default function Screen() {
  const router = useRouter(); const { data: students } = useStudents(); const { data: employees } = useStaff(); const { data: accounts } = useAccountsOverview(); const { data: academics } = useAcademics();
  const current = academics?.academicYears?.find((year: any) => year.isCurrent);
  return <View style={s.page}><Header title="Command centre"/><AdminNav/><ScrollView contentContainerStyle={s.content}>
    <View style={s.hero}><Text style={s.kicker}>ADMINISTRATION • {current?.name || 'ACADEMIC YEAR NOT SELECTED'}</Text><Text style={s.title}>Good decisions start with clean school data.</Text><Text style={s.copy}>A single view of admissions, attendance, money and academics—with every sensitive action enforced by the backend.</Text></View>
    <View style={s.metrics}><Metric label="Active students" value={students?.length}/><Metric label="Employees" value={employees?.length}/><Metric label="Recorded income" value={accounts ? `₹${Number(accounts.income || 0).toLocaleString('en-IN')}` : undefined}/><Metric label="Ledger balance" value={accounts ? `₹${Number(accounts.balance || 0).toLocaleString('en-IN')}` : undefined}/></View>
    <Text style={s.section}>School operations</Text><View style={s.grid}>{actions.map(([title, desc, href, no]) => <TouchableOpacity accessibilityRole="button" key={title} style={s.card} onPress={() => router.push(href as any)}><Text style={s.no}>{no}</Text><Text style={s.cardTitle}>{title}</Text><Text style={s.cardCopy}>{desc}</Text><Text style={s.open}>Open module →</Text></TouchableOpacity>)}</View>
  </ScrollView></View>;
}
function Metric({ label, value }: { label: string; value: any }) { return <View style={s.metric}><Text style={s.metricLabel}>{label}</Text><Text style={s.metricValue}>{value ?? '—'}</Text></View>; }
const s = StyleSheet.create({ page:{flex:1,backgroundColor:'#F4F1EA'},content:{padding:20,paddingBottom:50,maxWidth:1400,width:'100%',alignSelf:'center'},hero:{backgroundColor:'#0B2743',borderRadius:24,padding:30,marginBottom:16},kicker:{color:'#E6A84A',fontSize:11,fontWeight:'800',letterSpacing:1.8},title:{color:'#fff',fontSize:34,fontWeight:'800',lineHeight:40,marginVertical:12},copy:{color:'#B8CFDB',fontSize:14,lineHeight:21,maxWidth:720},metrics:{flexDirection:'row',flexWrap:'wrap',gap:12,marginBottom:28},metric:{backgroundColor:'#fff',borderRadius:16,padding:18,flex:1,minWidth:190,borderWidth:1,borderColor:'#E1DDD4'},metricLabel:{color:'#728296',fontSize:12,fontWeight:'700'},metricValue:{color:'#17324D',fontSize:24,fontWeight:'800',marginTop:5},section:{fontSize:18,fontWeight:'800',color:'#17324D',marginBottom:12},grid:{flexDirection:'row',flexWrap:'wrap',gap:12},card:{backgroundColor:'#fff',borderRadius:16,padding:18,minWidth:230,flex:1,borderWidth:1,borderColor:'#E1DDD4'},no:{color:'#C88728',fontSize:11,fontWeight:'800'},cardTitle:{fontSize:17,fontWeight:'800',color:'#17324D',marginTop:15},cardCopy:{color:'#718096',fontSize:13,lineHeight:19,marginTop:6},open:{color:'#A66B1F',fontSize:12,fontWeight:'800',marginTop:18} });

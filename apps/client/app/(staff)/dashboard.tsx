import { colors, surfaces } from '../../src/theme';
import React from 'react'; import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native'; import { useRouter } from 'expo-router'; import { useAuth } from '../../src/hooks/useAuth';
export default function Screen(){const {user}=useAuth();const router=useRouter();const tiles = [['Own attendance','Daily status and history','/(staff)/attendance'],...(user?.canMarkStudentAttendance ? [['Student attendance','Mark attendance by class and section','/(staff)/student-attendance']] : []),...(user?.canMarkEmployeeAttendance ? [['Employee attendance','Mark attendance for employees','/(staff)/employee-attendance']] : []),['Own salary','Finalized calculations and payments','/(staff)/salary'],['Teaching timetable','All assigned sections','/(staff)/timetable'],['Calendar','Monthly holidays and school dates','/(staff)/calendar'],['Notices','Employee announcements','/(staff)/notices']];return <View style={s.page}><ScrollView contentContainerStyle={s.content}><View style={s.hero}><Text style={s.eyebrow}>EMPLOYEE WORKSPACE</Text><Text style={s.title}>{user?.name}</Text><Text style={s.id}>{user?.employeeId} • Permissions and assignment scope are verified for every action.</Text></View><View style={s.grid}>{tiles.map(([title,copy,path])=><TouchableOpacity accessibilityRole="button" key={title} style={s.card} onPress={()=>router.push(path as any)}><Text style={s.cardTitle}>{title}</Text><Text style={s.copy}>{copy}</Text><Text style={s.link}>Open →</Text></TouchableOpacity>)}</View></ScrollView></View>}
const s=StyleSheet.create({page: { flex:1, backgroundColor: colors.background },
  content: { ...surfaces.content },
  hero: { ...surfaces.card, marginBottom:18, padding: 24, borderRadius: 16, backgroundColor: '#FFFFFF', flexWrap: 'wrap' },
  eyebrow: { fontWeight:'800', fontSize: 10, letterSpacing: 1.4, color: colors.blue },
  title: { marginVertical:10, fontSize: 28, color: colors.ink, fontWeight: '700' },
  id: { fontSize:13, lineHeight: 21, color: colors.muted },
  grid: { flexDirection:'row',flexWrap:'wrap',gap:14 },
  card: { ...surfaces.card, backgroundColor:'#fff',flex:1,padding:22, minWidth: 0, borderWidth: 1, borderRadius: 14, borderColor: colors.border },
  cardTitle: { fontSize:18,fontWeight:'800',color:'#203451' },
  copy: { color:'#718096',fontSize:13,marginTop:8 },
  link: { color:'#3563E9',fontWeight:'800',fontSize:12,marginTop:22 }});

import type { ViewStyle } from 'react-native';
export const colors = {
  navy: '#142640', blue: '#3563E9', background: '#F3F6FB', surface: '#FFFFFF',
  ink: '#203451', muted: '#72819A', border: '#E5EBF3', paleBlue: '#EDF2FF',
};
export const surfaces: Record<'card' | 'input' | 'content', ViewStyle> = {
  card: { borderWidth: 1, borderColor: colors.border, shadowColor: '#21385B', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.035, shadowRadius: 14, elevation: 1 },
  input: { minHeight: 46, borderWidth: 1, borderColor: '#DCE4EF', backgroundColor: '#F9FBFE', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12 },
  content: { padding: 20, paddingBottom: 48, width: '100%', maxWidth: 1440, alignSelf: 'center' },
};

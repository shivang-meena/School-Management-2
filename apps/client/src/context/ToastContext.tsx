import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated, Platform, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius } from '../theme';

export type ToastType = 'warning' | 'error' | 'success' | 'info';

export interface ToastOptions {
  id?: string;
  type?: ToastType;
  title?: string;
  message: string;
  duration?: number;
  onClose?: () => void;
}

interface ToastContextValue {
  showToast: (options: ToastOptions | string) => void;
  warning: (message: string, title?: string) => void;
  error: (message: string, title?: string) => void;
  success: (message: string, title?: string) => void;
  info: (message: string, title?: string) => void;
  hideToast: () => void;
}

const ToastContext = createContext<ToastContextValue>({
  showToast: () => {},
  warning: () => {},
  error: () => {},
  success: () => {},
  info: () => {},
  hideToast: () => {},
});

let globalShowToast: ((options: ToastOptions) => void) | null = null;

export function triggerToast(options: ToastOptions | string) {
  if (typeof options === 'string') {
    globalShowToast?.({ message: options, type: 'warning' });
  } else {
    globalShowToast?.(options);
  }
}

// Intercept Alert.alert for single-button / simple alerts
if (typeof Alert !== 'undefined' && Alert.alert) {
  const originalAlert = Alert.alert.bind(Alert);
  (Alert as any).alert = (title: string, message?: string, buttons?: any[], options?: any) => {
    // If confirmation dialog (multiple buttons), retain original behavior
    if (buttons && buttons.length > 1) {
      return originalAlert(title, message, buttons, options);
    }

    const lower = `${title || ''} ${message || ''}`.toLowerCase();
    let type: ToastType = 'warning';
    if (lower.includes('success') || lower.includes('created') || lower.includes('saved') || lower.includes('updated')) {
      type = 'success';
    } else if (lower.includes('failed') || lower.includes('could not') || lower.includes('error') || lower.includes('invalid') || lower.includes('unable')) {
      type = 'error';
    }

    const okCallback = buttons?.[0]?.onPress;

    if (globalShowToast) {
      globalShowToast({
        type,
        title: title || 'Notice',
        message: message || '',
        duration: 6000,
        onClose: okCallback,
      });
    } else {
      originalAlert(title, message, buttons, options);
    }
  };
}

// Intercept browser window.alert on web so legacy notify() calls route to toast
if (Platform.OS === 'web' && typeof window !== 'undefined' && window.alert) {
  const originalWindowAlert = window.alert.bind(window);
  (window as any).alert = (message?: any) => {
    const text = String(message || '');
    const parts = text.split('\n\n');
    const title = parts.length > 1 ? parts[0] : 'Notice';
    const body = parts.length > 1 ? parts.slice(1).join('\n\n') : parts[0];
    const lower = text.toLowerCase();
    let type: ToastType = 'warning';
    if (lower.includes('success') || lower.includes('created') || lower.includes('saved') || lower.includes('updated')) {
      type = 'success';
    } else if (lower.includes('failed') || lower.includes('could not') || lower.includes('error') || lower.includes('invalid') || lower.includes('unable') || lower.includes('missing')) {
      type = 'error';
    }

    if (globalShowToast) {
      globalShowToast({
        type,
        title,
        message: body,
        duration: 6000,
      });
    } else {
      originalWindowAlert(message);
    }
  };
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toast, setToast] = useState<ToastOptions | null>(null);
  const slideAnim = useRef(new Animated.Value(-100)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const timerRef = useRef<any>(null);

  const hideToast = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }

    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: -100,
        duration: 250,
        useNativeDriver: Platform.OS !== 'web',
      }),
      Animated.timing(opacityAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: Platform.OS !== 'web',
      }),
    ]).start(() => {
      if (toast?.onClose) {
        toast.onClose();
      }
      setToast(null);
    });
  }, [toast, slideAnim, opacityAnim]);

  const showToast = useCallback((options: ToastOptions | string) => {
    const rawOpts: ToastOptions = typeof options === 'string'
      ? { message: options, type: 'warning' }
      : options;

    let cleanMessage = '';
    if (Array.isArray(rawOpts.message)) {
      cleanMessage = (rawOpts.message as any[]).map(String).join(' | ');
    } else if (typeof rawOpts.message === 'object' && rawOpts.message !== null) {
      cleanMessage = (rawOpts.message as any).message || String(rawOpts.message);
    } else {
      cleanMessage = String(rawOpts.message || '');
    }

    const opts: ToastOptions = {
      ...rawOpts,
      message: cleanMessage,
    };

    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }

    setToast(opts);

    slideAnim.setValue(-80);
    opacityAnim.setValue(0);

    Animated.parallel([
      Animated.spring(slideAnim, {
        toValue: 0,
        friction: 8,
        tension: 60,
        useNativeDriver: Platform.OS !== 'web',
      }),
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: Platform.OS !== 'web',
      }),
    ]).start();

    const duration = opts.duration ?? 6000;
    if (duration > 0) {
      timerRef.current = setTimeout(() => {
        hideToast();
      }, duration);
    }
  }, [slideAnim, opacityAnim, hideToast]);

  useEffect(() => {
    globalShowToast = showToast;
    return () => {
      globalShowToast = null;
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [showToast]);

  const warning = useCallback((message: string, title?: string) => {
    showToast({ type: 'warning', title: title || 'Missing details', message });
  }, [showToast]);

  const error = useCallback((message: string, title?: string) => {
    showToast({ type: 'error', title: title || 'Error', message });
  }, [showToast]);

  const success = useCallback((message: string, title?: string) => {
    showToast({ type: 'success', title: title || 'Success', message });
  }, [showToast]);

  const info = useCallback((message: string, title?: string) => {
    showToast({ type: 'info', title: title || 'Information', message });
  }, [showToast]);

  const getTypeStyle = (type: ToastType = 'warning') => {
    switch (type) {
      case 'warning':
        return {
          icon: 'warning-outline' as const,
          color: '#fbbf24',
          bg: '#1e1a12',
          border: 'rgba(251, 191, 36, 0.45)',
          badgeBg: 'rgba(251, 191, 36, 0.15)',
        };
      case 'error':
        return {
          icon: 'alert-circle-outline' as const,
          color: '#f87171',
          bg: '#201215',
          border: 'rgba(248, 113, 113, 0.45)',
          badgeBg: 'rgba(248, 113, 113, 0.15)',
        };
      case 'success':
        return {
          icon: 'checkmark-circle-outline' as const,
          color: '#34d399',
          bg: '#0f2019',
          border: 'rgba(52, 211, 153, 0.45)',
          badgeBg: 'rgba(52, 211, 153, 0.15)',
        };
      case 'info':
      default:
        return {
          icon: 'information-circle-outline' as const,
          color: '#60a5fa',
          bg: '#101a2d',
          border: 'rgba(96, 165, 250, 0.45)',
          badgeBg: 'rgba(96, 165, 250, 0.15)',
        };
    }
  };

  const styleConfig = getTypeStyle(toast?.type);

  return (
    <ToastContext.Provider value={{ showToast, warning, error, success, info, hideToast }}>
      {children}
      {toast ? (
        <View style={s.overlay} pointerEvents="box-none">
          <Animated.View
            style={[
              s.toastCard,
              {
                backgroundColor: styleConfig.bg,
                borderColor: styleConfig.border,
                transform: [{ translateY: slideAnim }],
                opacity: opacityAnim,
              },
            ]}
          >
            {/* Left Icon Badge */}
            <View style={[s.iconBadge, { backgroundColor: styleConfig.badgeBg }]}>
              <Ionicons name={styleConfig.icon} size={22} color={styleConfig.color} />
            </View>

            {/* Content Text */}
            <View style={s.textContainer}>
              {toast.title ? (
                <Text style={[s.title, { color: styleConfig.color }]}>
                  {toast.title}
                </Text>
              ) : null}
              <Text style={s.message} numberOfLines={3}>
                {toast.message}
              </Text>
            </View>

            {/* Cross (✕) Dismiss Button */}
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Dismiss notification"
              onPress={hideToast}
              style={s.crossButton}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <Ionicons name="close" size={20} color="rgba(255, 255, 255, 0.75)" />
            </TouchableOpacity>
          </Animated.View>
        </View>
      ) : null}
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}

const s = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 99999999,
    alignItems: 'center',
    paddingTop: Platform.OS === 'web' ? 24 : 44,
    paddingHorizontal: 16,
  },
  toastCard: {
    width: '100%',
    maxWidth: 540,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radius.md,
    borderWidth: 1.5,
    paddingVertical: 12,
    paddingHorizontal: 14,
    gap: 12,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.45,
    shadowRadius: 18,
    elevation: 20,
  },
  iconBadge: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  textContainer: {
    flex: 1,
    justifyContent: 'center',
    gap: 2,
  },
  title: {
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  message: {
    fontSize: 13,
    color: '#e2e8f0',
    lineHeight: 18,
    fontWeight: '500',
  },
  crossButton: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
});

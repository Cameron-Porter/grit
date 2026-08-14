import { ReactNode, useEffect, useRef, useState } from 'react';
import { Animated, Modal, PanResponder, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '../utils/useColors';
import { Radius, Space } from '../utils/tokens';

interface Props {
  visible: boolean;
  onClose: () => void;
  children: ReactNode;
}

const OFFSCREEN = 700;

export default function BottomSheet({ visible, onClose, children }: Props) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [mounted, setMounted] = useState(false);
  const slideY = useRef(new Animated.Value(OFFSCREEN)).current;
  const backdropAlpha = useRef(new Animated.Value(0)).current;

  // Keep a ref so PanResponder closure never goes stale
  const onCloseRef = useRef(onClose);
  useEffect(() => { onCloseRef.current = onClose; }, [onClose]);

  useEffect(() => {
    if (visible) {
      setMounted(true);
      slideY.setValue(OFFSCREEN);
      Animated.parallel([
        Animated.spring(slideY, {
          toValue: 0,
          useNativeDriver: true,
          damping: 28,
          stiffness: 260,
          mass: 0.9,
        }),
        Animated.timing(backdropAlpha, {
          toValue: 1,
          duration: 220,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.spring(slideY, {
          toValue: OFFSCREEN,
          useNativeDriver: true,
          damping: 30,
          stiffness: 300,
        }),
        Animated.timing(backdropAlpha, {
          toValue: 0,
          duration: 180,
          useNativeDriver: true,
        }),
      ]).start(() => setMounted(false));
    }
  }, [visible]);

  const pan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, { dy }) => dy > 5,
      onPanResponderMove: (_, { dy }) => {
        if (dy > 0) slideY.setValue(dy);
      },
      onPanResponderRelease: (_, { dy, vy }) => {
        if (dy > 100 || vy > 0.8) {
          onCloseRef.current();
        } else {
          Animated.spring(slideY, {
            toValue: 0,
            useNativeDriver: true,
            damping: 28,
            stiffness: 260,
          }).start();
        }
      },
    })
  ).current;

  if (!mounted) return null;

  return (
    <Modal visible transparent animationType="none" onRequestClose={() => onCloseRef.current()} accessibilityViewIsModal>
      {/* Dimmed backdrop */}
      <Animated.View style={[StyleSheet.absoluteFill, styles.backdrop, { opacity: backdropAlpha }]} />
      {/* Tap-outside-to-close */}
      <Pressable
        style={StyleSheet.absoluteFill}
        onPress={() => onCloseRef.current()}
        accessibilityRole="button"
        accessibilityLabel="Close"
      />

      {/* Sheet — rendered after Pressable so its children win touch events */}
      <Animated.View
        style={[
          styles.sheet,
          {
            backgroundColor: colors.surface,
            paddingBottom: Math.max(insets.bottom, Space[2]),
            transform: [{ translateY: slideY }],
          },
        ]}
      >
        {/* Drag handle */}
        <View {...pan.panHandlers} style={styles.handleArea}>
          <View style={[styles.handle, { backgroundColor: colors.surface3 }]} />
        </View>
        {children}
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopLeftRadius: Radius['2xl'],
    borderTopRightRadius: Radius['2xl'],
  },
  handleArea: {
    alignItems: 'center',
    paddingTop: Space[1],
    paddingBottom: Space['0.5'],
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
  },
});

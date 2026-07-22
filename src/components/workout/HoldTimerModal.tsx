import { useEffect, useRef, useState } from 'react';
import { Modal, Pressable, Text, View } from 'react-native';
import { FontFamily, Radius, Space, TypeScale } from '../../utils/tokens';
import { useColors } from '../../utils/useColors';

interface HoldTimerModalProps {
  visible: boolean;
  onLog: (seconds: number) => void;
  onClose: () => void;
}

type Phase = 'idle' | 'running' | 'stopped';

function formatTime(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export default function HoldTimerModal({ visible, onLog, onClose }: HoldTimerModalProps) {
  const colors = useColors();
  const [elapsed, setElapsed] = useState(0);
  const [phase, setPhase] = useState<Phase>('idle');
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  function clearTimer() {
    if (intervalRef.current != null) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }

  useEffect(() => {
    if (visible) {
      clearTimer();
      setElapsed(0);
      setPhase('idle');
    } else {
      clearTimer();
    }
  }, [visible]);

  function start() {
    setPhase('running');
    intervalRef.current = setInterval(() => setElapsed((s) => s + 1), 1000);
  }

  function stop() {
    clearTimer();
    setPhase('stopped');
  }

  function restart() {
    clearTimer();
    setElapsed(0);
    setPhase('idle');
  }

  function log() {
    const secs = elapsed;
    clearTimer();
    onLog(secs);
    onClose();
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable
        style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' }}
        onPress={onClose}
      >
        {/* Inner sheet — prevent backdrop tap from closing when touching inside */}
        <Pressable
          onPress={() => {}}
          style={{
            backgroundColor: colors.surface,
            borderTopLeftRadius: Radius['2xl'],
            borderTopRightRadius: Radius['2xl'],
            paddingHorizontal: Space[3],
            paddingTop: Space[2],
            paddingBottom: Space[5],
            gap: Space[1],
          }}
        >
          {/* Handle */}
          <View style={{
            width: 36, height: 4,
            backgroundColor: colors.border,
            borderRadius: 2,
            alignSelf: 'center',
            marginBottom: Space[1],
          }} />

          {/* Title */}
          <Text style={[TypeScale.cap, {
            color: colors.muted,
            textAlign: 'center',
            letterSpacing: 1.5,
            textTransform: 'uppercase',
            marginBottom: Space[1],
          }]}>
            Hold Timer
          </Text>

          {/* Counter */}
          <Text style={{
            fontSize: 80,
            fontFamily: FontFamily.display,
            color: phase === 'running' ? colors.primary : colors.text,
            textAlign: 'center',
            letterSpacing: -2,
            paddingVertical: Space[2],
          }}>
            {formatTime(elapsed)}
          </Text>

          {/* Primary action */}
          {phase === 'idle' && (
            <Pressable
              onPress={start}
              style={{
                backgroundColor: colors.primary,
                borderRadius: Radius.xl,
                paddingVertical: 16,
                alignItems: 'center',
                marginTop: Space[1],
              }}
            >
              <Text style={{ color: '#fff', fontSize: 17, fontFamily: FontFamily.bodySemi }}>
                Start
              </Text>
            </Pressable>
          )}

          {phase === 'running' && (
            <Pressable
              onPress={stop}
              style={{
                backgroundColor: colors.error,
                borderRadius: Radius.xl,
                paddingVertical: 16,
                alignItems: 'center',
                marginTop: Space[1],
              }}
            >
              <Text style={{ color: '#fff', fontSize: 17, fontFamily: FontFamily.bodySemi }}>
                Stop
              </Text>
            </Pressable>
          )}

          {phase === 'stopped' && (
            <>
              <Pressable
                onPress={log}
                style={{
                  backgroundColor: colors.primary,
                  borderRadius: Radius.xl,
                  paddingVertical: 16,
                  alignItems: 'center',
                  marginTop: Space[1],
                }}
              >
                <Text style={{ color: '#fff', fontSize: 17, fontFamily: FontFamily.bodySemi }}>
                  Log {formatTime(elapsed)}
                </Text>
              </Pressable>
              <Pressable
                onPress={restart}
                style={{
                  borderRadius: Radius.xl,
                  paddingVertical: 12,
                  alignItems: 'center',
                }}
              >
                <Text style={{ color: colors.textSecondary, fontSize: 15, fontFamily: FontFamily.body }}>
                  Restart
                </Text>
              </Pressable>
            </>
          )}

          <Pressable onPress={onClose} style={{ paddingVertical: 8, alignItems: 'center' }}>
            <Text style={{ color: colors.textTertiary, fontSize: 14, fontFamily: FontFamily.body }}>
              Cancel
            </Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

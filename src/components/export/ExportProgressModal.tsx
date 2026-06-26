import { MaterialCommunityIcons } from '@expo/vector-icons';
import { ActivityIndicator, Modal, Pressable, Text, View } from 'react-native';
import { useExportStore } from '../../store/useExportStore';
import { useColors } from '../../utils/useColors';

export default function ExportProgressModal() {
  const { stage, message, progress, error, reset } = useExportStore();
  const colors = useColors();

  return (
    <Modal visible={stage !== 'idle'} transparent animationType="fade" statusBarTranslucent>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.65)', alignItems: 'center', justifyContent: 'center', padding: 32 }}>
        <View style={{ backgroundColor: colors.surface, borderRadius: 20, padding: 28, width: '100%', maxWidth: 340, alignItems: 'center' }}>

          {stage === 'running' && (
            <>
              <ActivityIndicator color={colors.primary} size="large" style={{ marginBottom: 20 }} />
              <Text style={{ color: colors.text, fontSize: 16, fontWeight: '700', marginBottom: 6 }}>
                Exporting Workout Data
              </Text>
              <Text style={{ color: colors.muted, fontSize: 13, textAlign: 'center', marginBottom: 20, lineHeight: 19 }}>
                {message}
              </Text>
              <View style={{ width: '100%', height: 4, backgroundColor: colors.surface2, borderRadius: 2, overflow: 'hidden' }}>
                <View style={{ width: `${Math.round(progress * 100)}%`, height: 4, backgroundColor: colors.primary, borderRadius: 2 }} />
              </View>
              <Text style={{ color: colors.muted, fontSize: 12, marginTop: 8 }}>
                {Math.round(progress * 100)}%
              </Text>
            </>
          )}

          {stage === 'done' && (
            <>
              <View style={{ width: 60, height: 60, borderRadius: 30, backgroundColor: `${colors.primary}22`, alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
                <MaterialCommunityIcons name="check-circle" size={34} color={colors.primary} />
              </View>
              <Text style={{ color: colors.text, fontSize: 17, fontWeight: '700', marginBottom: 6 }}>Export Ready</Text>
              <Text style={{ color: colors.muted, fontSize: 13, textAlign: 'center', marginBottom: 24, lineHeight: 19 }}>
                Your workout data has been packaged into a ZIP file and sent to the share sheet.
              </Text>
              <Pressable
                onPress={reset}
                style={({ pressed }) => ({
                  backgroundColor: colors.primary,
                  borderRadius: 12,
                  paddingVertical: 13,
                  paddingHorizontal: 40,
                  opacity: pressed ? 0.8 : 1,
                })}
              >
                <Text style={{ color: colors.background, fontWeight: '700', fontSize: 15 }}>Done</Text>
              </Pressable>
            </>
          )}

          {stage === 'error' && (
            <>
              <View style={{ width: 60, height: 60, borderRadius: 30, backgroundColor: '#EF444422', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
                <MaterialCommunityIcons name="alert-circle" size={34} color="#EF4444" />
              </View>
              <Text style={{ color: colors.text, fontSize: 17, fontWeight: '700', marginBottom: 6 }}>Export Failed</Text>
              <Text style={{ color: colors.muted, fontSize: 13, textAlign: 'center', marginBottom: 24, lineHeight: 19 }}>
                {error ?? 'Something went wrong. Please try again.'}
              </Text>
              <Pressable
                onPress={reset}
                style={({ pressed }) => ({
                  backgroundColor: colors.surface2,
                  borderRadius: 12,
                  paddingVertical: 13,
                  paddingHorizontal: 40,
                  opacity: pressed ? 0.8 : 1,
                })}
              >
                <Text style={{ color: colors.text, fontWeight: '700', fontSize: 15 }}>Dismiss</Text>
              </Pressable>
            </>
          )}

        </View>
      </View>
    </Modal>
  );
}

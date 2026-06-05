import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Colors } from '../../utils/constants';

interface NoteModalProps {
  visible: boolean;
  initialNote?: string;
  exerciseName: string;
  onClose: () => void;
  onSave: (note: string) => void;
}

export default function NoteModal({
  visible,
  initialNote = '',
  exerciseName,
  onClose,
  onSave,
}: NoteModalProps) {
  const [text, setText] = useState(initialNote);

  useEffect(() => {
    if (visible) setText(initialNote);
  }, [visible, initialNote]);

  const handleSave = () => {
    onSave(text.trim());
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.6)' }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={{ backgroundColor: '#1A1F26', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20 }}>
          {/* Handle */}
          <View style={{ width: 36, height: 4, backgroundColor: '#444', borderRadius: 2, alignSelf: 'center', marginBottom: 16 }} />

          {/* Header */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <Text style={{ color: Colors.text, fontSize: 18, fontWeight: '700' }}>Note</Text>
            <Pressable onPress={onClose} style={{ padding: 4 }}>
              <MaterialCommunityIcons name="close" size={22} color={Colors.muted} />
            </Pressable>
          </View>
          <Text style={{ color: Colors.muted, fontSize: 13, marginBottom: 16 }}>{exerciseName}</Text>

          {/* Input */}
          <TextInput
            value={text}
            onChangeText={setText}
            placeholder="Add a note for this exercise..."
            placeholderTextColor={Colors.muted}
            multiline
            numberOfLines={4}
            maxLength={250}
            style={{
              backgroundColor: '#252525',
              borderRadius: 10,
              padding: 14,
              color: Colors.text,
              fontSize: 15,
              minHeight: 100,
              textAlignVertical: 'top',
              marginBottom: 8,
            }}
            autoFocus
          />
          <Text style={{ color: Colors.muted, fontSize: 12, textAlign: 'right', marginBottom: 16 }}>
            {text.length}/250
          </Text>

          {/* Actions */}
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <Pressable
              onPress={onClose}
              style={{ flex: 1, padding: 14, borderRadius: 12, backgroundColor: '#252525', alignItems: 'center' }}
            >
              <Text style={{ color: Colors.muted, fontWeight: '600', fontSize: 15 }}>Cancel</Text>
            </Pressable>
            <Pressable
              onPress={handleSave}
              style={{ flex: 2, padding: 14, borderRadius: 12, backgroundColor: Colors.primary, alignItems: 'center' }}
            >
              <Text style={{ color: Colors.background, fontWeight: '700', fontSize: 15 }}>Save Note</Text>
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

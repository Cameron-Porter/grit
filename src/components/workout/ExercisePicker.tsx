import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useState } from 'react';
import {
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Colors } from '../../utils/constants';

// A mock database of exercises.
// Later, you can move this to your Supabase DB or a separate constants file.
const EXERCISE_DATABASE = [
  { id: '1', name: 'Bench Press', muscleGroup: 'Chest', equipment: 'Barbell' },
  {
    id: '2',
    name: 'Incline Dumbbell Press',
    muscleGroup: 'Chest',
    equipment: 'Dumbbell',
  },
  { id: '3', name: 'Pullup', muscleGroup: 'Back', equipment: 'Bodyweight' },
  { id: '4', name: 'Barbell Row', muscleGroup: 'Back', equipment: 'Barbell' },
  {
    id: '5',
    name: 'Overhead Press',
    muscleGroup: 'Shoulders',
    equipment: 'Barbell',
  },
  {
    id: '6',
    name: 'Lateral Raise',
    muscleGroup: 'Shoulders',
    equipment: 'Dumbbell',
  },
  { id: '7', name: 'Squat', muscleGroup: 'Legs', equipment: 'Barbell' },
  { id: '8', name: 'Leg Extension', muscleGroup: 'Legs', equipment: 'Machine' },
  { id: '9', name: 'Bicep Curl', muscleGroup: 'Arms', equipment: 'Dumbbell' },
  {
    id: '10',
    name: 'Tricep Pushdown',
    muscleGroup: 'Arms',
    equipment: 'Cable',
  },
];

interface ExercisePickerProps {
  visible: boolean;
  onClose: () => void;
  // ✅ Updated to explicitly require the muscleGroup and equipment
  onSelect: (name: string, muscleGroup: string, equipment: string) => void;
}

export default function ExercisePicker({
  visible,
  onClose,
  onSelect,
}: ExercisePickerProps) {
  const [searchQuery, setSearchQuery] = useState('');

  // Filter the list based on user search
  const filteredExercises = EXERCISE_DATABASE.filter(
    (ex) =>
      ex.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ex.muscleGroup.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  return (
    <Modal
      visible={visible}
      animationType='slide'
      presentationStyle='formSheet' // Gives that nice native iOS bottom sheet look
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        style={{ flex: 1, backgroundColor: Colors.background || '#121212' }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* HEADER */}
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: 16,
            borderBottomWidth: 1,
            borderBottomColor: '#2A2A2A',
          }}
        >
          <Text
            style={{
              color: Colors.text || 'white',
              fontSize: 20,
              fontWeight: 'bold',
            }}
          >
            Select Exercise
          </Text>
          <Pressable
            onPress={onClose}
            style={{ padding: 4 }}
          >
            <MaterialCommunityIcons
              name='close'
              size={24}
              color={Colors.text || 'white'}
            />
          </Pressable>
        </View>

        {/* SEARCH BAR */}
        <View style={{ padding: 16 }}>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: '#1E1E1E',
              borderRadius: 8,
              paddingHorizontal: 12,
            }}
          >
            <MaterialCommunityIcons
              name='magnify'
              size={20}
              color={Colors.muted || '#A0A0A0'}
            />
            <TextInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder='Search exercises or muscle groups...'
              placeholderTextColor={Colors.muted || '#A0A0A0'}
              style={{
                flex: 1,
                color: Colors.text || 'white',
                paddingVertical: 12,
                paddingHorizontal: 8,
                fontSize: 16,
              }}
              autoFocus
            />
            {searchQuery.length > 0 && (
              <Pressable onPress={() => setSearchQuery('')}>
                <MaterialCommunityIcons
                  name='close-circle'
                  size={20}
                  color={Colors.muted || '#A0A0A0'}
                />
              </Pressable>
            )}
          </View>
        </View>

        {/* EXERCISE LIST */}
        <FlatList
          data={filteredExercises}
          keyExtractor={(item) => item.id}
          keyboardShouldPersistTaps='handled'
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40 }}
          renderItem={({ item }) => (
            <Pressable
              style={({ pressed }) => ({
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
                paddingVertical: 16,
                borderBottomWidth: 1,
                borderBottomColor: '#1E1E1E',
                opacity: pressed ? 0.6 : 1,
              })}
              onPress={() => {
                // ✅ Passes all three pieces of data back to the workout screen
                onSelect(item.name, item.muscleGroup, item.equipment);
                setSearchQuery(''); // Reset search for next time
                onClose();
              }}
            >
              <View>
                <Text
                  style={{
                    color: Colors.text || 'white',
                    fontSize: 16,
                    fontWeight: '600',
                  }}
                >
                  {item.name}
                </Text>
                <Text
                  style={{
                    color: Colors.muted || '#A0A0A0',
                    fontSize: 13,
                    marginTop: 4,
                  }}
                >
                  {item.equipment}
                </Text>
              </View>

              {/* Little visual badge for the muscle group in the list */}
              <View
                style={{
                  backgroundColor: '#2A2A2A',
                  paddingVertical: 4,
                  paddingHorizontal: 8,
                  borderRadius: 4,
                }}
              >
                <Text
                  style={{
                    color: Colors.muted || '#A0A0A0',
                    fontSize: 12,
                    fontWeight: 'bold',
                  }}
                >
                  {item.muscleGroup}
                </Text>
              </View>
            </Pressable>
          )}
          ListEmptyComponent={
            <View style={{ alignItems: 'center', marginTop: 40 }}>
              <MaterialCommunityIcons
                name='dumbbell'
                size={48}
                color='#2A2A2A'
              />
              <Text
                style={{
                  color: Colors.muted || '#A0A0A0',
                  marginTop: 12,
                  fontSize: 16,
                }}
              >
                No exercises found.
              </Text>
            </View>
          }
        />
      </KeyboardAvoidingView>
    </Modal>
  );
}

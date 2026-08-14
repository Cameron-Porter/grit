import { MaterialCommunityIcons } from '@expo/vector-icons';
import { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { useColors } from '../utils/useColors';
import { FontFamily, Radius, Space } from '../utils/tokens';

// ---------------------------------------------------------------------------
// Badge
// ---------------------------------------------------------------------------

export type BadgeVariant = 'tint' | 'solid' | 'ghost';
export type BadgeSize = 'sm' | 'md';

export interface BadgeProps {
  label: string;
  color?: string;
  variant?: BadgeVariant;
  size?: BadgeSize;
  leftSlot?: ReactNode;   // e.g. PriorityBars, icon component
  style?: ViewStyle;
  uppercase?: boolean;
}

export function Badge({
  label,
  color,
  variant = 'tint',
  size = 'md',
  leftSlot,
  style,
  uppercase = true,
}: BadgeProps) {
  const colors = useColors();
  const c = color ?? colors.primary;

  const bg =
    variant === 'solid'  ? c :
    variant === 'tint'   ? `${c}20` :
    'transparent';

  const border =
    variant === 'solid'  ? undefined :
    variant === 'tint'   ? `${c}40` :
    `${c}50`;

  const textColor = variant === 'solid' ? '#FFFFFF' : c;

  const pad = size === 'sm'
    ? { paddingHorizontal: Space[1], paddingVertical: 2 }
    : { paddingHorizontal: Space[1], paddingVertical: 3 };

  const fs = size === 'sm' ? 10 : 11;

  return (
    <View
      style={[
        styles.base,
        pad,
        { backgroundColor: bg },
        border && { borderWidth: StyleSheet.hairlineWidth, borderColor: border },
        style,
      ]}
    >
      {leftSlot}
      <Text
        style={[
          styles.text,
          { color: textColor, fontSize: fs },
          uppercase && styles.upper,
        ]}
        numberOfLines={1}
      >
        {label}
      </Text>
    </View>
  );
}

// ---------------------------------------------------------------------------
// StatusBadge — convenience wrapper for ACTIVE / COMPLETE / PAUSED etc.
// ---------------------------------------------------------------------------

export function StatusBadge({ label, color, variant = 'solid' }: Pick<BadgeProps, 'label' | 'color' | 'variant'>) {
  return <Badge label={label} color={color} variant={variant} uppercase />;
}

// ---------------------------------------------------------------------------
// FilterChip — selectable pill for muscle/equipment filter rows
// ---------------------------------------------------------------------------

export interface FilterChipProps {
  label: string;
  active: boolean;
  color?: string;
  onPress: () => void;
  icon?: string;   // optional MCI icon shown before label
}

export function FilterChip({ label, active, color, onPress, icon }: FilterChipProps) {
  const colors = useColors();
  const c = color ?? colors.primary;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      accessibilityLabel={`${label}${active ? ', selected' : ''}`}
      style={({ pressed }) => [
        styles.chip,
        {
          backgroundColor: active ? `${c}20` : colors.surface,
          borderColor: active ? c : colors.separator,
          opacity: pressed ? 0.7 : 1,
        },
      ]}
    >
      {icon && (
        <MaterialCommunityIcons
          name={icon as any}
          size={13}
          color={active ? c : colors.textTertiary}
          style={{ marginRight: 4 }}
        />
      )}
      <Text style={[styles.chipText, { color: active ? c : colors.textSecondary }]}>
        {label}
      </Text>
    </Pressable>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    borderRadius: Radius.md,
    gap: 5,
  },
  text: {
    fontFamily: FontFamily.bodySemi,
    letterSpacing: 1.2,
    lineHeight: 14,
  },
  upper: {
    textTransform: 'uppercase',
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 44,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: Radius.pill,
    borderWidth: 1,
  },
  chipText: {
    fontFamily: FontFamily.bodySemi,
    fontSize: 13,
    lineHeight: 17,
  },
});

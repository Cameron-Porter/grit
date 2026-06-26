import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AdminGuard from '../../src/components/guards/AdminGuard';
import { useRetentionStore } from '../../src/store/useRetentionStore';
import { RetentionDashboardRow, RetentionStatusValue } from '../../src/types/retention';
import { useColors } from '../../src/utils/useColors';

// ── Helpers ───────────────────────────────────────────────────────────────────

function statusColor(status: RetentionStatusValue, primary: string): string {
  if (status === 'grace_period')        return '#F59E0B'; // amber
  if (status === 'archived')            return '#EF4444'; // red
  if (status === 'permanently_deleted') return '#6B7280'; // gray
  return primary;
}

function statusLabel(status: RetentionStatusValue): string {
  if (status === 'grace_period')        return 'Grace Period';
  if (status === 'archived')            return 'Archived';
  if (status === 'permanently_deleted') return 'Permanently Deleted';
  return status;
}

function fmt(iso: string | null | undefined): string {
  if (!iso) return '-';
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

// ── Summary cards ─────────────────────────────────────────────────────────────

function SummaryCards({ rows }: { rows: RetentionDashboardRow[] }) {
  const colors = useColors();
  const grace     = rows.filter((r) => r.retention_status === 'grace_period').length;
  const archived  = rows.filter((r) => r.retention_status === 'archived').length;
  const deleted   = rows.filter((r) => r.retention_status === 'permanently_deleted').length;

  const cards = [
    { label: 'Grace Period', count: grace,    color: '#F59E0B', icon: 'timer-sand' as const },
    { label: 'Archived',     count: archived,  color: '#EF4444', icon: 'archive' as const },
    { label: 'Deleted',      count: deleted,   color: '#6B7280', icon: 'delete-forever' as const },
  ];

  return (
    <View style={{ flexDirection: 'row', gap: 10, marginBottom: 20 }}>
      {cards.map(({ label, count, color, icon }) => (
        <View key={label} style={{ flex: 1, backgroundColor: colors.surface, borderRadius: 12, padding: 14, alignItems: 'center' }}>
          <MaterialCommunityIcons name={icon} size={22} color={color} />
          <Text style={{ color: colors.text, fontSize: 22, fontWeight: '800', marginTop: 6 }}>{count}</Text>
          <Text style={{ color: colors.muted, fontSize: 11, textAlign: 'center', marginTop: 2 }}>{label}</Text>
        </View>
      ))}
    </View>
  );
}

// ── Extend grace input ────────────────────────────────────────────────────────

function ExtendInput({ row, onExtend }: { row: RetentionDashboardRow; onExtend: (days: number) => void }) {
  const colors = useColors();
  const [days, setDays] = useState('');

  return (
    <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
      <TextInput
        value={days}
        onChangeText={setDays}
        placeholder="Days"
        placeholderTextColor={colors.muted}
        keyboardType="number-pad"
        style={{
          flex: 1,
          backgroundColor: colors.surface2,
          borderRadius: 8,
          paddingHorizontal: 12,
          paddingVertical: 8,
          color: colors.text,
          fontSize: 13,
        }}
      />
      <Pressable
        onPress={() => {
          const n = parseInt(days, 10);
          if (n > 0) { onExtend(n); setDays(''); }
        }}
        style={({ pressed }) => ({
          backgroundColor: '#F59E0B22',
          borderWidth: 1,
          borderColor: '#F59E0B',
          borderRadius: 8,
          paddingHorizontal: 14,
          alignItems: 'center',
          justifyContent: 'center',
          opacity: pressed ? 0.6 : 1,
        })}
      >
        <Text style={{ color: '#F59E0B', fontWeight: '700', fontSize: 12 }}>Extend</Text>
      </Pressable>
    </View>
  );
}

// ── Row card ──────────────────────────────────────────────────────────────────

function RetentionRow({ row }: { row: RetentionDashboardRow }) {
  const colors = useColors();
  const { archive, restore, permanentlyDelete, setExempt, extendGrace, actionId } = useRetentionStore();
  const [expanded, setExpanded] = useState(false);
  const busy = actionId === row.user_id;
  const color = statusColor(row.retention_status, colors.primary);
  const isDeleted = row.retention_status === 'permanently_deleted';

  return (
    <View style={{ backgroundColor: colors.surface, borderRadius: 14, marginBottom: 10, overflow: 'hidden' }}>
      {/* Main row */}
      <Pressable
        onPress={() => setExpanded((e) => !e)}
        style={({ pressed }) => ({
          padding: 14,
          flexDirection: 'row',
          alignItems: 'center',
          opacity: pressed ? 0.8 : 1,
        })}
      >
        <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: color, marginRight: 12 }} />
        <View style={{ flex: 1 }}>
          <Text style={{ color: colors.text, fontSize: 14, fontWeight: '600' }} numberOfLines={1}>
            {row.email}
          </Text>
          <Text style={{ color: colors.muted, fontSize: 11, marginTop: 2 }}>
            {statusLabel(row.retention_status)}
            {row.retention_status === 'grace_period' && ` · ${row.days_until_archive}d until archive`}
            {row.retention_status === 'archived'     && ` · ${row.days_until_deletion}d until deletion`}
          </Text>
        </View>
        {busy
          ? <ActivityIndicator color={colors.primary} size="small" />
          : <MaterialCommunityIcons name={expanded ? 'chevron-up' : 'chevron-down'} size={18} color={colors.muted} />
        }
      </Pressable>

      {/* Expanded details + actions */}
      {expanded && (
        <View style={{ borderTopWidth: 1, borderTopColor: colors.surface2, padding: 14 }}>
          {/* Timeline */}
          <View style={{ marginBottom: 14, gap: 4 }}>
            <Text style={{ color: colors.muted, fontSize: 11 }}>
              Entered retention: <Text style={{ color: colors.text }}>{fmt(row.entered_retention_at)}</Text>
            </Text>
            <Text style={{ color: colors.muted, fontSize: 11 }}>
              Archive eligible: <Text style={{ color: colors.text }}>{fmt(row.archive_eligible_at)}</Text>
              {row.archived_at && <Text style={{ color: '#EF4444' }}> (archived {fmt(row.archived_at)})</Text>}
            </Text>
            <Text style={{ color: colors.muted, fontSize: 11 }}>
              Delete eligible: <Text style={{ color: colors.text }}>{fmt(row.delete_eligible_at)}</Text>
              {row.permanently_deleted_at && <Text style={{ color: '#6B7280' }}> (deleted {fmt(row.permanently_deleted_at)})</Text>}
            </Text>
            <Text style={{ color: colors.muted, fontSize: 11 }}>
              Role: <Text style={{ color: colors.text }}>{row.role}</Text>
              {row.retention_exempt && <Text style={{ color: colors.primary }}> · Exempt</Text>}
            </Text>
          </View>

          {/* Extend grace */}
          {row.retention_status === 'grace_period' && (
            <ExtendInput row={row} onExtend={(days) => extendGrace(row.user_id, days)} />
          )}

          {/* Action buttons */}
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
            {!isDeleted && (
              <>
                {row.retention_status !== 'archived' && (
                  <ActionButton
                    label="Archive Now"
                    color="#EF4444"
                    onPress={() => archive(row.user_id)}
                    disabled={busy}
                  />
                )}
                <ActionButton
                  label="Restore"
                  color={colors.primary}
                  onPress={() => restore(row.user_id)}
                  disabled={busy}
                />
                <ActionButton
                  label="Delete Permanently"
                  color="#6B7280"
                  onPress={() => permanentlyDelete(row.user_id)}
                  disabled={busy}
                />
              </>
            )}
            <ActionButton
              label={row.retention_exempt ? 'Remove Exempt' : 'Set Exempt'}
              color="#A855F7"
              onPress={() => setExempt(row.user_id, !row.retention_exempt)}
              disabled={busy}
            />
          </View>
        </View>
      )}
    </View>
  );
}

function ActionButton({
  label, color, onPress, disabled,
}: { label: string; color: string; onPress: () => void; disabled: boolean }) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => ({
        paddingVertical: 8,
        paddingHorizontal: 14,
        borderRadius: 8,
        backgroundColor: `${color}22`,
        borderWidth: 1,
        borderColor: color,
        opacity: pressed || disabled ? 0.5 : 1,
      })}
    >
      <Text style={{ color, fontSize: 12, fontWeight: '700' }}>{label}</Text>
    </Pressable>
  );
}

// ── Screen ────────────────────────────────────────────────────────────────────

function RetentionDashboard() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { rows, loading, error, actionId, load, triggerJob } = useRetentionStore();
  const [jobRunning, setJobRunning] = useState(false);
  const [jobResult, setJobResult] = useState<Array<{ action_taken: string; affected_count: number }> | null>(null);
  const [filter, setFilter] = useState<RetentionStatusValue | 'all'>('all');

  useEffect(() => { load(); }, []);

  const filtered = filter === 'all' ? rows : rows.filter((r) => r.retention_status === filter);

  const handleRunJob = async () => {
    setJobRunning(true);
    setJobResult(null);
    const result = await triggerJob();
    setJobResult(result);
    setJobRunning(false);
  };

  const filterTabs: { key: RetentionStatusValue | 'all'; label: string }[] = [
    { key: 'all',                 label: 'All' },
    { key: 'grace_period',        label: 'Grace' },
    { key: 'archived',            label: 'Archived' },
    { key: 'permanently_deleted', label: 'Deleted' },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Header */}
      <View style={{
        paddingHorizontal: 20,
        paddingTop: insets.top + 16,
        paddingBottom: 16,
        borderBottomWidth: 1,
        borderBottomColor: colors.surface2,
        flexDirection: 'row',
        alignItems: 'center',
      }}>
        <Pressable
          onPress={() => router.canGoBack() ? router.back() : router.replace('/admin')}
          style={{ marginRight: 12, padding: 4 }}
          hitSlop={8}
        >
          <MaterialCommunityIcons name="arrow-left" size={22} color={colors.primary} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={{ color: colors.text, fontSize: 22, fontWeight: '800' }}>Retention</Text>
          <Text style={{ color: colors.muted, fontSize: 12 }}>
            {rows.length} user{rows.length !== 1 ? 's' : ''} in retention
          </Text>
        </View>
        <Pressable
          onPress={handleRunJob}
          disabled={jobRunning || loading}
          style={({ pressed }) => ({
            backgroundColor: `${colors.primary}22`,
            borderRadius: 8,
            paddingHorizontal: 12,
            paddingVertical: 8,
            opacity: pressed || jobRunning ? 0.6 : 1,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 6,
          })}
        >
          {jobRunning
            ? <ActivityIndicator color={colors.primary} size="small" />
            : <MaterialCommunityIcons name="play-circle-outline" size={16} color={colors.primary} />
          }
          <Text style={{ color: colors.primary, fontSize: 12, fontWeight: '700' }}>Run Job</Text>
        </Pressable>
      </View>

      <ScrollView
        refreshControl={<RefreshControl refreshing={loading && !jobRunning} onRefresh={load} />}
        contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 32 }}
      >
        {/* Job result banner */}
        {jobResult && (
          <View style={{ backgroundColor: `${colors.primary}22`, borderRadius: 12, padding: 14, marginBottom: 16 }}>
            <Text style={{ color: colors.primary, fontWeight: '700', marginBottom: 6 }}>Job completed</Text>
            {jobResult.map((r) => (
              <Text key={r.action_taken} style={{ color: colors.text, fontSize: 12 }}>
                {r.action_taken}: {r.affected_count} user{r.affected_count !== 1 ? 's' : ''}
              </Text>
            ))}
          </View>
        )}

        {/* Error */}
        {error && (
          <View style={{ backgroundColor: '#EF444422', borderRadius: 12, padding: 14, marginBottom: 16 }}>
            <Text style={{ color: '#EF4444', fontSize: 13 }}>{error}</Text>
          </View>
        )}

        {/* Summary cards */}
        <SummaryCards rows={rows} />

        {/* Filter tabs */}
        <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
          {filterTabs.map(({ key, label }) => (
            <Pressable
              key={key}
              onPress={() => setFilter(key)}
              style={({ pressed }) => ({
                paddingHorizontal: 14,
                paddingVertical: 7,
                borderRadius: 20,
                backgroundColor: filter === key ? colors.primary : colors.surface,
                opacity: pressed ? 0.7 : 1,
              })}
            >
              <Text style={{
                color: filter === key ? colors.background : colors.muted,
                fontSize: 13,
                fontWeight: '700',
              }}>
                {label}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* User rows */}
        {filtered.length === 0 && !loading && (
          <View style={{ alignItems: 'center', marginTop: 48 }}>
            <MaterialCommunityIcons name="check-circle-outline" size={48} color={colors.muted} />
            <Text style={{ color: colors.muted, fontSize: 14, marginTop: 12 }}>
              {filter === 'all' ? 'No users in retention' : `No users in ${statusLabel(filter as RetentionStatusValue)}`}
            </Text>
          </View>
        )}

        {filtered.map((row) => (
          <RetentionRow key={row.user_id} row={row} />
        ))}
      </ScrollView>
    </View>
  );
}

export default function RetentionScreen() {
  return (
    <AdminGuard>
      <RetentionDashboard />
    </AdminGuard>
  );
}

import SwiftUI
import WidgetKit

// MARK: - Shared types

struct WorkoutInfo: Codable {
    let programName: String
    let dayName: String
    let exerciseCount: Int
    let setsCompleted: Int
    let setsTotal: Int
}

struct WeekStats: Codable {
    let setsCompleted: Int
    let setsTarget: Int
    let workoutsCompleted: Int
    let workoutsTarget: Int
}

// MARK: - Quick Start Widget
// Taps deep-link into the app to start a new workout.

struct QuickStartEntry: TimelineEntry {
    let date: Date
}

struct QuickStartProvider: TimelineProvider {
    func placeholder(in context: Context) -> QuickStartEntry { QuickStartEntry(date: .now) }
    func getSnapshot(in context: Context, completion: @escaping (QuickStartEntry) -> Void) {
        completion(QuickStartEntry(date: .now))
    }
    func getTimeline(in context: Context, completion: @escaping (Timeline<QuickStartEntry>) -> Void) {
        completion(Timeline(entries: [QuickStartEntry(date: .now)], policy: .never))
    }
}

struct QuickStartWidgetView: View {
    var entry: QuickStartEntry

    var body: some View {
        Link(destination: URL(string: "grit://")!) {
            ZStack {
                Color.black
                VStack(spacing: 8) {
                    Image(systemName: "bolt.fill")
                        .font(.system(size: 28, weight: .bold))
                        .foregroundColor(.white)
                    VStack(spacing: 2) {
                        Text("GRIT")
                            .font(.system(size: 20, weight: .black))
                            .foregroundColor(.white)
                            .tracking(-0.5)
                        Text("START")
                            .font(.system(size: 9, weight: .bold))
                            .foregroundColor(.white.opacity(0.5))
                            .tracking(2)
                    }
                }
            }
        }
    }
}

struct QuickStartWidget: Widget {
    let kind = "GritQuickStart"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: QuickStartProvider()) { entry in
            QuickStartWidgetView(entry: entry)
                .containerBackground(.black, for: .widget)
        }
        .configurationDisplayName("Quick Start")
        .description("Tap to open GRIT and start a workout.")
        .supportedFamilies([.systemSmall])
    }
}

// MARK: - Continue Workout Widget
// Shows the active workout progress pulled from App Groups shared UserDefaults.

struct ContinueEntry: TimelineEntry {
    let date: Date
    let workout: WorkoutInfo?
}

struct ContinueProvider: TimelineProvider {
    private let defaults = UserDefaults(suiteName: "group.com.gritfitness.app")

    func placeholder(in context: Context) -> ContinueEntry {
        ContinueEntry(date: .now, workout: WorkoutInfo(
            programName: "Summer Program",
            dayName: "Push Day",
            exerciseCount: 5,
            setsCompleted: 6,
            setsTotal: 16
        ))
    }

    func getSnapshot(in context: Context, completion: @escaping (ContinueEntry) -> Void) {
        completion(ContinueEntry(date: .now, workout: loadWorkout()))
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<ContinueEntry>) -> Void) {
        let entry = ContinueEntry(date: .now, workout: loadWorkout())
        // Refresh every 5 minutes while a workout might be in progress
        let next = Calendar.current.date(byAdding: .minute, value: 5, to: .now)!
        completion(Timeline(entries: [entry], policy: .after(next)))
    }

    private func loadWorkout() -> WorkoutInfo? {
        guard let data = defaults?.data(forKey: "grit_active_workout"),
              let info = try? JSONDecoder().decode(WorkoutInfo.self, from: data) else { return nil }
        return info
    }
}

struct ContinueWidgetView: View {
    var entry: ContinueEntry

    var body: some View {
        ZStack {
            Color.black
            if let workout = entry.workout {
                Link(destination: URL(string: "grit://workout")!) {
                    activeView(workout)
                }
            } else {
                idleView
            }
        }
    }

    private func activeView(_ w: WorkoutInfo) -> some View {
        VStack(alignment: .leading, spacing: 6) {
            HStack {
                Image(systemName: "bolt.fill")
                    .font(.system(size: 11, weight: .bold))
                    .foregroundColor(Color(red: 0.28, green: 0.85, blue: 0.62))
                Text("IN PROGRESS")
                    .font(.system(size: 9, weight: .bold))
                    .foregroundColor(Color(red: 0.28, green: 0.85, blue: 0.62))
                    .tracking(1)
            }
            Text(w.dayName)
                .font(.system(size: 15, weight: .black))
                .foregroundColor(.white)
                .lineLimit(1)
            Text(w.programName)
                .font(.system(size: 10, weight: .medium))
                .foregroundColor(.white.opacity(0.5))
                .lineLimit(1)
            Spacer()
            // Progress bar
            let pct = w.setsTotal > 0 ? Double(w.setsCompleted) / Double(w.setsTotal) : 0
            GeometryReader { geo in
                ZStack(alignment: .leading) {
                    Capsule().fill(Color.white.opacity(0.15)).frame(height: 5)
                    Capsule()
                        .fill(Color(red: 0.28, green: 0.85, blue: 0.62))
                        .frame(width: geo.size.width * pct, height: 5)
                }
            }
            .frame(height: 5)
            Text("\(w.setsCompleted)/\(w.setsTotal) sets")
                .font(.system(size: 10, weight: .semibold))
                .foregroundColor(.white.opacity(0.6))
        }
        .padding(14)
    }

    private var idleView: some View {
        Link(destination: URL(string: "grit://")!) {
            VStack(spacing: 8) {
                Image(systemName: "dumbbell.fill")
                    .font(.system(size: 26, weight: .bold))
                    .foregroundColor(.white.opacity(0.5))
                Text("No active workout")
                    .font(.system(size: 10, weight: .semibold))
                    .foregroundColor(.white.opacity(0.35))
                    .multilineTextAlignment(.center)
            }
        }
    }
}

struct ContinueWorkoutWidget: Widget {
    let kind = "GritContinueWorkout"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: ContinueProvider()) { entry in
            ContinueWidgetView(entry: entry)
                .containerBackground(.black, for: .widget)
        }
        .configurationDisplayName("Continue Workout")
        .description("See your active workout progress and jump back in.")
        .supportedFamilies([.systemSmall, .systemMedium])
    }
}

// MARK: - Week Stats Widget
// Shows this week's completed sets vs target, pulled from App Groups.

struct WeekStatsEntry: TimelineEntry {
    let date: Date
    let stats: WeekStats?
}

struct WeekStatsProvider: TimelineProvider {
    private let defaults = UserDefaults(suiteName: "group.com.gritfitness.app")

    func placeholder(in context: Context) -> WeekStatsEntry {
        WeekStatsEntry(date: .now, stats: WeekStats(setsCompleted: 42, setsTarget: 60, workoutsCompleted: 3, workoutsTarget: 5))
    }

    func getSnapshot(in context: Context, completion: @escaping (WeekStatsEntry) -> Void) {
        completion(WeekStatsEntry(date: .now, stats: loadStats()))
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<WeekStatsEntry>) -> Void) {
        let entry = WeekStatsEntry(date: .now, stats: loadStats())
        let next = Calendar.current.date(byAdding: .hour, value: 1, to: .now)!
        completion(Timeline(entries: [entry], policy: .after(next)))
    }

    private func loadStats() -> WeekStats? {
        guard let data = defaults?.data(forKey: "grit_week_stats"),
              let stats = try? JSONDecoder().decode(WeekStats.self, from: data) else { return nil }
        return stats
    }
}

struct WeekStatsWidgetView: View {
    var entry: WeekStatsEntry

    private let accent = Color(red: 0.28, green: 0.85, blue: 0.62)

    var body: some View {
        Link(destination: URL(string: "grit://(tabs)/history")!) {
            ZStack {
                Color.black
                if let stats = entry.stats {
                    VStack(alignment: .leading, spacing: 8) {
                        Text("THIS WEEK")
                            .font(.system(size: 9, weight: .bold))
                            .foregroundColor(.white.opacity(0.4))
                            .tracking(1.5)
                        Spacer()
                        HStack(alignment: .bottom, spacing: 4) {
                            Text("\(stats.setsCompleted)")
                                .font(.system(size: 32, weight: .black))
                                .foregroundColor(.white)
                            Text("/\(stats.setsTarget)")
                                .font(.system(size: 16, weight: .bold))
                                .foregroundColor(.white.opacity(0.4))
                                .padding(.bottom, 4)
                        }
                        Text("sets completed")
                            .font(.system(size: 10, weight: .medium))
                            .foregroundColor(.white.opacity(0.5))
                        // Progress bar
                        let pct = stats.setsTarget > 0 ? min(1.0, Double(stats.setsCompleted) / Double(stats.setsTarget)) : 0
                        GeometryReader { geo in
                            ZStack(alignment: .leading) {
                                Capsule().fill(Color.white.opacity(0.12)).frame(height: 5)
                                Capsule()
                                    .fill(accent)
                                    .frame(width: geo.size.width * pct, height: 5)
                            }
                        }
                        .frame(height: 5)
                        Text("\(stats.workoutsCompleted)/\(stats.workoutsTarget) workouts")
                            .font(.system(size: 10, weight: .semibold))
                            .foregroundColor(accent)
                    }
                    .padding(14)
                } else {
                    VStack(spacing: 6) {
                        Image(systemName: "chart.bar.fill")
                            .font(.system(size: 22, weight: .bold))
                            .foregroundColor(.white.opacity(0.3))
                        Text("Open GRIT to\nsee your stats")
                            .font(.system(size: 10, weight: .medium))
                            .foregroundColor(.white.opacity(0.3))
                            .multilineTextAlignment(.center)
                    }
                }
            }
        }
    }
}

struct WeekStatsWidget: Widget {
    let kind = "GritWeekStats"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: WeekStatsProvider()) { entry in
            WeekStatsWidgetView(entry: entry)
                .containerBackground(.black, for: .widget)
        }
        .configurationDisplayName("Week Stats")
        .description("Track your weekly sets and workouts at a glance.")
        .supportedFamilies([.systemSmall, .systemMedium])
    }
}

// MARK: - Widget Bundle

@main
struct GritWidgetBundle: WidgetBundle {
    var body: some Widget {
        QuickStartWidget()
        ContinueWorkoutWidget()
        WeekStatsWidget()
    }
}

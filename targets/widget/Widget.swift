import SwiftUI
import WidgetKit

// Garden state written by the app via ExtensionStorage (see
// src/features/widget/widget-state.ts). Keys: gardenStatus ("thriving" |
// "needs_water" | "empty"), attentionPlantName, attentionDreamId.

private let appGroup = "group.com.bloomwish.app"

struct GardenEntry: TimelineEntry {
  let date: Date
  let status: String
  let plantName: String?
  let dreamId: String?
}

struct GardenProvider: TimelineProvider {
  func placeholder(in context: Context) -> GardenEntry {
    GardenEntry(date: Date(), status: "thriving", plantName: nil, dreamId: nil)
  }

  func getSnapshot(in context: Context, completion: @escaping (GardenEntry) -> Void) {
    completion(loadEntry())
  }

  func getTimeline(in context: Context, completion: @escaping (Timeline<GardenEntry>) -> Void) {
    // Refresh a few times a day within platform budgets; the app also
    // reloads timelines whenever garden state changes.
    let next = Calendar.current.date(byAdding: .hour, value: 4, to: Date())!
    completion(Timeline(entries: [loadEntry()], policy: .after(next)))
  }

  private func loadEntry() -> GardenEntry {
    let defaults = UserDefaults(suiteName: appGroup)
    return GardenEntry(
      date: Date(),
      status: defaults?.string(forKey: "gardenStatus") ?? "empty",
      plantName: defaults?.string(forKey: "attentionPlantName"),
      dreamId: defaults?.string(forKey: "attentionDreamId")
    )
  }
}

struct GardenWidgetView: View {
  var entry: GardenEntry
  @Environment(\.widgetFamily) var family

  private var deepLink: URL {
    if let dreamId = entry.dreamId, entry.status == "needs_water" {
      return URL(string: "bloomwish://water?dreamId=\(dreamId)")!
    }
    return URL(string: "bloomwish://")!
  }

  private var headline: String {
    switch entry.status {
    case "needs_water": return "Needs a little water"
    case "thriving": return "Your garden is thriving"
    default: return "Plant your first dream"
    }
  }

  private var glyph: String {
    switch entry.status {
    case "needs_water": return "💧"
    case "thriving": return "🌸"
    default: return "🌱"
    }
  }

  var body: some View {
    VStack(alignment: .leading, spacing: 6) {
      HStack {
        Text("✦").foregroundColor(Color("$widgetAccent"))
        Text("bloomwish")
          .font(.caption2)
          .foregroundColor(.white.opacity(0.8))
        Spacer()
      }
      Spacer()
      Text(glyph).font(family == .systemSmall ? .title : .largeTitle)
      Text(headline)
        .font(family == .systemSmall ? .caption : .headline)
        .foregroundColor(.white)
        .lineLimit(2)
      if family != .systemSmall, let plantName = entry.plantName, entry.status == "needs_water" {
        Text(plantName)
          .font(.caption)
          .foregroundColor(.white.opacity(0.85))
          .lineLimit(1)
      }
    }
    .padding(4)
    .widgetURL(deepLink)
    .containerBackground(Color("$widgetBackground"), for: .widget)
  }
}

struct BloomwishWidget: Widget {
  var body: some WidgetConfiguration {
    StaticConfiguration(kind: "BloomwishWidget", provider: GardenProvider()) { entry in
      GardenWidgetView(entry: entry)
    }
    .configurationDisplayName("Garden")
    .description("Your garden at a glance — and the dream that needs you most.")
    .supportedFamilies([.systemSmall, .systemMedium])
  }
}

@main
struct BloomwishWidgetBundle: WidgetBundle {
  var body: some Widget {
    BloomwishWidget()
  }
}

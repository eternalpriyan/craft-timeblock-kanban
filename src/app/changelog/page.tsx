import Link from "next/link";

interface Release {
  version: string;
  date: string;
  title: string;
  changes: {
    type: 'added' | 'changed' | 'fixed' | 'removed';
    items: string[];
  }[];
}

const releases: Release[] = [
  {
    version: "1.0.0",
    date: "2025-12-31",
    title: "Initial Release",
    changes: [
      {
        type: 'added',
        items: [
          "Timeblock view with drag-to-move and resize-to-adjust",
          "Tasks Kanban view (Inbox, Backlog, Today)",
          "Week Kanban view with 7-day layout",
          "Calendar date picker with quick buttons",
          "Keyboard shortcuts (V, Space, R, S, L)",
          "Icon-based view switcher",
          "Mobile device detection and blocker",
          "Dark mode support with system preference",
          "Split-knowledge authentication for security",
        ],
      },
      {
        type: 'fixed',
        items: [
          "Timezone handling for date operations",
          "Task card text overflow with long content",
          "Date display format (human-readable)",
        ],
      },
    ],
  },
];

const typeLabels = {
  added: { label: 'Added', color: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' },
  changed: { label: 'Changed', color: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400' },
  fixed: { label: 'Fixed', color: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400' },
  removed: { label: 'Removed', color: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400' },
};

export default function ChangelogPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-2xl mx-auto px-6 py-12">
        {/* Header */}
        <div className="mb-12">
          <Link
            href="/"
            className="text-sm text-slate-500 dark:text-zinc-400 hover:text-slate-700 dark:hover:text-zinc-300 transition-colors"
          >
            &larr; Back
          </Link>
          <h1 className="mt-4 text-3xl font-bold text-slate-900 dark:text-white">
            Changelog
          </h1>
          <p className="mt-2 text-slate-600 dark:text-zinc-400">
            All notable changes to Craft-sama
          </p>
        </div>

        {/* Releases */}
        <div className="space-y-12">
          {releases.map((release) => (
            <article key={release.version} className="relative">
              {/* Version badge */}
              <div className="flex items-baseline gap-3 mb-4">
                <span className="text-xl font-semibold text-slate-900 dark:text-white">
                  v{release.version}
                </span>
                <span className="text-sm text-slate-500 dark:text-zinc-500">
                  {release.date}
                </span>
              </div>

              {/* Title */}
              <h2 className="text-lg font-medium text-slate-800 dark:text-zinc-200 mb-4">
                {release.title}
              </h2>

              {/* Changes by type */}
              <div className="space-y-4">
                {release.changes.map((group) => (
                  <div key={group.type}>
                    <span className={`inline-block px-2 py-0.5 text-xs font-medium rounded ${typeLabels[group.type].color}`}>
                      {typeLabels[group.type].label}
                    </span>
                    <ul className="mt-2 space-y-1">
                      {group.items.map((item, i) => (
                        <li key={i} className="text-sm text-slate-600 dark:text-zinc-400 flex items-start gap-2">
                          <span className="text-slate-400 dark:text-zinc-600 mt-1.5">•</span>
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </article>
          ))}
        </div>

        {/* Footer */}
        <div className="mt-16 pt-8 border-t border-slate-200 dark:border-zinc-800 text-center text-sm text-slate-500 dark:text-zinc-500">
          <a
            href="https://github.com/eternalpriyan/craft-timeblock-kanban/releases"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-slate-700 dark:hover:text-zinc-300 transition-colors"
          >
            View all releases on GitHub &rarr;
          </a>
        </div>
      </div>
    </div>
  );
}

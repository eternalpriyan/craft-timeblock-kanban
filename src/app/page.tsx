import Link from "next/link";

export default function Home() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <main className="flex flex-col items-center gap-8 px-6 text-center">
        <div className="space-y-4">
          <h1 className="text-4xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-5xl">
            Craft-sama
          </h1>
          <p className="max-w-md text-lg text-slate-600 dark:text-slate-400">
            Timeblock and Kanban views for your Craft daily notes
          </p>
        </div>

        <Link
          href="/login"
          className="rounded-full bg-slate-900 px-8 py-3 text-sm font-medium text-white transition-colors hover:bg-slate-700 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200"
        >
          Get Started
        </Link>
      </main>
    </div>
  );
}

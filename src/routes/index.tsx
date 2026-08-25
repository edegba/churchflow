import { createFileRoute, Link } from "@tanstack/react-router";
import { Church, Radar, ShieldCheck, Smartphone, Users, HeartHandshake } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "ChurchFlow — Church member care that misses nobody" },
      {
        name: "description",
        content:
          "ChurchFlow helps churches track members, first timers, follow-ups and attendance so nobody quietly falls through the cracks.",
      },
      { property: "og:title", content: "ChurchFlow — Church member care that misses nobody" },
      {
        property: "og:description",
        content:
          "ChurchFlow helps churches track members, first timers, follow-ups and attendance so nobody quietly falls through the cracks.",
      },
    ],
  }),
  component: Landing,
});

const features = [
  {
    icon: Radar,
    title: "Care Radar",
    body: "Surface members who have gone quiet before they drift away.",
  },
  {
    icon: Users,
    title: "One member record",
    body: "Members, first timers, groups and departments in a single place.",
  },
  {
    icon: HeartHandshake,
    title: "Follow-up that closes",
    body: "Assign follow-ups to your team and see what actually got done.",
  },
  {
    icon: ShieldCheck,
    title: "Private by design",
    body: "Every church gets an isolated workspace secured at the database level.",
  },
  {
    icon: Smartphone,
    title: "Built for phones",
    body: "Designed mobile-first for administrators who work from a phone.",
  },
];

function Landing() {
  return (
    <div className="min-h-screen bg-background">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-5 sm:px-6">
        <div className="flex items-center gap-2">
          <span className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Church className="size-5" aria-hidden="true" />
          </span>
          <span className="font-display text-lg font-semibold">ChurchFlow</span>
        </div>
        <Button asChild size="sm">
          <Link to="/auth">Sign in</Link>
        </Button>
      </header>

      <main>
        <section className="mx-auto w-full max-w-6xl px-4 pb-16 pt-10 sm:px-6 sm:pt-16">
          <p className="inline-flex rounded-full border border-border bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
            Church management &amp; member care
          </p>
          <h1 className="mt-5 max-w-3xl font-display text-3xl font-semibold leading-tight sm:text-5xl">
            Make sure nobody in the church quietly falls through the cracks.
          </h1>
          <p className="mt-4 max-w-2xl text-base text-muted-foreground sm:text-lg">
            ChurchFlow gives your pastoral team one clear view of members, first timers, follow-ups
            and attendance — so care happens on purpose, not by accident.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Button asChild size="lg">
              <Link to="/auth">Create your church workspace</Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link to="/auth">I already have an account</Link>
            </Button>
          </div>
        </section>

        <section
          aria-label="What ChurchFlow does"
          className="border-t border-border bg-card/60 py-14"
        >
          <div className="mx-auto grid w-full max-w-6xl gap-4 px-4 sm:grid-cols-2 sm:px-6 lg:grid-cols-3">
            {features.map(({ icon: Icon, title, body }) => (
              <div
                key={title}
                className="rounded-xl border border-border bg-card p-5 shadow-[var(--shadow-card)]"
              >
                <span className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Icon className="size-4" aria-hidden="true" />
                </span>
                <h2 className="mt-4 text-base font-semibold">{title}</h2>
                <p className="mt-1 text-sm text-muted-foreground">{body}</p>
              </div>
            ))}
          </div>
        </section>
      </main>

      <footer className="mx-auto w-full max-w-6xl px-4 py-8 text-sm text-muted-foreground sm:px-6">
        ChurchFlow — built for churches in Nigeria and beyond.
      </footer>
    </div>
  );
}

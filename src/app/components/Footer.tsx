export function Footer() {
  return (
    <footer className="flex items-center justify-between px-6 py-3 border-t border-border bg-white text-sm text-muted-foreground">
      <div className="flex items-center gap-2">
        <span>Build: v0.1.0-prototype</span>
        <span>&middot;</span>
        <span>Environment: Development</span>
      </div>
      <div className="flex items-center gap-2">
        <span>System Status: Operational</span>
        <span>&middot;</span>
        <span>Last Updated: 3/6/2026</span>
      </div>
    </footer>
  );
}

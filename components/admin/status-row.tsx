export function StatusRow({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b py-2 last:border-b-0">
      <dt className="text-muted-foreground text-sm">{label}</dt>
      <dd className={mono ? "font-mono text-xs" : "text-sm font-medium"}>{value}</dd>
    </div>
  )
}

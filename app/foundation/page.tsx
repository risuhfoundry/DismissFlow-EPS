"use client";

import { useState, type ReactNode } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { Page, Section, CardGrid, Stack, Inline } from "@/components/layout/Page";
import { Card, CardHeader, CardContent, CardFooter } from "@/components/ui/Card";
import { Button, PrimaryButton, GhostButton, DangerButton } from "@/components/ui/Button";
import { IconButton } from "@/components/ui/IconButton";
import { Icon } from "@/components/ui/Icon";
import { Input } from "@/components/ui/Input";
import { PasswordInput } from "@/components/ui/PasswordInput";
import { Textarea } from "@/components/ui/Textarea";
import { Select } from "@/components/ui/Select";
import { Checkbox } from "@/components/ui/Checkbox";
import { Radio } from "@/components/ui/Radio";
import { Label } from "@/components/ui/Label";
import { Alert } from "@/components/ui/Alert";
import { Badge } from "@/components/ui/Badge";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { StatusPill } from "@/components/ui/StatusPill";
import type { DismissalStatus } from "@/lib/dismissal/state";
import { Avatar } from "@/components/ui/Avatar";
import { Divider } from "@/components/ui/Divider";
import { Stat, StatCard } from "@/components/ui/Stat";
import { Skeleton, SkeletonText } from "@/components/ui/Skeleton";
import { EmptyState, LoadingState } from "@/components/ui/StateBlock";
import { ErrorState } from "@/components/ui/ErrorState";
import { Table, Th, Td, Tr } from "@/components/ui/Table";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { Modal } from "@/components/ui/Modal";
import { Drawer } from "@/components/ui/Drawer";
import { Dropdown } from "@/components/ui/Dropdown";
import { Tooltip } from "@/components/ui/Tooltip";
import { Tabs } from "@/components/ui/Tabs";
import { useToast } from "@/components/ui/Toast";
import type { NavConfig } from "@/components/layout/navigation";

/* ---- Showcase navigation (in-page hash anchors) ---------------------------- */
const NAV: NavConfig = [
  {
    label: "Design",
    items: [
      { label: "Foundations", href: "#foundations", icon: "grid" },
      { label: "Buttons", href: "#buttons", icon: "arrow.right" },
      { label: "Forms", href: "#forms", icon: "clipboard" },
      { label: "Feedback", href: "#feedback", icon: "bell" }
    ]
  },
  {
    label: "Components",
    items: [
      { label: "Surfaces", href: "#surfaces", icon: "grid" },
      { label: "Status", href: "#status", icon: "activity" },
      { label: "Data", href: "#data", icon: "history" },
      { label: "Overlays", href: "#overlays", icon: "scan" },
      { label: "States", href: "#states", icon: "info" }
    ]
  }
];

const SAMPLE_USER = { name: "J. Staff", role: "admin" as const };

/* ---- DismissFlow status language ------------------------------------------- */
const DISMISSAL_STATES: DismissalStatus[] = [
  "REQUESTED",
  "AWAITING_TEACHER",
  "DISMISSED",
  "REJECTED",
  "CANCELLED",
  "EXPIRED"
];

const EXAMPLE_ROWS = [
  { ref: "REF-001", label: "Example A", state: "Active" },
  { ref: "REF-002", label: "Example B", state: "Pending" },
  { ref: "REF-003", label: "Example C", state: "Closed" }
];

/* ---- Small helpers -------------------------------------------------------- */
function Demo({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
  return (
    <Card tone="default">
      <CardHeader title={title} description={description} />
      <CardContent>
        <div className="flex flex-wrap items-center gap-3">{children}</div>
      </CardContent>
    </Card>
  );
}

function Swatch({ name, className }: { name: string; className: string }) {
  return (
    <div className="flex flex-col gap-2">
      <div className={`h-14 w-full rounded-lg border border-border ${className}`} />
      <p className="text-xs font-semibold text-foreground">{name}</p>
    </div>
  );
}

const TYPE_SCALE: { name: string; cls: string }[] = [
  { name: "Display", cls: "text-display" },
  { name: "H1", cls: "text-h1" },
  { name: "H2", cls: "text-h2" },
  { name: "H3", cls: "text-h3" },
  { name: "H4", cls: "text-h4" },
  { name: "Body large", cls: "text-body-lg" },
  { name: "Body", cls: "text-base" },
  { name: "Body small", cls: "text-sm" },
  { name: "Caption", cls: "text-caption" },
  { name: "Label", cls: "text-label" },
  { name: "Overline", cls: "text-overline uppercase" }
];

const RADIUS = [
  { r: "sm", cls: "rounded-sm" },
  { r: "md", cls: "rounded-md" },
  { r: "lg", cls: "rounded-lg" },
  { r: "xl", cls: "rounded-xl" },
  { r: "2xl", cls: "rounded-2xl" },
  { r: "pill", cls: "rounded-full" }
];

const SHADOWS = [
  { s: "card", cls: "shadow-card" },
  { s: "popover", cls: "shadow-popover" },
  { s: "focus", cls: "shadow-focus" }
];

const SPACING = [
  { px: 4, cls: "h-4" },
  { px: 8, cls: "h-8" },
  { px: 12, cls: "h-12" },
  { px: 16, cls: "h-16" },
  { px: 24, cls: "h-24" },
  { px: 32, cls: "h-32" }
];

export default function FoundationShowcase() {
  return (
    <AppShell user={SAMPLE_USER} schoolName="Example School" navSections={NAV}>
      <ShowcaseBody />
    </AppShell>
  );
}

function ShowcaseBody() {
  const toast = useToast();
  const [modal, setModal] = useState(false);
  const [drawer, setDrawer] = useState(false);
  const [loading, setLoading] = useState(false);
  const [invalid, setInvalid] = useState(false);
  const [valid, setValid] = useState(false);

  const columns: Column<(typeof EXAMPLE_ROWS)[number]>[] = [
    { key: "ref", header: "Reference", render: (r) => <span className="font-medium">{r.ref}</span> },
    { key: "label", header: "Label" },
    {
      key: "state",
      header: "State",
      render: (r) => (
        <StatusBadge tone={r.state === "Active" ? "success" : r.state === "Pending" ? "warning" : "neutral"}>
          {r.state}
        </StatusBadge>
      )
    }
  ];

  return (
    <>
    <Page
      title="Design System"
      description="The DismissFlow visual design language — a calm, premium, accessible foundation shared by every future role phase."
    >
      {/* FOUNDATIONS */}
      <Section id="foundations" title="Foundations">
        <Card tone="default">
          <CardHeader title="Color tokens" description="Semantic, not page-specific. One source of truth." />
          <CardContent className="space-y-6">
            <div>
              <p className="mb-3 text-label text-foreground">Canvas &amp; surfaces</p>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
                <Swatch name="background" className="bg-background" />
                <Swatch name="surface-subtle" className="bg-surface-subtle" />
                <Swatch name="surface-elevated (card)" className="bg-card" />
                <Swatch name="border" className="bg-border" />
                <Swatch name="border-strong" className="bg-border-strong" />
                <Swatch name="text-primary" className="bg-foreground" />
              </div>
            </div>
            <div>
              <p className="mb-3 text-label text-foreground">Text</p>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-3">
                <Swatch name="text-primary" className="bg-foreground" />
                <Swatch name="text-secondary" className="bg-content-secondary" />
                <Swatch name="text-muted" className="bg-muted-foreground" />
              </div>
            </div>
            <div>
              <p className="mb-3 text-label text-foreground">Intent &amp; feedback</p>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
                <Swatch name="primary" className="bg-primary" />
                <Swatch name="primary-hover" className="bg-primary-hover" />
                <Swatch name="primary-active" className="bg-primary-active" />
                <Swatch name="primary-subtle" className="bg-primary-subtle" />
                <Swatch name="success" className="bg-success" />
                <Swatch name="success-subtle" className="bg-success-subtle" />
                <Swatch name="warning" className="bg-warning" />
                <Swatch name="warning-subtle" className="bg-warning-subtle" />
                <Swatch name="danger" className="bg-destructive" />
                <Swatch name="danger-subtle" className="bg-destructive-subtle" />
                <Swatch name="info" className="bg-info" />
                <Swatch name="info-subtle" className="bg-info-subtle" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card tone="default">
          <CardHeader title="Typography" description="Clear hierarchy. No oversized headings." />
          <CardContent className="space-y-3">
            {TYPE_SCALE.map((t) => (
              <div key={t.name} className="flex items-baseline gap-4 border-b border-border pb-2 last:border-0">
                <span className="w-28 shrink-0 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {t.name}
                </span>
                <p className={`${t.cls} text-foreground`}>The quick brown fox jumps</p>
              </div>
            ))}
          </CardContent>
        </Card>

        <CardGrid cols="3">
          <Card tone="default">
            <CardHeader title="Spacing" />
            <CardContent>
              <div className="flex flex-wrap items-end gap-3">
                {SPACING.map((s) => (
                  <div key={s.px} className="flex flex-col items-center gap-2">
                    <div className={`w-10 bg-primary/20 ${s.cls}`} />
                    <span className="text-xs text-muted-foreground">{s.px}px</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
          <Card tone="default">
            <CardHeader title="Radius" />
            <CardContent>
              <div className="flex flex-wrap items-end gap-4">
                {RADIUS.map(({ r, cls }) => (
                  <div key={r} className="flex flex-col items-center gap-2">
                    <div className={`h-10 w-10 bg-primary/20 border border-border ${cls}`} />
                    <span className="text-xs text-muted-foreground">r-{r}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
          <Card tone="default">
            <CardHeader title="Shadow" />
            <CardContent>
              <div className="flex flex-wrap items-end gap-4">
                {SHADOWS.map(({ s, cls }) => (
                  <div key={s} className="flex flex-col items-center gap-2">
                    <div className={`h-12 w-12 rounded-lg bg-card ${cls}`} />
                    <span className="text-xs text-muted-foreground">{s}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </CardGrid>
      </Section>

      {/* BUTTONS */}
      <Section id="buttons" title="Buttons">
        <Demo title="Variants">
          <Button variant="primary">Primary</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="outline">Outline</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="danger">Danger</Button>
        </Demo>
        <Demo title="Sizes & icons">
          <Button size="sm" leftIcon={<Icon name="plus" className="h-4 w-4" />}>Small</Button>
          <Button size="md" rightIcon={<Icon name="arrow.right" className="h-4 w-4" />}>Medium</Button>
          <Button size="lg">Large</Button>
        </Demo>
        <Demo title="States">
          <Button loading>Saving</Button>
          <Button disabled>Disabled</Button>
          <Button variant="outline" loading>Loading</Button>
          <IconButton ariaLabel="Add" variant="subtle"><Icon name="plus" className="h-5 w-5" /></IconButton>
          <IconButton ariaLabel="More"><Icon name="more" className="h-5 w-5" /></IconButton>
        </Demo>
        <Demo title="Duplicate-submit guard">
          <Button
            loading={loading}
            onClick={() => {
              setLoading(true);
              window.setTimeout(() => setLoading(false), 1500);
            }}
          >
            {loading ? "Submitting…" : "Submit once"}
          </Button>
        </Demo>
      </Section>

      {/* FORMS */}
      <Section id="forms" title="Form controls">
        <Card tone="default">
          <CardContent className="grid gap-5 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Label htmlFor="f-name" required>Full name</Label>
              <Input id="f-name" placeholder="e.g. Jordan Mercer" />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="f-email" hint="We'll never share this address.">Email</Label>
              <Input id="f-email" type="email" placeholder="name@school.edu" invalid={invalid} valid={valid} />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="f-pass">Password</Label>
              <PasswordInput id="f-pass" placeholder="Enter password" />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="f-role">Role</Label>
              <Select id="f-role" defaultValue="">
                <option value="" disabled>Select a role…</option>
                <option value="parent">Parent</option>
                <option value="teacher">Teacher</option>
                <option value="gate">Gate</option>
                <option value="admin">Admin</option>
              </Select>
            </div>
            <div className="flex flex-col gap-2 sm:col-span-2">
              <Label htmlFor="f-note">Note</Label>
              <Textarea id="f-note" placeholder="Optional details…" />
            </div>
            <div className="flex flex-col gap-3 sm:col-span-2">
              <Checkbox label="Notify me when a request is approved" defaultChecked />
              <Checkbox label="Send a daily summary" />
              <Inline gap={6}>
                <Radio name="mode" label="Pickup" defaultChecked />
                <Radio name="mode" label="Walker" />
                <Radio name="mode" label="Bus" />
              </Inline>
              <Inline gap={3}>
                <Button variant="outline" size="sm" onClick={() => setInvalid((v) => !v)}>Toggle invalid</Button>
                <Button variant="outline" size="sm" onClick={() => setValid((v) => !v)}>Toggle valid</Button>
              </Inline>
            </div>
          </CardContent>
        </Card>
      </Section>

      {/* FEEDBACK */}
      <Section id="feedback" title="Feedback">
        <Card tone="default">
          <CardContent className="space-y-3">
            <Alert tone="success" title="Saved">Your changes were saved successfully.</Alert>
            <Alert tone="info" title="Heads up">Pickup window opens at 3:00 PM.</Alert>
            <Alert tone="warning" title="Almost full">Only 3 spaces remain for today.</Alert>
            <Alert tone="error" title="Couldn't save">Check the highlighted fields and try again.</Alert>
          </CardContent>
        </Card>
        <Demo title="Toasts">
          <Button onClick={() => toast.toast({ tone: "success", title: "Request submitted" })}>Success toast</Button>
          <Button variant="outline" onClick={() => toast.toast({ tone: "error", title: "Action failed", description: "Please retry." })}>Error toast</Button>
          <Button variant="ghost" onClick={() => toast.toast({ tone: "info", title: "Synced" })}>Info toast</Button>
        </Demo>
      </Section>

      {/* SURFACES */}
      <Section id="surfaces" title="Surfaces & badges">
        <CardGrid cols="3">
          <Stat label="Active requests" value={12} hint="Updated just now" />
          <Stat label="Released today" value={84} trend={{ value: "8%", direction: "up", tone: "success" }} />
          <Stat label="Pending review" value={3} trend={{ value: "2", direction: "down", tone: "neutral" }} />
        </CardGrid>
        <Demo title="Badges">
          <Badge tone="neutral">Neutral</Badge>
          <Badge tone="primary" dot>Primary</Badge>
          <Badge tone="success">Success</Badge>
          <Badge tone="warning">Warning</Badge>
          <Badge tone="danger">Danger</Badge>
          <Badge tone="info">Info</Badge>
        </Demo>
        <Demo title="Status badges">
          <StatusBadge tone="neutral">Idle</StatusBadge>
          <StatusBadge tone="primary">Processing</StatusBadge>
          <StatusBadge tone="info">Awaiting</StatusBadge>
          <StatusBadge tone="success" pulse>Live</StatusBadge>
          <StatusBadge tone="warning">Delayed</StatusBadge>
          <StatusBadge tone="danger">Rejected</StatusBadge>
        </Demo>
        <Demo title="Avatars">
          <Avatar name="Jordan Mercer" />
          <Avatar name="Ada Lovelace" size="lg" />
          <Avatar name="Grace Hopper" size="sm" />
          <Avatar name="Staff" size="xs" />
        </Demo>
        <CardGrid cols="2">
          <Card tone="interactive" className="cursor-pointer">
            <CardHeader title="Interactive card" description="Hover to lift." />
            <CardContent><p className="text-sm text-muted-foreground">Cards use one surface language. Elevation comes from a soft shadow.</p></CardContent>
          </Card>
          <Card tone="selected">
            <CardHeader title="Selected card" description="Primary ring." />
            <CardContent><p className="text-sm text-muted-foreground">Used to mark a chosen item.</p></CardContent>
          </Card>
          <Card tone="success">
            <CardHeader title="Success card" />
            <CardContent><p className="text-sm text-muted-foreground">Positive emphasis.</p></CardContent>
          </Card>
          <Card tone="danger">
            <CardHeader title="Danger card" />
            <CardContent><p className="text-sm text-muted-foreground">Destructive emphasis.</p></CardContent>
          </Card>
          <Card tone="muted">
            <CardHeader title="Muted card" />
            <CardContent><p className="text-sm text-muted-foreground">Recessed, low-emphasis surface.</p></CardContent>
          </Card>
          <Card tone="soft">
            <CardHeader title="Soft card" />
            <CardContent><p className="text-sm text-muted-foreground">Subtle tinted surface.</p></CardContent>
          </Card>
        </CardGrid>
        <Card tone="default">
          <CardHeader title="Card with header, content, footer" action={<Badge tone="primary">New</Badge>} />
          <CardContent>
            <p className="text-sm text-muted-foreground">Borders are subtle; elevation comes from a soft shadow.</p>
          </CardContent>
          <CardFooter>
            <GhostButton size="sm">Cancel</GhostButton>
            <Button size="sm">Confirm</Button>
          </CardFooter>
        </Card>
        <Card tone="default">
          <CardContent>
            <div className="flex items-center gap-3">
              <span className="text-sm text-muted-foreground">Before</span>
              <Divider className="flex-1" />
              <span className="text-sm text-muted-foreground">After</span>
            </div>
          </CardContent>
        </Card>
      </Section>

      {/* STATUS — DismissFlow states */}
      <Section id="status" title="DismissFlow status language">
        <Card tone="default">
          <CardHeader
            title="Dismissal lifecycle states"
            description="The standard vocabulary used across Gate, Teacher, Parent, and Admin."
          />
          <CardContent>
            <div className="flex flex-wrap gap-3">
              {DISMISSAL_STATES.map((s) => (
                <StatusPill key={s} status={s} />
              ))}
            </div>
            <Divider className="my-5" label="raw tones" />
            <div className="flex flex-wrap gap-3">
              <StatusBadge tone="neutral">Idle</StatusBadge>
              <StatusBadge tone="info">Requested</StatusBadge>
              <StatusBadge tone="info">Awaiting teacher</StatusBadge>
              <StatusBadge tone="success">Dismissed</StatusBadge>
              <StatusBadge tone="danger">Rejected</StatusBadge>
              <StatusBadge tone="neutral">Cancelled</StatusBadge>
              <StatusBadge tone="neutral">Expired</StatusBadge>
            </div>
          </CardContent>
        </Card>
        <CardGrid cols="4">
          <StatCard label="Requested" value={4} accent />
          <StatCard label="Awaiting teacher" value={2} />
          <StatCard label="Dismissed" value={31} hint="today" />
          <StatCard label="Rejected" value={0} />
        </CardGrid>
      </Section>

      {/* DATA */}
      <Section id="data" title="Data display">
        <Card tone="default">
          <CardHeader title="Table" />
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <thead>
                  <Tr>
                    <Th>Reference</Th>
                    <Th>Label</Th>
                    <Th>State</Th>
                  </Tr>
                </thead>
                <tbody>
                  {EXAMPLE_ROWS.map((r) => (
                    <Tr key={r.ref}>
                      <Td>{r.ref}</Td>
                      <Td>{r.label}</Td>
                      <Td>{r.state}</Td>
                    </Tr>
                  ))}
                </tbody>
              </Table>
            </div>
          </CardContent>
        </Card>
        <Card tone="default">
          <CardHeader title="DataTable (declarative)" />
          <CardContent>
            <DataTable columns={columns} rows={EXAMPLE_ROWS} rowKey={(r) => r.ref} />
          </CardContent>
        </Card>
      </Section>

      {/* OVERLAYS */}
      <Section id="overlays" title="Overlays & navigation">
        <Demo title="Modal, Drawer, Dropdown, Tooltip">
          <Button onClick={() => setModal(true)}>Open modal</Button>
          <Button variant="outline" onClick={() => setDrawer(true)}>Open drawer</Button>
          <Dropdown
            label="Actions"
            trigger={
              <span className="inline-flex h-10 items-center gap-2 rounded-md border border-border px-4 text-sm font-medium text-foreground hover:bg-muted">
                Menu <Icon name="chevron.down" className="h-4 w-4" />
              </span>
            }
            items={[
              { label: "View details", icon: <Icon name="eye" className="h-4 w-4" /> },
              { label: "Export", icon: <Icon name="download" className="h-4 w-4" /> },
              { label: "Delete", icon: <Icon name="x" className="h-4 w-4" />, danger: true }
            ]}
          />
          <Tooltip content="Helpful hint on hover or focus">
            <IconButton ariaLabel="Info"><Icon name="help" className="h-5 w-5" /></IconButton>
          </Tooltip>
        </Demo>
        <Card tone="default">
          <CardHeader title="Tabs" />
          <CardContent>
            <Tabs
              items={[
                { id: "overview", label: "Overview", content: <p className="text-sm text-muted-foreground">Overview content goes here.</p> },
                { id: "activity", label: "Activity", content: <p className="text-sm text-muted-foreground">Recent activity timeline.</p> },
                { id: "settings", label: "Settings", content: <p className="text-sm text-muted-foreground">Configuration options.</p> }
              ]}
            />
          </CardContent>
        </Card>
      </Section>

      {/* STATES */}
      <Section id="states" title="Loading & empty & error">
        <CardGrid cols="3">
          <Card tone="default">
            <CardHeader title="Loading" />
            <CardContent><LoadingState label="Fetching records…" /></CardContent>
          </Card>
          <Card tone="default">
            <CardHeader title="Empty" />
            <CardContent>
              <EmptyState icon="inbox" title="Nothing here yet" description="When records arrive they'll show up here." />
            </CardContent>
          </Card>
          <Card tone="default">
            <CardHeader title="Error" />
            <CardContent>
              <ErrorState title="Couldn't load" description="The request failed. Try again." action={<Button size="sm">Retry</Button>} />
            </CardContent>
          </Card>
        </CardGrid>
        <Card tone="default">
          <CardHeader title="Skeletons" />
          <CardContent className="grid gap-6 sm:grid-cols-2">
            <Stack gap={3}>
              <Skeleton className="h-6 w-40" />
              <SkeletonText lines={3} />
            </Stack>
            <div className="space-y-3">
              <Skeleton className="h-20 w-full rounded-lg" />
              <Skeleton className="h-20 w-full rounded-lg" />
            </div>
          </CardContent>
        </Card>
      </Section>

      <footer className="pt-4 text-center text-xs text-muted-foreground">
        DismissFlow foundation — component development surface. Synthetic examples only; no production data.
      </footer>
    </Page>

    {/* Overlay instances */}
    <Modal
      open={modal}
      onClose={() => setModal(false)}
      title="Confirm action"
      description="This is a demonstration modal with focus management."
      footer={
        <>
          <GhostButton onClick={() => setModal(false)}>Cancel</GhostButton>
          <PrimaryButton onClick={() => setModal(false)}>Confirm</PrimaryButton>
        </>
      }
    >
      <p className="text-sm text-muted-foreground">
        Press Escape or click the backdrop to close. Focus is trapped and restored to the trigger on close.
      </p>
    </Modal>

    <Drawer
      open={drawer}
      onClose={() => setDrawer(false)}
      title="Details"
      footer={<Button className="w-full" onClick={() => setDrawer(false)}>Done</Button>}
    >
      <Stack gap={4}>
        <p className="text-sm text-muted-foreground">
          Drawers are ideal for filters, detail panels, and mobile navigation. They slide from the left edge and trap focus.
        </p>
        <Divider />
        <Label>Example field</Label>
        <Input placeholder="Type something…" />
      </Stack>
    </Drawer>
    </>
  );
}

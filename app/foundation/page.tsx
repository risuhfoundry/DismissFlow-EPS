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
      { label: "Data", href: "#data", icon: "history" },
      { label: "Overlays", href: "#overlays", icon: "scan" },
      { label: "States", href: "#states", icon: "info" }
    ]
  }
];

const SAMPLE_USER = { name: "J. Staff", role: "admin" as const };

/* ---- Small helpers -------------------------------------------------------- */
function Demo({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Card>
      <CardHeader title={title} />
      <CardContent>
        <div className="flex flex-wrap items-center gap-3">{children}</div>
      </CardContent>
    </Card>
  );
}

function Swatch({ name, value, className }: { name: string; value: string; className?: string }) {
  return (
    <div className="flex flex-col gap-2">
      <div className={className ?? "h-14 w-full rounded-md border border-border"} style={{ background: value }} />
      <div>
        <p className="text-xs font-semibold text-foreground">{name}</p>
        <p className="text-xs text-muted-foreground">{value}</p>
      </div>
    </div>
  );
}

const EXAMPLE_ROWS = [
  { ref: "REF-001", label: "Example A", state: "Active" },
  { ref: "REF-002", label: "Example B", state: "Pending" },
  { ref: "REF-003", label: "Example C", state: "Closed" }
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
        description="The DismissFlow frontend foundation. A calm, premium, accessible component library shared by every future role phase."
      >
        {/* FOUNDATIONS */}
        <Section id="foundations" title="Foundations">
          <Card>
            <CardHeader title="Color tokens" description="Semantic, not page-specific." />
            <CardContent>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                <Swatch name="background" value="#F6F8FB" />
                <Swatch name="surface" value="#FFFFFF" className="border border-border" />
                <Swatch name="border" value="#E4E8EF" className="border border-border" />
                <Swatch name="text" value="#0F172A" />
                <Swatch name="muted" value="#64748B" />
                <Swatch name="primary" value="#2563EB" />
                <Swatch name="success" value="#16A34A" />
                <Swatch name="warning" value="#D97706" />
                <Swatch name="danger" value="#DC2626" />
                <Swatch name="info" value="#0EA5E9" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader title="Typography" description="Clear hierarchy. No oversized headings." />
            <CardContent className="space-y-3">
              <p className="text-display font-semibold text-foreground">Display — Page hero only</p>
              <p className="text-h1 text-foreground">Heading 1</p>
              <p className="text-h2 text-foreground">Heading 2</p>
              <p className="text-h3 text-foreground">Heading 3</p>
              <p className="text-base text-foreground">Body — the default reading size for the app.</p>
              <p className="text-sm text-muted-foreground">Small — secondary supporting text.</p>
              <p className="text-caption text-muted-foreground">Caption — metadata and footnotes.</p>
              <p className="text-label text-foreground">Label — form and control labels.</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader title="Spacing, radius, shadow" />
            <CardContent>
              <div className="flex flex-wrap items-end gap-4">
                {[1, 2, 3, 4, 6, 8].map((s) => (
                  <div key={s} className="flex flex-col items-center gap-2">
                    <div className={`w-10 bg-primary/20 rounded`} style={{ height: `${s * 8}px` }} />
                    <span className="text-xs text-muted-foreground">{s * 4}px</span>
                  </div>
                ))}
                <Divider orientation="vertical" className="h-16" />
                {[
                  { r: "sm", cls: "rounded-sm" },
                  { r: "md", cls: "rounded-md" },
                  { r: "lg", cls: "rounded-lg" },
                  { r: "xl", cls: "rounded-xl" },
                  { r: "2xl", cls: "rounded-2xl" }
                ].map(({ r, cls }) => (
                  <div key={r} className="flex flex-col items-center gap-2">
                    <div className={`h-10 w-10 bg-primary/20 border border-border ${cls}`} />
                    <span className="text-xs text-muted-foreground">r-{r}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
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
          <Card>
            <CardContent className="grid gap-5 sm:grid-cols-2">
              <div className="flex flex-col gap-2">
                <Label htmlFor="f-name" required>Full name</Label>
                <Input id="f-name" placeholder="e.g. Jordan Mercer" />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="f-email" hint="We'll never share this address.">Email</Label>
                <Input id="f-email" type="email" placeholder="name@school.edu" invalid={invalid} />
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
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setInvalid((v) => !v)}
                >
                  Toggle invalid state
                </Button>
              </div>
            </CardContent>
          </Card>
        </Section>

        {/* FEEDBACK */}
        <Section id="feedback" title="Feedback">
          <Card>
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
          <Card>
            <CardHeader title="Card with header, content, footer" action={<Badge tone="primary">New</Badge>} />
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Cards use one surface language. Borders are subtle; elevation comes from a soft shadow.
              </p>
            </CardContent>
            <CardFooter>
              <GhostButton size="sm">Cancel</GhostButton>
              <Button size="sm">Confirm</Button>
            </CardFooter>
          </Card>
          <Card>
            <CardContent>
              <div className="flex items-center gap-3">
                <span className="text-sm text-muted-foreground">Before</span>
                <Divider className="flex-1" />
                <span className="text-sm text-muted-foreground">After</span>
              </div>
            </CardContent>
          </Card>
        </Section>

        {/* DATA */}
        <Section id="data" title="Data display">
          <Card>
            <CardHeader title="Table" />
            <CardContent>
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
            </CardContent>
          </Card>
          <Card>
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
          <Card>
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
            <Card>
              <CardHeader title="Loading" />
              <CardContent>
                <LoadingState label="Fetching records…" />
              </CardContent>
            </Card>
            <Card>
              <CardHeader title="Empty" />
              <CardContent>
                <EmptyState icon="inbox" title="Nothing here yet" description="When records arrive they'll show up here." />
              </CardContent>
            </Card>
            <Card>
              <CardHeader title="Error" />
              <CardContent>
                <ErrorState title="Couldn't load" description="The request failed. Try again." action={<Button size="sm">Retry</Button>} />
              </CardContent>
            </Card>
          </CardGrid>
          <Card>
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

"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  BarChart3,
  Bell,
  File as FileIcon,
  FileText,
  FileVideo,
  Folder,
  PlayCircle,
  Search,
  Upload,
  Video
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency, cn } from "@/lib/utils";
import { FilePreview } from "@/components/dashboard/file-preview";

type DashboardFile = {
  id: string;
  title: string;
  description: string;
  summary: string | null;
  category: string;
  type: string;
  storageUrl: string;
  storageKey: string;
  isPremium: boolean;
  price: number;
  currency: string;
  totalViews: number;
  totalPurchases: number;
  createdAt: string;
  project: { id: string; name: string } | null;
};

type DashboardProject = {
  id: string;
  name: string;
  summary: string | null;
  count: number;
};

type DashboardNotification = {
  id: string;
  type: string;
  payload: Record<string, unknown>;
  createdAt: string;
};

type DashboardAnalytics = {
  totals: {
    revenue: number;
    views: number;
    files: number;
  };
  topViewed: Array<{ id: string; title: string; views: number; revenue: number }>;
  topSelling: Array<{ id: string; title: string; views: number; revenue: number }>;
  recentTransactions: Array<{
    id: string;
    amount: number;
    currency: string;
    createdAtLabel: string;
    fileId: string;
  }>;
};

type DashboardShellProps = {
  user: {
    id: string;
    name: string;
    role: string;
  };
  files: DashboardFile[];
  projects: DashboardProject[];
  categories: Array<{ name: string; count: number }>;
  analytics: DashboardAnalytics;
  notifications: DashboardNotification[];
};

export function DashboardShell({
  user,
  files,
  projects,
  categories,
  analytics,
  notifications
}: DashboardShellProps) {
  const [selectedFileId, setSelectedFileId] = useState<string | null>(files[0]?.id ?? null);
  const [projectFilter, setProjectFilter] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [isCheckoutLoading, setCheckoutLoading] = useState(false);

  const filteredFiles = useMemo(() => {
    return files.filter((file) => {
      if (projectFilter && file.project?.id !== projectFilter) return false;
      if (categoryFilter && file.category !== categoryFilter) return false;
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        return (
          file.title.toLowerCase().includes(term) ||
          file.description.toLowerCase().includes(term) ||
          (file.summary ?? "").toLowerCase().includes(term)
        );
      }
      return true;
    });
  }, [files, projectFilter, categoryFilter, searchTerm]);

  const selectedFile =
    filteredFiles.find((file) => file.id === selectedFileId) ?? filteredFiles[0] ?? null;

  const handleSelectFile = (fileId: string) => {
    setSelectedFileId(fileId);
  };

  const handleCheckout = async (file: { id: string; title: string; price: number }) => {
    setCheckoutLoading(true);
    try {
      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileId: file.id })
      });
      if (!response.ok) {
        const payload = await response.json();
        throw new Error(payload.error ?? "Unable to initialize checkout.");
      }
      const payload = await response.json();
      if (payload.url) {
        window.open(payload.url, "_blank");
      }
    } catch (error) {
      console.error("Checkout failed", error);
    } finally {
      setCheckoutLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-muted/20">
      <aside className="hidden w-72 border-r border-border bg-card/80 lg:flex lg:flex-col">
        <div className="flex h-16 items-center justify-between px-6">
          <div>
            <p className="text-xs uppercase tracking-tight text-muted-foreground">Community Vault</p>
            <p className="font-semibold">{user.name}</p>
          </div>
          <Badge variant="secondary">{user.role.toLowerCase()}</Badge>
        </div>
        <div className="px-4 pb-4">
          <Button className="w-full" asChild>
            <Link href="/upload">
              <Upload className="mr-2 h-4 w-4" />
              New Upload
            </Link>
          </Button>
        </div>

        <ScrollArea className="flex-1 px-2">
          <nav className="space-y-6 px-4 pb-4">
            <div>
              <p className="mb-2 text-xs font-semibold uppercase text-muted-foreground">Projects</p>
              <div className="space-y-1">
                <SidebarItem
                  label="All projects"
                  count={files.length}
                  icon={Folder}
                  active={!projectFilter}
                  onClick={() => setProjectFilter(null)}
                />
                {projects.map((project) => (
                  <SidebarItem
                    key={project.id}
                    label={project.name}
                    count={project.count}
                    icon={Folder}
                    active={projectFilter === project.id}
                    onClick={() => setProjectFilter(project.id)}
                  />
                ))}
              </div>
            </div>

            <div>
              <p className="mb-2 text-xs font-semibold uppercase text-muted-foreground">Categories</p>
              <div className="space-y-1">
                <SidebarItem
                  label="All categories"
                  count={files.length}
                  icon={BarChart3}
                  active={!categoryFilter}
                  onClick={() => setCategoryFilter(null)}
                />
                {categories.map((category) => (
                  <SidebarItem
                    key={category.name}
                    label={category.name}
                    count={category.count}
                    icon={FileIcon}
                    active={categoryFilter === category.name}
                    onClick={() => setCategoryFilter(category.name)}
                  />
                ))}
              </div>
            </div>

            <div>
              <p className="mb-2 text-xs font-semibold uppercase text-muted-foreground">
                Notifications
              </p>
              <div className="space-y-2">
                {notifications.length === 0 && (
                  <p className="text-xs text-muted-foreground">No new notifications</p>
                )}
                {notifications.map((notification) => (
                  <NotificationCard key={notification.id} notification={notification} />
                ))}
              </div>
            </div>
          </nav>
        </ScrollArea>
      </aside>

      <main className="flex flex-1 flex-col gap-6 p-6">
        <header className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Your knowledge vault</h1>
            <p className="text-sm text-muted-foreground">
              Upload, monetize, and share your guides with AI summaries and premium previews.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="w-full min-w-[240px] pl-9"
                placeholder="Search files, summaries, or projects"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
              />
            </div>
            <Button variant="outline" asChild>
              <Link href="/upload">
                <Upload className="mr-2 h-4 w-4" />
                Upload content
              </Link>
            </Button>
          </div>
        </header>

        <AnalyticsSummary analytics={analytics} />

        <section className="grid flex-1 grid-cols-1 gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(320px,1fr)]">
          <Card className="flex min-h-[480px] flex-col">
            <CardHeader>
              <CardTitle>Library</CardTitle>
              <CardDescription>Click any file to preview and manage monetization.</CardDescription>
            </CardHeader>
            <CardContent className="flex-1">
              {filteredFiles.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center text-center text-muted-foreground">
                  <FileIcon className="mb-2 h-10 w-10" />
                  <p>No files match your filters.</p>
                </div>
              ) : (
                <div className="grid gap-3 md:grid-cols-2">
                  {filteredFiles.map((file) => (
                    <FileCard
                      key={file.id}
                      file={file}
                      active={file.id === selectedFile?.id}
                      onSelect={() => handleSelectFile(file.id)}
                    />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="flex min-h-[480px] flex-col">
            <CardHeader>
              <CardTitle>Preview</CardTitle>
              <CardDescription>
                Summaries are AI-generated on upload. Premium previews show metadata only.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex-1">
              {selectedFile ? (
                <FilePreview file={selectedFile} onCheckout={handleCheckout} loading={isCheckoutLoading} />
              ) : (
                <div className="flex h-full flex-col items-center justify-center text-center text-muted-foreground">
                  <PlayCircle className="mb-2 h-10 w-10" />
                  <p>Select a file from your library to see its preview.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </section>
      </main>

    </div>
  );
}

function SidebarItem({
  label,
  count,
  icon: Icon,
  active,
  onClick
}: {
  label: string;
  count: number;
  icon: typeof Folder;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm transition",
        active ? "bg-primary/10 text-primary" : "hover:bg-accent hover:text-accent-foreground"
      )}
    >
      <span className="flex items-center gap-2">
        <Icon className="h-4 w-4" />
        {label}
      </span>
      <Badge variant={active ? "default" : "secondary"}>{count}</Badge>
    </button>
  );
}

function NotificationCard({ notification }: { notification: DashboardNotification }) {
  const title =
    notification.type === "PURCHASE" ? "New purchase" : "New content available";
  const description =
    notification.type === "PURCHASE"
      ? `${notification.payload.purchaserName ?? "A member"} bought ${notification.payload.fileTitle}`
      : `${notification.payload.creatorName ?? "A creator"} published ${notification.payload.fileTitle}`;

  return (
    <div className="flex items-start gap-3 rounded-lg border border-border bg-card px-3 py-2 text-left text-sm">
      <Bell className="mt-0.5 h-4 w-4 text-primary" />
      <div>
        <p className="font-medium">{title}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}

function FileCard({
  file,
  active,
  onSelect
}: {
  file: DashboardFile;
  active: boolean;
  onSelect: () => void;
}) {
  const Icon =
    file.type === "PDF" ? FileText : file.type === "VIDEO" ? FileVideo : FileIcon;

  return (
    <button
      onClick={onSelect}
      className={cn(
        "flex flex-col rounded-xl border border-border bg-card p-4 text-left transition hover:border-primary/60 hover:shadow-md",
        active && "border-primary shadow-sm"
      )}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon className="h-5 w-5 text-primary" />
          <span className="font-semibold">{file.title}</span>
        </div>
        <Badge variant={file.isPremium ? "default" : "secondary"}>
          {file.isPremium ? "Premium" : "Free"}
        </Badge>
      </div>
      <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{file.description}</p>
      <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
        <span>{file.category}</span>
        <span>{new Date(file.createdAt).toLocaleDateString()}</span>
      </div>
    </button>
  );
}

function AnalyticsSummary({ analytics }: { analytics: DashboardAnalytics }) {
  return (
    <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total revenue</CardTitle>
          <BarChart3 className="h-4 w-4 text-primary" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatCurrency(analytics.totals.revenue)}</div>
          <p className="text-xs text-muted-foreground">Across all premium sales</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">File views</CardTitle>
          <Video className="h-4 w-4 text-primary" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{analytics.totals.views}</div>
          <p className="text-xs text-muted-foreground">Lifetime across all media</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Published items</CardTitle>
          <Folder className="h-4 w-4 text-primary" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{analytics.totals.files}</div>
          <p className="text-xs text-muted-foreground">Projects and standalone content</p>
        </CardContent>
      </Card>
    </section>
  );
}


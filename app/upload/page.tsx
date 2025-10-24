import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { UploadForm } from "@/components/upload/upload-form";

export default async function UploadPage() {
  const user = await getCurrentUser();
  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Launch from Whop</CardTitle>
            <CardDescription>
              We couldn’t authenticate your session. Open this app inside your Whop workspace.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Whop automatically injects an access token when the app runs inside the dashboard.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const projects = await prisma.project.findMany({
    where: { ownerId: user.id },
    select: { id: true, name: true },
    orderBy: { createdAt: "desc" }
  });

  return (
    <div className="mx-auto flex min-h-screen max-w-4xl flex-col gap-8 px-6 py-10">
      <div>
        <h1 className="text-3xl font-semibold">Upload to Community Vault</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Our AI pipeline will analyze your content, generate summaries, and index everything for semantic search.
        </p>
      </div>
      <UploadForm projects={projects} />
    </div>
  );
}


"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { useUploader } from "@/hooks/useUploader";

const schema = z.object({
  title: z.string().min(2, "Title is required"),
  description: z.string().min(10, "Description should be at least 10 characters"),
  category: z.string().min(2, "Category is required"),
  projectId: z.string().optional(),
  isPremium: z.boolean().default(false),
  price: z.number().min(0).default(0)
});

export type UploadFormValues = z.infer<typeof schema>;

type UploadFormProps = {
  projects: Array<{ id: string; name: string }>;
};

export function UploadForm({ projects }: UploadFormProps) {
  const [file, setFile] = useState<File | null>(null);
  const form = useForm<UploadFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: "",
      description: "",
      category: "Guides",
      projectId: projects[0]?.id,
      isPremium: false,
      price: 0
    }
  });

  const uploader = useUploader();
  const isPremium = form.watch("isPremium");

  async function onSubmit(values: UploadFormValues) {
    if (!file) {
      form.setError("title", { message: "Attach a file before uploading." });
      return;
    }

    await uploader.mutateAsync({
      file,
      metadata: {
        ...values,
        price: values.isPremium ? values.price : 0
      }
    });

    form.reset();
    setFile(null);
  }

  return (
    <form className="space-y-6" onSubmit={form.handleSubmit(onSubmit)}>
      <section className="grid gap-4 rounded-xl border border-border bg-card p-6">
        <div className="grid gap-2">
          <Label htmlFor="file">Upload file</Label>
          <input
            id="file"
            type="file"
            accept=".pdf,.txt,video/*"
            onChange={(event) => {
              const targetFile = event.target.files?.[0] ?? null;
              setFile(targetFile);
            }}
            className="block w-full cursor-pointer rounded-md border border-dashed border-input bg-background px-4 py-16 text-center text-sm text-muted-foreground"
          />
          <p className="text-xs text-muted-foreground">
            Supported: PDF, TXT, MP4/MOV. Our AI summarizer will index everything automatically.
          </p>
          {file && (
            <div className="rounded-lg border border-dashed border-primary/40 bg-primary/5 p-3 text-sm text-primary">
              Selected: {file.name} ({Math.round(file.size / (1024 * 1024))} MB)
            </div>
          )}
        </div>

        <div className="grid gap-2">
          <Label htmlFor="title">Title</Label>
          <Input id="title" placeholder="How to dominate product launches" {...form.register("title")} />
          <FieldError message={form.formState.errors.title?.message} />
        </div>

        <div className="grid gap-2">
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            placeholder="Describe what members will learn or receive."
            rows={4}
            {...form.register("description")}
          />
          <FieldError message={form.formState.errors.description?.message} />
        </div>

        <div className="grid gap-2">
          <Label htmlFor="category">Category</Label>
          <Input id="category" placeholder="Marketing" {...form.register("category")} />
          <FieldError message={form.formState.errors.category?.message} />
        </div>

        <div className="grid gap-2">
          <Label htmlFor="projectId">Project</Label>
          <Select id="projectId" {...form.register("projectId")}>
            {projects.length === 0 && <option value="">No project</option>}
            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </Select>
        </div>

        <div className="grid gap-2">
          <Label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border border-input"
              {...form.register("isPremium")}
            />
            Monetize this upload
          </Label>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-[160px_auto] sm:items-center">
            <Input
              type="number"
              step="0.5"
              min="0"
              disabled={!isPremium}
              {...form.register("price", { valueAsNumber: true })}
              placeholder="29"
            />
            <p className="text-xs text-muted-foreground">
              Earnings split is handled automatically. Members will see a paywall preview with the AI
              summary.
            </p>
          </div>
        </div>
      </section>

      <div className="flex items-center justify-between">
        <Button type="button" variant="ghost" asChild>
          <a href="/dashboard">Cancel</a>
        </Button>
        <Button type="submit" disabled={uploader.isPending || uploader.progress !== "idle"}>
          {uploader.progress === "uploading"
            ? "Uploading…"
            : uploader.progress === "processing"
              ? "Processing with AI…"
              : "Save to vault"}
        </Button>
      </div>
    </form>
  );
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="text-xs text-red-500">{message}</p>;
}


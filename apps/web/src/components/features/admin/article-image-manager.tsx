"use client";

import * as React from "react";
import Image from "next/image";
import { ArrowDown, ArrowUp, ImagePlus, Star } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/common/button";
import { ConfirmDeleteButton } from "@/components/features/admin/confirm-delete-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api, toDisplayError } from "@/lib/api/client";
import type { ArticleImage } from "@/lib/api/public-types";

/**
 * Article media is deliberately separate from the editorial form: an article
 * must first exist so uploads have a stable parent, and publish validation can
 * then enforce cover and alt-text requirements on the server.
 */
export function ArticleImageManager({
  resource,
  articleId,
  images,
  onChanged,
}: {
  resource: "announcements" | "activities" | "donation-drives";
  articleId: string;
  images: ArticleImage[];
  onChanged: () => void;
}) {
  const [isUploading, setIsUploading] = React.useState(false);
  const [altText, setAltText] = React.useState<Record<string, string>>({});
  const [caption, setCaption] = React.useState<Record<string, string>>({});

  async function upload(file: File) {
    setIsUploading(true);
    try {
      const data = new FormData();
      data.append("file", file);
      await api.post(`/admin/${resource}/${articleId}/images`, data, {
        headers: { "Content-Type": undefined },
      });
      toast.success("Image uploaded. Add alt text before publishing.");
      onChanged();
    } catch (error) {
      toast.error(toDisplayError(error).detail);
    } finally {
      setIsUploading(false);
    }
  }

  async function saveImage(image: ArticleImage, patch: Record<string, unknown>) {
    try {
      await api.patch(`/admin/${resource}/${articleId}/images/${image.id}`, patch);
      toast.success("Image details saved");
      onChanged();
    } catch (error) {
      toast.error(toDisplayError(error).detail);
    }
  }

  async function deleteImage(image: ArticleImage) {
    try {
      await api.delete(`/admin/${resource}/${articleId}/images/${image.id}`);
      toast.success("Image removed");
      onChanged();
    } catch (error) {
      toast.error(toDisplayError(error).detail);
    }
  }

  async function moveImage(imageId: string, direction: -1 | 1) {
    const from = images.findIndex((image) => image.id === imageId);
    const to = from + direction;
    if (from < 0 || to < 0 || to >= images.length) return;
    const ordered = [...images];
    [ordered[from], ordered[to]] = [ordered[to], ordered[from]];
    try {
      await api.put(`/admin/${resource}/${articleId}/images/order`, {
        image_ids: ordered.map((image) => image.id),
      });
      toast.success("Image order saved");
      onChanged();
    } catch (error) {
      toast.error(toDisplayError(error).detail);
    }
  }

  return (
    <section className="rounded-[14px] border border-primary-200 bg-primary-50/40 p-4 shadow-xs">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-overline text-primary-700">Publication checklist</p>
          <h2 className="mt-1 text-h4 text-neutral-900">Cover & gallery</h2>
          <p className="mt-1 text-sm text-neutral-600">
            {images.length}/10 images · Routine articles need one cover with alt text before publication.
          </p>
        </div>
        <Label className="cursor-pointer">
          <input
            className="sr-only"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            disabled={isUploading || images.length >= 10}
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void upload(file);
              event.currentTarget.value = "";
            }}
          />
          <span className="bg-primary-700 hover:bg-primary-800 inline-flex h-9 items-center gap-2 rounded-md px-3 text-sm font-semibold text-white">
            <ImagePlus aria-hidden className="size-4" />
            {isUploading ? "Uploading…" : "Upload image"}
          </span>
        </Label>
      </div>

      {images.length === 0 ? (
        <div className="mt-4 rounded-lg border border-dashed border-primary-200 bg-white/70 p-4 text-sm text-neutral-600">No images uploaded yet. Add a wide cover photo first, then save a precise description of what residents can see.</div>
      ) : (
        <ul className="mt-4 grid gap-4 sm:grid-cols-2">
          {images.map((image, index) => (
            <li
              key={image.id}
              className="overflow-hidden rounded-lg border border-neutral-200 bg-white"
            >
              <div className="relative aspect-video bg-neutral-100">
                <Image
                  src={image.url}
                  alt={image.alt_text || "Uploaded article image"}
                  fill
                  className="object-cover"
                />
              </div>
              <div className="space-y-3 p-3">
                <div className="flex items-center justify-between text-xs font-semibold tracking-wide text-neutral-500 uppercase">
                  <span>Gallery position {index + 1}</span>
                  <span className="flex gap-1">
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      className="size-8 px-0"
                      disabled={index === 0}
                      aria-label="Move image earlier"
                      onClick={() => void moveImage(image.id, -1)}
                    >
                      <ArrowUp aria-hidden className="size-4" />
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      className="size-8 px-0"
                      disabled={index === images.length - 1}
                      aria-label="Move image later"
                      onClick={() => void moveImage(image.id, 1)}
                    >
                      <ArrowDown aria-hidden className="size-4" />
                    </Button>
                  </span>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor={`alt-${image.id}`}>Alt text</Label>
                  <Input
                    id={`alt-${image.id}`}
                    defaultValue={image.alt_text}
                    onChange={(event) =>
                      setAltText((current) => ({
                        ...current,
                        [image.id]: event.target.value,
                      }))
                    }
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor={`caption-${image.id}`}>Caption (optional)</Label>
                  <Input
                    id={`caption-${image.id}`}
                    defaultValue={image.caption ?? ""}
                    onChange={(event) =>
                      setCaption((current) => ({
                        ...current,
                        [image.id]: event.target.value,
                      }))
                    }
                  />
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      void saveImage(image, {
                        alt_text: altText[image.id] ?? image.alt_text,
                        caption: caption[image.id] ?? image.caption,
                      })
                    }
                  >
                    Save details
                  </Button>
                  <Button
                    size="sm"
                    variant={image.is_cover ? "primary" : "outline"}
                    onClick={() => void saveImage(image, { is_cover: !image.is_cover })}
                  >
                    <Star aria-hidden className="size-3.5" />
                    {image.is_cover ? "Cover image" : "Set as cover"}
                  </Button>
                  <ConfirmDeleteButton
                    itemLabel={image.alt_text || "this image"}
                    actionLabel="Remove"
                    confirmLabel="Remove image"
                    onConfirm={() => void deleteImage(image)}
                  />
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

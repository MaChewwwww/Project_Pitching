"use client";

import * as React from "react";
import Image from "next/image";
import { ArrowDown, ArrowUp, ImagePlus, Star } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/common/button";
import { ConfirmDeleteButton } from "@/components/features/admin/confirm-delete-button";
import { Label } from "@/components/ui/label";
import { api, toDisplayError } from "@/lib/api/client";
import type { ArticleImage } from "@/lib/api/public-types";

/**
 * Article media is deliberately separate from the editorial form: an article
 * must first exist so uploads have a stable parent and cover selection stays
 * available without interrupting article editing.
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

  async function upload(file: File) {
    setIsUploading(true);
    try {
      const data = new FormData();
      data.append("file", file);
      await api.post(`/admin/${resource}/${articleId}/images`, data, {
        headers: { "Content-Type": undefined },
      });
      toast.success("Image uploaded.");
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
      toast.success("Cover image updated");
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
    <section className="space-y-4 rounded-2xl border border-neutral-200/90 bg-white p-6 shadow-2xs">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <ImagePlus aria-hidden className="size-4 text-emerald-600" />
            <h2 className="text-sm font-bold text-neutral-900">Article Media & Photos</h2>
          </div>
          <p className="mt-1 text-sm text-neutral-600">
            {images.length}/10 images · Choose one cover photo for the article.
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
        <div className="rounded-xl border-2 border-dashed border-emerald-600/30 bg-emerald-50/30 p-6 text-center text-sm text-neutral-600">No images uploaded yet. Add a wide cover photo to lead the article.</div>
      ) : (
        <ul className="grid grid-cols-1 gap-4">
          {images.map((image, index) => (
            <li
              key={image.id}
              className="overflow-hidden rounded-lg border border-neutral-200 bg-white"
            >
              <div className="relative aspect-video bg-neutral-100">
                <Image
                  src={image.url}
                  alt=""
                  fill
                  unoptimized
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
                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant={image.is_cover ? "primary" : "outline"}
                    onClick={() => void saveImage(image, { is_cover: !image.is_cover })}
                  >
                    <Star aria-hidden className="size-3.5" />
                    {image.is_cover ? "Cover image" : "Set as cover"}
                  </Button>
                  <ConfirmDeleteButton
                    itemLabel="this image"
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

"use client";

import * as React from "react";
import Image from "next/image";
import { ArrowDown, ArrowUp, ImagePlus, Star, Upload } from "lucide-react";
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

  async function setCover(image: ArticleImage) {
    try {
      await api.patch(`/admin/${resource}/${articleId}/images/${image.id}`, { is_cover: true });
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
      <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
        <div className="flex items-center gap-2">
          <ImagePlus aria-hidden className="size-4 text-emerald-600" />
          <h2 className="text-sm font-bold text-neutral-900">Article Media & Photos</h2>
        </div>
        {images.length > 0 ? (
          <span className="text-xs font-semibold text-neutral-500">
            {images.length} {images.length === 1 ? "photo" : "photos"}
          </span>
        ) : null}
      </div>

      {images.length === 0 ? (
        <UploadControl isUploading={isUploading} upload={upload} />
      ) : (
        <div className="space-y-4">
          <ul className="grid grid-cols-1 gap-3">
            {images.map((image, index) => (
              <li key={image.id} className="space-y-2">
                <div
                  className={`relative aspect-video w-full overflow-hidden rounded-xl border bg-neutral-100 shadow-2xs transition-all ${
                    image.is_cover
                      ? "border-emerald-500 ring-2 ring-emerald-500/20"
                      : "border-neutral-200"
                  }`}
                >
                  <Image src={image.url} alt="" fill unoptimized className="object-cover" />
                  <ConfirmDeleteButton
                    itemLabel="this image"
                    actionLabel="Remove photo"
                    confirmLabel="Remove image"
                    iconOnly
                    className="absolute top-2 right-2 z-10 size-8 rounded-full bg-red-600 p-0 text-white shadow-md transition-all hover:bg-red-700 cursor-pointer"
                    onConfirm={() => void deleteImage(image)}
                  />
                  <div className="absolute top-2 left-2 z-10">
                    {image.is_cover ? (
                      <span className="flex items-center gap-1.5 rounded-full bg-emerald-600 px-3 py-1 text-[11px] font-bold text-white shadow-xs">
                        <Star aria-hidden className="size-3 fill-white" />
                        Cover Photo
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => void setCover(image)}
                        className="flex cursor-pointer items-center gap-1 rounded-full bg-neutral-900/85 px-2.5 py-1 text-[11px] font-bold text-white shadow-xs transition-colors hover:bg-emerald-600"
                      >
                        <Star aria-hidden className="size-3" />
                        Set as Cover
                      </button>
                    )}
                  </div>
                  <div className="absolute right-2 bottom-2 z-10 flex rounded-full bg-emerald-600 p-0.5 shadow-md">
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      className="size-7 rounded-full px-0 text-white hover:bg-emerald-700 hover:text-white"
                      disabled={index === 0}
                      aria-label="Move image earlier"
                      onClick={() => void moveImage(image.id, -1)}
                    >
                      <ArrowUp aria-hidden className="size-3.5" />
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      className="size-7 rounded-full px-0 text-white hover:bg-emerald-700 hover:text-white"
                      disabled={index === images.length - 1}
                      aria-label="Move image later"
                      onClick={() => void moveImage(image.id, 1)}
                    >
                      <ArrowDown aria-hidden className="size-3.5" />
                    </Button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
          {images.length < 10 ? (
            <UploadControl compact isUploading={isUploading} upload={upload} />
          ) : null}
        </div>
      )}
    </section>
  );
}

function UploadControl({
  isUploading,
  upload,
  compact = false,
}: {
  isUploading: boolean;
  upload: (file: File) => Promise<void>;
  compact?: boolean;
}) {
  return (
    <Label
      className={
        compact
          ? "flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-emerald-600/40 bg-emerald-50/40 px-4 py-2.5 text-center transition-all hover:border-emerald-600 hover:bg-emerald-50/70"
          : "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-emerald-600/30 bg-emerald-50/30 p-6 text-center transition-all hover:border-emerald-600 hover:bg-emerald-50/70"
      }
    >
      <input
        className="sr-only"
        type="file"
        accept="image/jpeg,image/png,image/webp"
        disabled={isUploading}
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) void upload(file);
          event.currentTarget.value = "";
        }}
      />
      {compact ? (
        <Upload aria-hidden className="size-4 text-emerald-700" />
      ) : (
        <div className="flex size-10 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 shadow-2xs">
          <Upload aria-hidden className="size-5" />
        </div>
      )}
      <span className={compact ? "text-xs font-bold text-emerald-950" : "text-sm font-bold text-emerald-950"}>
        {isUploading ? "Uploading…" : compact ? "Add More Photos" : "Upload photos"}
      </span>
      {!compact ? <span className="text-xs text-neutral-600">Add a wide cover photo to lead the article.</span> : null}
    </Label>
  );
}

import { notFound } from "next/navigation";
import { DonationDriveDetailView } from "@/components/features/public/donation-drive-detail-view";
import { getDonationDrive, getDonationDrives } from "@/lib/api/public";

export default async function DonationDriveArticlePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const slug = (await params).slug;

  const [drive, recentResponse] = await Promise.all([
    getDonationDrive(slug),
    getDonationDrives({ size: 6 }),
  ]);

  if (!drive) notFound();

  const recentDrives = (recentResponse?.items || [])
    .filter((item) => item.id !== drive.id)
    .slice(0, 4);

  return (
    <DonationDriveDetailView
      drive={drive}
      recentDrives={recentDrives}
    />
  );
}

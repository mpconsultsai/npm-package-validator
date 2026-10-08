import { permanentRedirect } from "next/navigation";

export default async function LegacyPackagePage({
  params,
}: {
  params: Promise<{ name: string }>;
}) {
  const { name } = await params;
  permanentRedirect(`/npm/${encodeURIComponent(name)}`);
}

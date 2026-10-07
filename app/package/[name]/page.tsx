import { redirect } from "next/navigation";

export default async function LegacyPackagePage({
  params,
}: {
  params: Promise<{ name: string }>;
}) {
  const { name } = await params;
  redirect(`/npm/${name}`);
}

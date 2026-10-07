"use client";

import { useParams } from "next/navigation";
import { PackageAnalysisPage } from "@/components/analysis/PackageAnalysisPage";

export default function NpmPackagePage() {
  const params = useParams();
  const nameFromPath = params.name
    ? decodeURIComponent(String(params.name))
    : "";

  return (
    <PackageAnalysisPage ecosystem="npm" nameFromPath={nameFromPath} />
  );
}

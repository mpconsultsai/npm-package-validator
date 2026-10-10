import { PackageAnalysisPage } from "@/components/analysis/PackageAnalysisPage";
import {
  decodePackageParam,
  packagePageMetadata,
} from "@/lib/package-page-meta";

type NugetPackagePageProps = {
  params: Promise<{ name: string }>;
};

export async function generateMetadata({ params }: NugetPackagePageProps) {
  const { name } = await params;
  return packagePageMetadata("nuget", name);
}

export default async function NugetPackagePage({
  params,
}: NugetPackagePageProps) {
  const { name } = await params;

  return (
    <PackageAnalysisPage
      ecosystem="nuget"
      nameFromPath={decodePackageParam(name)}
    />
  );
}

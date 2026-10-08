import { PackageAnalysisPage } from "@/components/analysis/PackageAnalysisPage";
import {
  decodePackageParam,
  packagePageMetadata,
} from "@/lib/package-page-meta";

type PypiPackagePageProps = {
  params: Promise<{ name: string }>;
};

export async function generateMetadata({ params }: PypiPackagePageProps) {
  const { name } = await params;
  return packagePageMetadata("pypi", name);
}

export default async function PypiPackagePage({
  params,
}: PypiPackagePageProps) {
  const { name } = await params;

  return (
    <PackageAnalysisPage
      ecosystem="pypi"
      nameFromPath={decodePackageParam(name)}
    />
  );
}

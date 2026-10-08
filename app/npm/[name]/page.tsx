import { PackageAnalysisPage } from "@/components/analysis/PackageAnalysisPage";
import {
  decodePackageParam,
  packagePageMetadata,
} from "@/lib/package-page-meta";

type NpmPackagePageProps = {
  params: Promise<{ name: string }>;
};

export async function generateMetadata({ params }: NpmPackagePageProps) {
  const { name } = await params;
  return packagePageMetadata("npm", name);
}

export default async function NpmPackagePage({ params }: NpmPackagePageProps) {
  const { name } = await params;

  return (
    <PackageAnalysisPage
      ecosystem="npm"
      nameFromPath={decodePackageParam(name)}
    />
  );
}

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { extractPackageName } from "@/lib/validation";
import { PageHeader } from "@/components/PageHeader";
import { PackageSearchForm } from "@/components/PackageSearchForm";
import { InfoCards } from "@/components/InfoCards";

export default function Home() {
  const [packageName, setPackageName] = useState("");
  const router = useRouter();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const name = extractPackageName(packageName);
    if (!name) return;
    router.push("/package/" + encodeURIComponent(name));
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto">
          <PageHeader />
          <PackageSearchForm
            value={packageName}
            onChange={setPackageName}
            onSubmit={handleSubmit}
          />
          <InfoCards />
        </div>
      </div>
    </main>
  );
}

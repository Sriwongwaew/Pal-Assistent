import { Suspense } from "react";
import { BreedingView } from "@/components/containers/BreedingView";

export default function BreedingPage() {
  return (
    <Suspense fallback={<div className="meta">Laddar…</div>}>
      <BreedingView />
    </Suspense>
  );
}

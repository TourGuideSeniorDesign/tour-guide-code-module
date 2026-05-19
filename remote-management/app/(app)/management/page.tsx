import { Settings2 } from "lucide-react";
import { TourEditor } from "../../../components/management/tour-editor";
import { readTour } from "../../../lib/tour-store";

export const dynamic = "force-dynamic";

export default async function ManagementPage() {
  const tour = await readTour();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Settings2 className="h-6 w-6 text-(--color-muted-foreground)" />
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Management</h1>
            <p className="text-sm text-(--color-muted-foreground)">
              Edit tour content. Changes are validated and broadcast to the
              tour-guide frontend on save.
            </p>
          </div>
        </div>
      </div>
      <TourEditor initial={tour} />
    </div>
  );
}

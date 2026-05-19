import { Settings2 } from "lucide-react";
import { Card, CardContent } from "../../../components/ui/card";

export default function ManagementPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Settings2 className="h-6 w-6 text-(--color-muted-foreground)" />
        <h1 className="text-2xl font-bold tracking-tight">Management</h1>
      </div>
      <Card>
        <CardContent className="flex h-48 items-center justify-center p-6">
          <p className="text-sm text-(--color-muted-foreground)">
            Management tools will be available here soon.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

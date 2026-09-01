import { Card, CardContent } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";

/**
 * Quiet, content-region loading state. Renders inside the shell so the sidebar
 * and header stay in place during navigation.
 */
export default function Loading() {
  return (
    <Card>
      <CardContent className="divide-y divide-border py-2">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="flex items-center gap-4 px-1 py-4">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-44" />
              <Skeleton className="h-3 w-24" />
            </div>
            <Skeleton className="h-6 w-28 rounded-full" />
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

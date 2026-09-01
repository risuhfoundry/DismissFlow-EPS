import { Card, CardContent } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";

/**
 * Quiet, content-region loading state. Rendered inside the shell (header +
 * sidebar stay put) so navigation feels continuous rather than flashing blank.
 */
export default function Loading() {
  return (
    <div className="space-y-8">
      <Card>
        <CardContent className="flex items-center gap-4 py-5">
          <Skeleton className="h-12 w-12 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-3 w-28" />
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="space-y-4 py-8">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-full max-w-md" />
          <Skeleton className="h-40 w-full rounded-xl" />
        </CardContent>
      </Card>
    </div>
  );
}

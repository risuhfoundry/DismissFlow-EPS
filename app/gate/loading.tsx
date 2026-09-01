import { Card, CardContent } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";

/**
 * Quiet, content-region loading state for the gate. The scanner is the primary
 * experience, so the placeholder mirrors that emphasis: a wide camera frame plus
 * a calm result panel — rendered inside the shell, no blank flash.
 */
export default function Loading() {
  return (
    <div className="grid gap-6 lg:grid-cols-[1.25fr_1fr]">
      <Card>
        <CardContent className="py-5">
          <Skeleton className="aspect-video w-full rounded-xl" />
        </CardContent>
      </Card>
      <Card>
        <CardContent className="min-h-[260px] py-5">
          <Skeleton className="mx-auto h-40 w-full max-w-xs rounded-xl" />
        </CardContent>
      </Card>
    </div>
  );
}

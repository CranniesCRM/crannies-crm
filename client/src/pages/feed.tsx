import { useQuery } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "wouter";

interface FeedEntry {
  id: string;
  text: string;
  createdAt: string;
  actor: {
    id: string;
    name: string;
    image?: string | null;
    company?: string | null;
  };
  issueId?: string | null;
  rfpId?: string | null;
  authorType: string;
}

function FeedSkeleton() {
  return (
    <div className="space-y-4">
      {[...Array(4)].map((_, index) => (
        <Card key={index}>
          <CardContent className="flex items-start gap-4 py-4">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-4 w-3/4" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export default function FeedPage() {
  const { data, isLoading, error } = useQuery<FeedEntry[]>({
    queryKey: ["/api/conversations/feed"],
  });

  return (
    <div className="p-6 space-y-6 max-w-4xl mx-auto">
      <div>
        <p className="text-xs uppercase tracking-wide text-muted-foreground">Stay aligned</p>
        <h1 className="text-3xl font-semibold">Workspace feed</h1>
        <p className="text-sm text-muted-foreground">
          Streamed updates from every RFP conversation in one place.
        </p>
      </div>

      {isLoading ? (
        <FeedSkeleton />
      ) : error ? (
        <Card>
          <CardContent className="py-6 text-sm text-muted-foreground">
            Unable to load feed. {error instanceof Error ? error.message : ""}
          </CardContent>
        </Card>
      ) : data && data.length > 0 ? (
        <div className="space-y-4">
          {data.map((entry) => (
            <Card key={entry.id}>
              <CardContent className="py-4 flex items-start gap-3">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={entry.actor.image || undefined} />
                  <AvatarFallback>{entry.actor.name?.[0] || "?"}</AvatarFallback>
                </Avatar>
                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-medium">{entry.actor.name}</p>
                    {entry.actor.company && (
                      <span className="text-xs text-muted-foreground">• {entry.actor.company}</span>
                    )}
                    <span className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(entry.createdAt), { addSuffix: true })}
                    </span>
                  </div>
                 <p className="text-sm whitespace-pre-wrap">{entry.text}</p>
                  {entry.issueId && (
                    <Link href={`/issues/${entry.issueId}`}>
                      <span className="text-xs text-primary hover:underline">Open issue</span>
                    </Link>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="py-6 text-center text-sm text-muted-foreground">
            No updates yet. Post in any issue to kick off the feed.
          </CardContent>
        </Card>
      )}
    </div>
  );
}

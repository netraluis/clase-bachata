import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { Item, ItemGroup, ItemMedia, ItemContent, ItemTitle, ItemDescription, ItemActions, ItemSeparator } from "@/components/ui/item";
import { Empty, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import { formatDuration } from "@/lib/format";
import type { VideoRow } from "@/lib/data";

type Entry = VideoRow & { thumbUrl: string | null; noteCount?: number };

// Filas de vídeo: miniatura, título, nota general y número de notas.
export function VideoList({ videos }: { videos: Entry[] }) {
  if (videos.length === 0) {
    return (
      <Empty className="py-6">
        <EmptyHeader>
          <EmptyTitle>Sin vídeos</EmptyTitle>
        </EmptyHeader>
      </Empty>
    );
  }
  return (
    <ItemGroup>
      {videos.map((v, i) => (
        <div key={v.id}>
          {i > 0 && <ItemSeparator />}
          <Item size="sm" render={<Link href={`/v/${v.id}`} />} className="hover:bg-muted/50">
            <ItemMedia className="w-[86px] shrink-0">
              <AspectRatio ratio={16 / 9} className="overflow-hidden rounded-md bg-muted">
                {v.thumbUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={v.thumbUrl} alt="" className="size-full object-cover" />
                )}
                {v.duration_s != null && (
                  <Badge variant="secondary" className="absolute right-1 bottom-1 px-1 py-0 text-[10px]">
                    {formatDuration(v.duration_s)}
                  </Badge>
                )}
              </AspectRatio>
            </ItemMedia>
            <ItemContent>
              <ItemTitle>{v.title}</ItemTitle>
              {v.notes && <ItemDescription className="line-clamp-1">{v.notes}</ItemDescription>}
            </ItemContent>
            {v.noteCount ? (
              <ItemActions>
                <Badge variant="outline">
                  {v.noteCount} {v.noteCount === 1 ? "nota" : "notas"}
                </Badge>
              </ItemActions>
            ) : null}
          </Item>
        </div>
      ))}
    </ItemGroup>
  );
}

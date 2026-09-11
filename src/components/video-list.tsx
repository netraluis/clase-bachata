import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { formatDuration } from "@/lib/format";
import type { VideoRow } from "@/lib/data";

type Item = VideoRow & { thumbUrl: string | null; noteCount?: number };

// Filas de vídeo: miniatura, título, nota general y número de notas.
export function VideoList({ videos }: { videos: Item[] }) {
  if (videos.length === 0) return <p className="text-sm text-muted-foreground">Sin vídeos.</p>;
  return (
    <ul className="divide-y">
      {videos.map((v) => (
        <li key={v.id}>
          <Link href={`/v/${v.id}`} className="flex items-center gap-3 py-3 hover:bg-muted/50">
            <div className="relative h-14 w-[86px] shrink-0 overflow-hidden rounded-md bg-black">
              {v.thumbUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={v.thumbUrl} alt="" className="h-full w-full object-cover" />
              )}
              {v.duration_s != null && (
                <span className="absolute right-1 bottom-1 rounded bg-black/70 px-1 text-[10px] text-white">
                  {formatDuration(v.duration_s)}
                </span>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{v.title}</p>
              {v.notes && <p className="line-clamp-1 text-xs text-muted-foreground">{v.notes}</p>}
            </div>
            {v.noteCount ? <Badge variant="secondary">{v.noteCount} {v.noteCount === 1 ? "nota" : "notas"}</Badge> : null}
          </Link>
        </li>
      ))}
    </ul>
  );
}

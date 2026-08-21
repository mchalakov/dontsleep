import { useEffect, useState } from "react";
import type { StoredPhoto } from "../types/media";

interface PhotoCardProps {
  photo: StoredPhoto;
  onRemove: (id: string) => void;
}

export function PhotoCard({ photo, onRemove }: PhotoCardProps) {
  const [src] = useState(() => URL.createObjectURL(photo.thumbnail));
  useEffect(() => {
    return () => URL.revokeObjectURL(src);
  }, [src]);
  return (
    <article className="photo-card">
      {src && <img src={src} alt="" />}
      <div>
        <strong title={photo.name}>{photo.name}</strong>
        <span>{Math.round(photo.size / 1024)} KB · {photo.width}×{photo.height}</span>
      </div>
      <button type="button" className="icon-button" onClick={() => onRemove(photo.id)} aria-label={`Remove ${photo.name}`}>
        ×
      </button>
    </article>
  );
}

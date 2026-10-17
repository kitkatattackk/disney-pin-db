import Image from "next/image";
import type { Pin } from "@/lib/pin-types";
export function PinCard({
  pin,
  onSelect,
}: {
  pin: Pin;
  onSelect: (pin: Pin) => void;
}) {
  const image = pin.pin_images.find((i) => i.is_primary) || pin.pin_images[0];
  return (
    <button className="pin-card" onClick={() => onSelect(pin)}>
      <div className="pin-art">
        {image ? (
          <Image
            src={image.storage_url}
            alt=""
            fill
            unoptimized
            sizes="(max-width: 600px) 45vw, 230px"
            className="object-contain"
          />
        ) : (
          <span>No catalog image</span>
        )}
      </div>
      <div className="pin-card-info">
        <span className="eyebrow">
          {pin.release_year || "CATALOG PIN"}
          {pin.price_tier ? ` · ${pin.price_tier}` : ""}
        </span>
        <h3>{pin.name}</h3>
        {pin.matchReason && <p>{pin.matchReason}</p>}
      </div>
    </button>
  );
}

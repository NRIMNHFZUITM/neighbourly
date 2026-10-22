import { TOWNSHIP, type LatLng } from "@neighbourly/shared";
import type L from "leaflet";
import { LocateFixed } from "lucide-react";
import { useState } from "react";
import { Marker, useMapEvents } from "react-leaflet";
import { toast } from "sonner";
import { cn } from "@/lib/cn";
import { Button } from "../ui/button";
import { pinIcon } from "./pins";
import { MapFocus, TownMap } from "./TownMap";

function ClickToPlace({ onChange }: { onChange: (v: LatLng) => void }) {
  useMapEvents({
    click: (e) => onChange({ lat: +e.latlng.lat.toFixed(6), lng: +e.latlng.lng.toFixed(6) }),
  });
  return null;
}

const inside = (p: LatLng) => {
  const b = TOWNSHIP.bounds;
  return p.lat >= b.south - 0.01 && p.lat <= b.north + 0.01 && p.lng >= b.west - 0.01 && p.lng <= b.east + 0.01;
};

export function LocationPicker({ value, onChange, className }: { value: LatLng; onChange: (v: LatLng) => void; className?: string }) {
  const [focus, setFocus] = useState<LatLng | null>(null);
  const [locating, setLocating] = useState(false);

  const useMyLocation = () => {
    if (!navigator.geolocation) {
      toast.error("Your browser can't share its location. Tap the map instead.");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocating(false);
        const p = { lat: +pos.coords.latitude.toFixed(6), lng: +pos.coords.longitude.toFixed(6) };
        if (!inside(p)) {
          toast("You seem to be outside City of Elmina", { description: "Drop the pin on the map where the issue is." });
          return;
        }
        onChange(p);
        setFocus(p);
      },
      () => {
        setLocating(false);
        toast.error("Couldn't get your location. Tap the map instead.");
      },
      { enableHighAccuracy: true, timeout: 8000 },
    );
  };

  return (
    <div className="space-y-2">
      <TownMap center={value} zoom={16} className={cn("h-64 rounded-2xl border border-neutral-200", className)}>
        <ClickToPlace onChange={onChange} />
        <MapFocus target={focus} />
        <Marker
          position={[value.lat, value.lng]}
          draggable
          icon={pinIcon("#d71920", "dot")}
          eventHandlers={{
            dragend: (e) => {
              const ll = (e.target as L.Marker).getLatLng();
              onChange({ lat: +ll.lat.toFixed(6), lng: +ll.lng.toFixed(6) });
            },
          }}
        />
      </TownMap>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-neutral-500">Tap the map or drag the pin to the exact spot.</p>
        <Button variant="outline" size="sm" onClick={useMyLocation} loading={locating}>
          {!locating && <LocateFixed />} Use my location
        </Button>
      </div>
    </div>
  );
}

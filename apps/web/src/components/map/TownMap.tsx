import { TOWNSHIP, type LatLng } from "@neighbourly/shared";
import L from "leaflet";
import { useEffect, useRef, type ReactNode } from "react";
import { MapContainer, TileLayer, useMap } from "react-leaflet";
import { cn } from "@/lib/cn";

const b = TOWNSHIP.bounds;
const MAX_BOUNDS = L.latLngBounds([b.south - 0.04, b.west - 0.04], [b.north + 0.04, b.east + 0.04]);

/** Leaflet sizes itself on mount; containers that animate in need a nudge. */
function FixSize() {
  const map = useMap();
  useEffect(() => {
    const t = setTimeout(() => map.invalidateSize(), 120);
    return () => clearTimeout(t);
  }, [map]);
  return null;
}

export function TownMap({
  center = TOWNSHIP.center,
  zoom = TOWNSHIP.defaultZoom,
  className,
  children,
  interactive = true,
}: {
  center?: LatLng;
  zoom?: number;
  className?: string;
  children?: ReactNode;
  interactive?: boolean;
}) {
  return (
    <div className={cn("isolate overflow-hidden bg-[#ebebeb]", className)}>
      <MapContainer
        center={[center.lat, center.lng]}
        zoom={zoom}
        minZoom={12}
        maxZoom={18}
        maxBounds={MAX_BOUNDS}
        scrollWheelZoom={interactive}
        dragging={interactive}
        zoomControl={interactive}
        doubleClickZoom={interactive}
        touchZoom={interactive}
        keyboard={interactive}
        className="h-full w-full"
      >
        <TileLayer
          url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          maxZoom={19}
        />
        <FixSize />
        {children}
      </MapContainer>
    </div>
  );
}

/** Zooms to show every point once, when the points first arrive. */
export function FitToPoints({ points }: { points: readonly LatLng[] }) {
  const map = useMap();
  const fitted = useRef(false);
  useEffect(() => {
    if (fitted.current || points.length === 0) return;
    fitted.current = true;
    map.fitBounds(L.latLngBounds(points.map((p) => [p.lat, p.lng] as [number, number])), { padding: [36, 36], maxZoom: 16 });
  }, [map, points]);
  return null;
}

/** Pans the map when `target` changes (e.g. after "use my location" or selecting a pin). */
export function MapFocus({ target, zoom }: { target: LatLng | null; zoom?: number }) {
  const map = useMap();
  const lat = target?.lat;
  const lng = target?.lng;
  useEffect(() => {
    if (lat === undefined || lng === undefined) return;
    map.flyTo([lat, lng], zoom ?? Math.max(map.getZoom(), 16), { duration: 0.6 });
  }, [map, lat, lng, zoom]);
  return null;
}

import { Camera, Loader2, ShieldCheck, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { errorMessage } from "@/lib/api";
import { preparePhoto } from "@/lib/image";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";

export interface PickedPhoto {
  blob: Blob;
  previewUrl: string;
}

/** Photo input that resizes in the browser and strips location metadata before upload. */
export function PhotoPicker({
  value,
  onChange,
  label = "Add a photo",
}: {
  value: PickedPhoto | null;
  onChange: (photo: PickedPhoto | null) => void;
  label?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => () => {
    if (value) URL.revokeObjectURL(value.previewUrl);
  }, [value]);

  const handleFile = async (file: File) => {
    setBusy(true);
    try {
      const blob = await preparePhoto(file);
      onChange({ blob, previewUrl: URL.createObjectURL(blob) });
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void handleFile(file);
          e.target.value = "";
        }}
      />
      {value ? (
        <div className="relative overflow-hidden rounded-2xl border border-neutral-200 bg-neutral-100">
          <img src={value.previewUrl} alt="Selected" className="h-56 w-full object-cover" />
          <div className="absolute inset-x-3 bottom-3 flex items-center justify-between gap-2">
            <Badge tone="dark">
              <ShieldCheck /> Location data removed
            </Badge>
            <Button size="sm" variant="outline" onClick={() => onChange(null)}>
              <X /> Remove
            </Button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={busy}
          className="flex h-40 w-full flex-col items-center justify-center gap-1.5 rounded-2xl border-2 border-dashed border-neutral-300 bg-neutral-50 text-neutral-500 transition hover:border-brand-400 hover:bg-brand-50/40"
        >
          {busy ? <Loader2 className="size-7 animate-spin" /> : <Camera className="size-7" />}
          <span className="text-sm font-semibold text-neutral-700">{busy ? "Preparing photo…" : label}</span>
          <span className="text-xs">Location data is removed before upload</span>
        </button>
      )}
    </div>
  );
}

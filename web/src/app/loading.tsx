import { LoadingScreen } from "@/components/ui/LoadingScreen";

export default function Loading() {
  return (
    <div className="fixed inset-0 min-h-screen w-full flex items-center justify-center bg-background z-50">
      <LoadingScreen
        label="Memuat Halaman..."
        subtext="Menyiapkan data MindFlow AI"
        fullHeight
      />
    </div>
  );
}

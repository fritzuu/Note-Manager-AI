import { FileQuestion, Home } from "lucide-react";
import { Button } from "@/components/ui/Button";

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-6">
      <div className="bg-white rounded-3xl border border-border p-8 md:p-12 shadow-card max-w-md w-full text-center space-y-4 animate-scale-in">
        <div className="w-16 h-16 rounded-2xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600 mx-auto shadow-sm">
          <FileQuestion className="w-8 h-8" />
        </div>

        <div>
          <h2 className="text-2xl font-extrabold text-[#1F2937] tracking-tight">
            Halaman Tidak Ditemukan
          </h2>
          <p className="text-sm text-gray-500 mt-1.5 leading-relaxed">
            Halaman yang Anda tuju tidak tersedia, telah dipindahkan, atau link yang Anda buka salah.
          </p>
        </div>

        <div className="flex items-center justify-center gap-3 pt-2">
          <Button
            variant="primary"
            size="md"
            href="/dashboard"
            icon={<Home className="w-4 h-4" />}
          >
            Ke Dashboard
          </Button>
        </div>
      </div>
    </div>
  );
}

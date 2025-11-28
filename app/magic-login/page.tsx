import { Suspense } from "react";
import MagicLoginClient from "./magic-login-client";

export default function MagicLoginPageWrapper() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-slate-600">Memproses tautan login...</p>
          </div>
        </div>
      }
    >
      <MagicLoginClient />
    </Suspense>
  );
}
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();
  
  useEffect(() => {
    // Redirect to products management page
    router.push("/admin/products");
  }, [router]);

  return (
    <div className="min-h-screen bg-[#faf9f7] flex items-center justify-center">
      <div className="text-center">
        <p className="text-gray-600">Redirecting...</p>
      </div>
    </div>
  );
}

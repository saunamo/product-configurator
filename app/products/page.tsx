"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { Product } from "@/types/product";

const PLACEHOLDER =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='800' height='600' viewBox='0 0 800 600'%3E%3Crect width='800' height='600' fill='%23E8E4DF'/%3E%3C/svg%3E";

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/products")
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((data) => setProducts(data.products || []))
      .catch((e) => console.error("Failed to load products:", e))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div
      className="min-h-screen"
      style={{
        background: "linear-gradient(160deg, #f5f2ef 0%, #ede9e4 100%)",
      }}
    >
      <div className="pt-16 pb-10 px-6 text-center">
        <div className="flex justify-center mb-10">
          <Image
            src="/saunamo-logo.webp"
            alt="Saunamo"
            width={220}
            height={66}
            className="h-14 w-auto object-contain"
          />
        </div>
        <h1
          className="text-4xl md:text-5xl font-bold tracking-tight mb-4"
          style={{ color: "#1e2022", fontFamily: "Georgia, serif" }}
        >
          Choose your sauna
        </h1>
        <p className="text-lg max-w-xl mx-auto" style={{ color: "#6b6560" }}>
          Select a model to configure your sauna and get a quote.
        </p>
      </div>

      <div className="max-w-7xl mx-auto px-4 pb-24">
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {[...Array(6)].map((_, i) => (
              <div
                key={i}
                className="rounded-2xl overflow-hidden animate-pulse"
                style={{ background: "#e8e3dd" }}
              >
                <div className="aspect-[4/3] bg-[#ddd8d2]" />
                <div className="p-6 space-y-3">
                  <div className="h-5 bg-[#ddd8d2] rounded w-3/4" />
                  <div className="h-10 bg-[#ddd8d2] rounded-xl w-full mt-4" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {products.map((product) => {
              const imgSrc =
                (product as any).imageUrl || PLACEHOLDER;
              return (
                <div
                  key={product.id}
                  className="group rounded-2xl overflow-hidden flex flex-col"
                  style={{
                    background: "#ffffff",
                    boxShadow: "0 2px 16px rgba(0,0,0,0.07)",
                    transition:
                      "box-shadow 0.25s ease, transform 0.25s ease",
                  }}
                  onMouseEnter={(e) => {
                    (
                      e.currentTarget as HTMLDivElement
                    ).style.boxShadow = "0 8px 32px rgba(0,0,0,0.13)";
                    (
                      e.currentTarget as HTMLDivElement
                    ).style.transform = "translateY(-3px)";
                  }}
                  onMouseLeave={(e) => {
                    (
                      e.currentTarget as HTMLDivElement
                    ).style.boxShadow = "0 2px 16px rgba(0,0,0,0.07)";
                    (e.currentTarget as HTMLDivElement).style.transform =
                      "translateY(0)";
                  }}
                >
                  <div
                    className="relative w-full overflow-hidden"
                    style={{
                      aspectRatio: "4/3",
                      background: "#f0ece7",
                    }}
                  >
                    <Image
                      src={imgSrc}
                      alt={product.name}
                      fill
                      className="object-cover transition-transform duration-500 group-hover:scale-105"
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                      unoptimized={imgSrc.startsWith("data:")}
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = PLACEHOLDER;
                      }}
                    />
                  </div>
                  <div className="flex flex-col flex-1 p-6">
                    <h2
                      className="text-lg font-semibold mb-5 leading-snug"
                      style={{ color: "#1e2022" }}
                    >
                      {product.name}
                    </h2>
                    <div className="mt-auto">
                      <Link
                        href={`/products/${product.slug}`}
                        className="block w-full text-center py-3 px-6 rounded-xl font-semibold text-sm tracking-wide transition-all duration-200"
                        style={{
                          background: "#303337",
                          color: "#ffffff",
                          letterSpacing: "0.04em",
                        }}
                        onMouseEnter={(e) => {
                          (
                            e.currentTarget as HTMLAnchorElement
                          ).style.background = "#1a1d20";
                        }}
                        onMouseLeave={(e) => {
                          (
                            e.currentTarget as HTMLAnchorElement
                          ).style.background = "#303337";
                        }}
                      >
                        Open configurator
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

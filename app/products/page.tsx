"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Product } from "@/types/product";

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadProducts = async () => {
      try {
        const response = await fetch("/api/products");
        if (response.ok) {
          const data = await response.json();
          setProducts(data.products || []);
        } else {
          console.error("Failed to load products:", response.status);
        }
      } catch (error) {
        console.error("Error loading products:", error);
      } finally {
        setLoading(false);
      }
    };
    loadProducts();
  }, []);

  const handleDelete = async (productId: string) => {
    if (confirm("Are you sure you want to delete this product? This will also delete all its configuration.")) {
      try {
        const response = await fetch(`/api/products?productId=${productId}`, {
          method: "DELETE",
        });
        if (response.ok) {
          // Reload products
          const productsResponse = await fetch("/api/products");
          if (productsResponse.ok) {
            const data = await productsResponse.json();
            setProducts(data.products || []);
          }
        } else {
          alert("Failed to delete product");
        }
      } catch (error) {
        console.error("Error deleting product:", error);
        alert("Failed to delete product");
      }
    }
  };

  return (
    <div className="min-h-screen bg-[#faf9f7] p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Products</h1>
            <p className="text-gray-600 mt-2">Manage your product configurators</p>
          </div>
          <Link
            href="/admin/products/new"
            className="px-6 py-3 bg-green-800 text-white rounded-lg hover:bg-green-900 font-medium"
          >
            + Create New Product
          </Link>
        </div>

        {loading ? (
          <div className="bg-white rounded-lg shadow-sm p-12 text-center">
            <p className="text-gray-600">Loading products...</p>
          </div>
        ) : products.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm p-12 text-center">
            <p className="text-gray-600 mb-4">No products yet.</p>
            <Link
              href="/admin/products/new"
              className="inline-block px-6 py-3 bg-green-800 text-white rounded-lg hover:bg-green-900 font-medium"
            >
              Create Your First Product
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {products.map((product) => (
              <div
                key={product.id}
                className="bg-white rounded-lg shadow-sm p-6 hover:shadow-md transition-shadow"
              >
                <h3 className="text-xl font-bold text-gray-900 mb-2">{product.name}</h3>
                <p className="text-sm text-gray-500 mb-4">ID: {product.id}</p>
                <div className="flex gap-2">
                  <Link
                    href={`/products/${product.slug}/configurator/rear-glass-wall`}
                    className="flex-1 px-4 py-2 bg-green-800 text-white rounded hover:bg-green-900 text-center text-sm font-medium"
                  >
                    View Configurator
                  </Link>
                  <Link
                    href={`/admin/products/${product.id}`}
                    className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 text-center text-sm font-medium"
                  >
                    Configure
                  </Link>
                  <button
                    onClick={() => handleDelete(product.id)}
                    className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 text-sm font-medium"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}


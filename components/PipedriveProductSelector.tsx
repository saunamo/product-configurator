"use client";

import { useState, useEffect, useRef } from "react";

interface PipedriveProduct {
  id: number;
  name: string;
  price: number;
  code?: string;
  unit?: string;
}

interface PipedriveProductSelectorProps {
  value?: number; // Pipedrive product ID
  onChange: (productId: number | undefined, product?: PipedriveProduct) => void;
  onPriceUpdate?: (price: number) => void;
}

export default function PipedriveProductSelector({
  value,
  onChange,
  onPriceUpdate,
}: PipedriveProductSelectorProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [products, setProducts] = useState<PipedriveProduct[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<PipedriveProduct | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Load selected product details if value is set
  useEffect(() => {
    if (value && (!selectedProduct || selectedProduct.id !== value)) {
      fetchProductDetails(value);
    }
  }, [value]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const fetchProductDetails = async (productId: number) => {
    try {
      const response = await fetch(`/api/pipedrive/products?id=${productId}`);
      const data = await response.json();
      if (data.success && data.product) {
        const product = {
          id: data.product.id,
          name: data.product.name,
          price: data.product.prices?.[0]?.price || data.product.price || 0,
          code: data.product.code,
          unit: data.product.unit,
        };
        setSelectedProduct(product);
        setSearchTerm(product.name); // Set search term to show product name
        if (onPriceUpdate) {
          onPriceUpdate(product.price);
        }
      }
    } catch (error) {
      console.error("Failed to fetch product details:", error);
    }
  };

  const searchProducts = async (term: string) => {
    if (term.length < 2) {
      setProducts([]);
      return;
    }

    setIsLoading(true);
    try {
      // Fetch all products with pagination - this will get all products from Pipedrive
      const response = await fetch(`/api/pipedrive/products?term=${encodeURIComponent(term)}`);
      const data = await response.json();
      if (data.success) {
        let mappedProducts = (data.products || []).map((p: any) => ({
          id: p.id,
          name: p.name,
          price: p.prices?.[0]?.price || p.price || 0,
          code: p.code,
          unit: p.unit,
        }));

        // Client-side filtering (always filter client-side for better control)
        const searchLower = term.toLowerCase();
        mappedProducts = mappedProducts.filter((p: PipedriveProduct) => {
          const nameMatch = p.name?.toLowerCase().includes(searchLower);
          const codeMatch = p.code?.toLowerCase().includes(searchLower);
          return nameMatch || codeMatch;
        });

        // Sort by relevance: exact matches first, then name matches, then code matches
        mappedProducts.sort((a: PipedriveProduct, b: PipedriveProduct) => {
          const aName = a.name?.toLowerCase() || "";
          const bName = b.name?.toLowerCase() || "";
          const aCode = a.code?.toLowerCase() || "";
          const bCode = b.code?.toLowerCase() || "";
          
          // Exact match gets highest priority
          if (aName === searchLower) return -1;
          if (bName === searchLower) return 1;
          
          // Starts with search term gets second priority
          if (aName.startsWith(searchLower)) return -1;
          if (bName.startsWith(searchLower)) return 1;
          
          // Name contains gets third priority
          if (aName.includes(searchLower) && !bName.includes(searchLower)) return -1;
          if (bName.includes(searchLower) && !aName.includes(searchLower)) return 1;
          
          // Code match gets fourth priority
          if (aCode.includes(searchLower) && !bCode.includes(searchLower)) return -1;
          if (bCode.includes(searchLower) && !aCode.includes(searchLower)) return 1;
          
          // Otherwise alphabetical
          return aName.localeCompare(bName);
        });

        // Limit to 200 for display (increased from 100)
        const displayLimit = 200;
        const totalMatches = mappedProducts.length;
        mappedProducts = mappedProducts.slice(0, displayLimit);
        
        setProducts(mappedProducts);
        
        // Show message if there are more results than displayed
        if (totalMatches > displayLimit) {
          console.log(`Found ${totalMatches} matching products, showing top ${displayLimit}. Try a more specific search term to narrow results.`);
        }
      }
    } catch (error) {
      console.error("Failed to search products:", error);
      setProducts([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const term = e.target.value;
    setSearchTerm(term);
    searchProducts(term);
    setIsOpen(true);
  };

  const handleSelectProduct = (product: PipedriveProduct) => {
    setSelectedProduct(product);
    setSearchTerm(product.name);
    setIsOpen(false);
    onChange(product.id, product);
    if (onPriceUpdate) {
      onPriceUpdate(product.price);
    }
  };

  const handleClear = () => {
    setSelectedProduct(null);
    setSearchTerm("");
    setIsOpen(false);
    onChange(undefined);
  };

  return (
    <div className="relative" ref={containerRef}>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        Pipedrive Product
        <span className="text-xs text-gray-500 ml-2">(from product catalog)</span>
      </label>
      
      <div className="relative">
        <input
          type="text"
          value={searchTerm}
          onChange={handleSearchChange}
          onFocus={() => setIsOpen(true)}
          placeholder="Search Pipedrive products..."
          className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-green-800 focus:border-green-800 text-sm"
        />
        {selectedProduct && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            ×
          </button>
        )}
      </div>

      {selectedProduct && (
        <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded text-sm">
          <div className="font-medium text-green-900">{selectedProduct.name}</div>
          <div className="text-green-700">
            Price: ${selectedProduct.price.toFixed(2)}
            {selectedProduct.code && ` • Code: ${selectedProduct.code}`}
          </div>
        </div>
      )}

      {isOpen && (searchTerm.length >= 2 || products.length > 0) && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-96 overflow-auto">
          {isLoading ? (
            <div className="p-4 text-center text-gray-500">Searching...</div>
          ) : products.length === 0 ? (
            <div className="p-4 text-center text-gray-500">
              {searchTerm.length < 2 
                ? "Type at least 2 characters to search" 
                : "No products found. Try a different search term."}
            </div>
          ) : (
            <>
              <div className="px-4 py-2 bg-gray-50 border-b border-gray-200 text-xs text-gray-600">
                Found {products.length} product{products.length !== 1 ? 's' : ''}
                {products.length === 200 && " (showing first 200, try a more specific search)"}
              </div>
              <ul className="py-1">
                {products.map((product) => (
                  <li
                    key={product.id}
                    onClick={() => handleSelectProduct(product)}
                    className="px-4 py-2 hover:bg-gray-100 cursor-pointer"
                  >
                    <div className="font-medium text-gray-900">{product.name}</div>
                    <div className="text-sm text-gray-600">
                      ${product.price.toFixed(2)}
                      {product.code && ` • ${product.code}`}
                    </div>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      )}
    </div>
  );
}


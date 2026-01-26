"use client";

interface OptionSectionProps {
  title: string;
  description?: string;
  subheader?: string; // Subheader text displayed below the title
  subtext?: string; // Text displayed below the options list
  promoBanner?: string;
  showMoreInfo?: boolean; // Deprecated: use moreInfoUrl instead
  moreInfoUrl?: string; // URL for the "More information" button (if provided, button is shown)
  children: React.ReactNode;
}

export default function OptionSection({
  title,
  description,
  subheader,
  subtext,
  promoBanner,
  showMoreInfo = false, // Deprecated: kept for backward compatibility
  moreInfoUrl,
  children,
}: OptionSectionProps) {
  // Show button if moreInfoUrl is provided, or if showMoreInfo is true (backward compatibility)
  const shouldShowMoreInfo = moreInfoUrl !== undefined || showMoreInfo;
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">{title}</h2>
        {subheader && (
          <p className="text-gray-600 text-sm mb-4 leading-relaxed" style={{ color: "#908F8D" }}>{subheader}</p>
        )}
        {description && (
          <p className="text-gray-600 text-sm mb-4 leading-relaxed">{description}</p>
        )}
        {promoBanner && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4">
            <p className="text-sm text-green-800">{promoBanner}</p>
          </div>
        )}
      </div>
      <div className="space-y-3">{children}</div>
      {shouldShowMoreInfo && (
        <div className="mt-4 mb-16">
          {moreInfoUrl ? (
            <a
              href={moreInfoUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block px-4 py-2 bg-[#303337] text-white rounded-lg text-sm font-medium hover:opacity-90 transition-opacity"
            >
              More information
            </a>
          ) : (
            <button className="px-4 py-2 bg-[#303337] text-white rounded-lg text-sm font-medium hover:opacity-90 transition-opacity">
              More information
            </button>
          )}
        </div>
      )}
      {subtext && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <p className="text-sm text-gray-600 leading-relaxed">{subtext}</p>
        </div>
      )}
    </div>
  );
}



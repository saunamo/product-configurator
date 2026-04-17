const GENERIC_DELIVERY_PRODUCT_ID = 18212;

// Dedicated UK transport products in GBP.
// Source of truth: https://docs.google.com/spreadsheets/d/17MfNmxYOf0SUvHOiFHweVFte0QolzjqW/edit?gid=488432593#gid=488432593
// If the sheet has no explicit UK price, use a similar-size UK product price (currently matching 2.5x PT in the verified rows).
const UK_TRANSPORT_PRODUCT_IDS: Record<string, number> = {
  "aisti-120": 18600,
  "aisti-150": 18653,
  "aisti-220": 18654,
  "aura-110": 18655,
  "aura-150": 18656,
  "barrel-220": 18657,
  "barrel-280": 18658,
  "cube-125": 18659,
  "cube-220": 18660,
  "cube-300": 18661,
  "hiki-l": 18663,
  "hiki-s": 18662,
  "thermo-black-110": 18605,
  "thermo-black-150": 18610,
  "thermo-black-220-plus": 18615,
};

export function getTransportPipedriveId(productSlug?: string | null): number | null {
  if (!productSlug) {
    return GENERIC_DELIVERY_PRODUCT_ID;
  }

  return UK_TRANSPORT_PRODUCT_IDS[productSlug] ?? GENERIC_DELIVERY_PRODUCT_ID;
}

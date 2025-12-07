import { useEffect, useState } from "react";

type GeoState = { country: string | null; loading: boolean; error: string | null };

/**
 * Minimal geo hook.
 * In production, replace with backend geo-IP endpoint or native SDK.
 */
export const useGeoCountry = () => {
  const [state, setState] = useState<GeoState>({
    country: null,
    loading: true,
    error: null
  });

  useEffect(() => {
    let cancelled = false;
    const fetchGeo = async () => {
      try {
        // TODO: swap with backend call; fallback assumes India for demo.
        const simulatedCountry = "IN";
        if (!cancelled) {
          setState({ country: simulatedCountry, loading: false, error: null });
        }
      } catch (err) {
        if (!cancelled) {
          setState({ country: null, loading: false, error: "Geo lookup failed" });
        }
      }
    };
    fetchGeo();
    return () => {
      cancelled = true;
    };
  }, []);

  return state;
};

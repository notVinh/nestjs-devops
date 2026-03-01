/**
 * Utility functions for location calculations
 */

export interface Location {
  latitude: number;
  longitude: number;
}

/**
 * Calculate the distance between two points using the Haversine formula
 * @param point1 First location point
 * @param point2 Second location point
 * @returns Distance in meters
 */
export function calculateDistance(point1: Location, point2: Location): number {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = (point1.latitude * Math.PI) / 180; // φ, λ in radians
  const φ2 = (point2.latitude * Math.PI) / 180;
  const Δφ = ((point2.latitude - point1.latitude) * Math.PI) / 180;
  const Δλ = ((point2.longitude - point1.longitude) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  
  return R * c; // Distance in meters
}

/**
 * Check if a location is within the allowed radius of a factory
 * @param userLocation User's current location
 * @param factoryLocation Factory's location
 * @param allowedRadiusMeters Allowed radius in meters (default: 100m)
 * @returns true if location is within allowed radius
 */
export function isLocationWithinRadius(
  userLocation: Location,
  factoryLocation: Location,
  allowedRadiusMeters: number = 200
): boolean {
  const distance = calculateDistance(userLocation, factoryLocation);
  return distance <= allowedRadiusMeters;
}

/**
 * Check if a location is within the allowed radius of any factory location
 * @param userLocation User's current location
 * @param factoryLocations Array of factory locations (main location + branch locations)
 * @param allowedRadiusMeters Allowed radius in meters (default: 200m)
 * @returns Object with isWithinRadius flag and the closest location info
 */
export function isLocationWithinAnyRadius(
  userLocation: Location,
  factoryLocations: Location[],
  allowedRadiusMeters: number = 200
): { isWithinRadius: boolean; closestLocation?: Location; distance?: number } {
  if (!factoryLocations || factoryLocations.length === 0) {
    return { isWithinRadius: false };
  }

  let minDistance = Infinity;
  let closestLocation: Location | undefined;

  for (const factoryLocation of factoryLocations) {
    const distance = calculateDistance(userLocation, factoryLocation);
    if (distance < minDistance) {
      minDistance = distance;
      closestLocation = factoryLocation;
    }
    if (distance <= allowedRadiusMeters) {
      return { isWithinRadius: true, closestLocation: factoryLocation, distance };
    }
  }

  return { isWithinRadius: false, closestLocation, distance: minDistance };
}

/**
 * Get distance in a human-readable format
 * @param distanceMeters Distance in meters
 * @returns Formatted distance string
 */
export function formatDistance(distanceMeters: number): string {
  if (distanceMeters < 1000) {
    return `${Math.round(distanceMeters)}m`;
  } else {
    return `${(distanceMeters / 1000).toFixed(1)}km`;
  }
}

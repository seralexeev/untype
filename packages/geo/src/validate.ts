import { valid } from 'geojson-validation';

import { GeoJSON } from './geojson';

export const isGeoJSON = (data: unknown): data is GeoJSON => valid(data);

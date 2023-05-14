import { Point, Position } from './geojson';

export const coordinatesToLatLngLiteral = (coordinates: Position) => {
    return {
        lat: coordinates[1],
        lng: coordinates[0],
    };
};

export const pointToLatLngLiteral = ({ coordinates }: Point) => {
    return coordinatesToLatLngLiteral(coordinates);
};

export const positionToPoint = (coordinates: Position): Point => {
    return { type: 'Point', coordinates };
};

export const geojsonSelector = {
    geojson: true,
} as const;

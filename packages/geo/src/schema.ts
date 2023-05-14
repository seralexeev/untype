import { z } from 'zod';

import {
    BBox,
    Feature,
    FeatureCollection,
    GeoJSON,
    GeoJsonProperties,
    Geometry,
    GeometryCollection,
    LineString,
    MultiLineString,
    MultiPoint,
    MultiPolygon,
    Point,
    Polygon,
    Position,
} from './geojson';

export const PositionSchema: z.ZodType<Position> = z.tuple([z.number(), z.number()]);

export const BBoxSchema: z.ZodType<BBox> = z.union([
    z.tuple([z.number(), z.number(), z.number(), z.number()]),
    z.tuple([z.number(), z.number(), z.number(), z.number(), z.number(), z.number()]),
]);

export const PointSchema: z.ZodType<Point> = z.object({
    type: z.literal('Point'),
    coordinates: PositionSchema,
    bbox: BBoxSchema.optional(),
});

export const MultiPointSchema: z.ZodType<MultiPoint> = z.object({
    type: z.literal('MultiPoint'),
    coordinates: z.array(PositionSchema),
    bbox: BBoxSchema.optional(),
});

export const LineStringSchema: z.ZodType<LineString> = z.object({
    type: z.literal('LineString'),
    coordinates: z.array(PositionSchema),
    bbox: BBoxSchema.optional(),
});

export const MultiLineStringSchema: z.ZodType<MultiLineString> = z.object({
    type: z.literal('MultiLineString'),
    coordinates: z.array(z.array(PositionSchema)),
    bbox: BBoxSchema.optional(),
});

export const PolygonSchema: z.ZodType<Polygon> = z.object({
    type: z.literal('Polygon'),
    coordinates: z.array(z.array(PositionSchema)),
    bbox: BBoxSchema.optional(),
});

export const MultiPolygonSchema: z.ZodType<MultiPolygon> = z.object({
    type: z.literal('MultiPolygon'),
    coordinates: z.array(z.array(z.array(PositionSchema))),
    bbox: BBoxSchema.optional(),
});

export const GeometrySchema: z.ZodType<Geometry> = z.lazy(() =>
    z.union([
        PointSchema,
        MultiPointSchema,
        LineStringSchema,
        MultiLineStringSchema,
        PolygonSchema,
        MultiPolygonSchema,
        GeometryCollectionSchema,
    ]),
);

export const GeometryCollectionSchema: z.ZodType<GeometryCollection> = z.lazy(() =>
    z.object({
        type: z.literal('GeometryCollection'),
        geometries: z.array(GeometrySchema),
        bbox: BBoxSchema.optional(),
    }),
);

export const GeoJsonPropertiesSchema: z.ZodType<GeoJsonProperties> = z.record(z.string(), z.any()).nullable();

export const FeatureSchema: z.ZodType<Feature> = z.object({
    type: z.literal('Feature'),
    geometry: GeometrySchema,
    id: z.union([z.string(), z.number()]).optional(),
    properties: GeoJsonPropertiesSchema,
    bbox: BBoxSchema.optional(),
});

export const FeatureCollectionSchema: z.ZodType<FeatureCollection> = z.object({
    type: z.literal('FeatureCollection'),
    features: z.array(FeatureSchema),
    bbox: BBoxSchema.optional(),
});

export const GeoJSONSchema: z.ZodType<GeoJSON> = z.union([GeometrySchema, FeatureSchema, FeatureCollectionSchema]);

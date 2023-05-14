import { describe, expect, it } from '@jest/globals';

import {
    BBoxSchema,
    FeatureCollectionSchema,
    FeatureSchema,
    GeometrySchema,
    LineStringSchema,
    MultiLineStringSchema,
    MultiPointSchema,
    MultiPolygonSchema,
    PointSchema,
    PolygonSchema,
    PositionSchema,
} from '../schema';

describe('schema', () => {
    describe('Position', () => {
        it('parses', () => {
            const result = PositionSchema.safeParse([151.2129036, -33.8848503]);
            expect(result.success).toBe(true);
        });
        it('rejects 3d coord', () => {
            const result = PositionSchema.safeParse([151.2129036, -33.8848503, 0]);
            expect(result.success).toBe(false);
        });
        it('rejects 1d coord', () => {
            const result = PositionSchema.safeParse([151.2129036]);
            expect(result.success).toBe(false);
        });
    });
    describe('BBox', () => {
        it('parses rect', () => {
            const result = BBoxSchema.safeParse([151.2129036, -33.8848503, 151.3129036, -33.7848503]);
            expect(result.success).toBe(true);
        });
        it('parses box', () => {
            const result = BBoxSchema.safeParse([151.2129036, -33.8848503, 0, 151.3129036, -33.7848503, 1]);
            expect(result.success).toBe(true);
        });
        it('rejects 2 extents', () => {
            const result = BBoxSchema.safeParse([151.2129036, -33.8848503]);
            expect(result.success).toBe(false);
        });
    });
    describe('Point', () => {
        it('parses', () => {
            const result = PointSchema.safeParse({ type: 'Point', coordinates: [151.2129036, -33.8848503] });
            expect(result.success).toBe(true);
        });
        it('rejects 3d coord', () => {
            const result = PointSchema.safeParse({ type: 'Point', coordinates: [151.2129036, -33.8848503, 0] });
            expect(result.success).toBe(false);
        });
        it('rejects 1d coord', () => {
            const result = PointSchema.safeParse({ type: 'Point', coordinates: [151.2129036] });
            expect(result.success).toBe(false);
        });
        it('rejects different type', () => {
            const result = PointSchema.safeParse({ type: 'Pnt', coordinates: [151.2129036, -33.8848503] });
            expect(result.success).toBe(false);
        });
    });
    describe('MultiPoint', () => {
        it('parses', () => {
            const result = MultiPointSchema.safeParse({
                type: 'MultiPoint',
                coordinates: [
                    [151.2129036, -33.8848503],
                    [151, -33],
                ],
            });
            expect(result.success).toBe(true);
        });
        it('rejects 3d coord', () => {
            const result = MultiPointSchema.safeParse({
                type: 'MultiPoint',
                coordinates: [
                    [151.2129036, -33.8848503, 0],
                    [151, -33, 0],
                ],
            });
            expect(result.success).toBe(false);
        });
        it('rejects 1d coord', () => {
            const result = MultiPointSchema.safeParse({ type: 'MultiPoint', coordinates: [[151.2129036], [151]] });
            expect(result.success).toBe(false);
        });
        it('rejects different type', () => {
            const result = MultiPointSchema.safeParse({
                type: 'MPoint',
                coordinates: [
                    [151.2129036, -33.8848503],
                    [151, -33],
                ],
            });
            expect(result.success).toBe(false);
        });
    });
    describe('LineString', () => {
        it('parses', () => {
            const result = LineStringSchema.safeParse({
                type: 'LineString',
                coordinates: [
                    [151.2129036, -33.8848503],
                    [151, -33],
                ],
            });
            expect(result.success).toBe(true);
        });
        it('rejects 3d coord', () => {
            const result = LineStringSchema.safeParse({
                type: 'LineString',
                coordinates: [
                    [151.2129036, -33.8848503, 0],
                    [151, -33, 0],
                ],
            });
            expect(result.success).toBe(false);
        });
        it('rejects 1d coord', () => {
            const result = LineStringSchema.safeParse({ type: 'LineString', coordinates: [[151.2129036], [151]] });
            expect(result.success).toBe(false);
        });
        it('rejects different type', () => {
            const result = LineStringSchema.safeParse({
                type: 'Lines',
                coordinates: [
                    [151.2129036, -33.8848503],
                    [151, -33],
                ],
            });
            expect(result.success).toBe(false);
        });
    });
    describe('MultiLineString', () => {
        it('parses', () => {
            const result = MultiLineStringSchema.safeParse({
                type: 'MultiLineString',
                coordinates: [
                    [
                        [151.2129036, -33.8848503],
                        [151, -33],
                    ],
                ],
            });
            expect(result.success).toBe(true);
        });
        it('rejects 3d coord', () => {
            const result = MultiLineStringSchema.safeParse({
                type: 'MultiLineString',
                coordinates: [
                    [
                        [151.2129036, -33.8848503, 0],
                        [151, -33, 0],
                    ],
                ],
            });
            expect(result.success).toBe(false);
        });
        it('rejects 1d coord', () => {
            const result = MultiLineStringSchema.safeParse({ type: 'MultiLineString', coordinates: [[[151.2129036], [151]]] });
            expect(result.success).toBe(false);
        });
        it('rejects different type', () => {
            const result = MultiLineStringSchema.safeParse({
                type: 'MultiLines',
                coordinates: [
                    [
                        [151.2129036, -33.8848503],
                        [151, -33],
                    ],
                ],
            });
            expect(result.success).toBe(false);
        });
    });
    describe('Polygon', () => {
        it('parses', () => {
            const result = PolygonSchema.safeParse({
                type: 'Polygon',
                coordinates: [
                    [
                        [38.14053221040234, -2.096644333817551],
                        [38.110867722229216, -2.422699522478794],
                        [38.825781887194296, -2.3456386236778854],
                        [38.43124419449501, -1.9750967266667487],
                        [38.14053221040234, -2.096644333817551],
                    ],
                ],
            });
            expect(result.success).toBe(true);
        });
        it('rejects 3d coord', () => {
            const result = PolygonSchema.safeParse({
                type: 'Polygon',
                coordinates: [
                    [
                        [38.14053221040234, -2.096644333817551, 0],
                        [38.110867722229216, -2.422699522478794, 0],
                        [38.825781887194296, -2.3456386236778854, 0],
                        [38.43124419449501, -1.9750967266667487, 0],
                        [38.14053221040234, -2.096644333817551, 0],
                    ],
                ],
            });
            expect(result.success).toBe(false);
        });
        it('rejects 1d coord', () => {
            const result = PolygonSchema.safeParse({
                type: 'Polygon',
                coordinates: [
                    [[38.14053221040234], [38.110867722229216], [38.825781887194296], [38.43124419449501], [38.14053221040234]],
                ],
            });
            expect(result.success).toBe(false);
        });
        it('rejects different type', () => {
            const result = PolygonSchema.safeParse({
                type: 'ClosedShape',
                coordinates: [
                    [
                        [38.14053221040234, -2.096644333817551],
                        [38.110867722229216, -2.422699522478794],
                        [38.825781887194296, -2.3456386236778854],
                        [38.43124419449501, -1.9750967266667487],
                        [38.14053221040234, -2.096644333817551],
                    ],
                ],
            });
            expect(result.success).toBe(false);
        });
    });
    describe('MultiPolygon', () => {
        it('parses', () => {
            const result = MultiPolygonSchema.safeParse({
                type: 'MultiPolygon',
                coordinates: [
                    [
                        [
                            [38.14053221040234, -2.096644333817551],
                            [38.110867722229216, -2.422699522478794],
                            [38.825781887194296, -2.3456386236778854],
                            [38.43124419449501, -1.9750967266667487],
                            [38.14053221040234, -2.096644333817551],
                        ],
                    ],
                ],
            });
            expect(result.success).toBe(true);
        });
        it('rejects 3d coord', () => {
            const result = MultiPolygonSchema.safeParse({
                type: 'MultiPolygon',
                coordinates: [
                    [
                        [
                            [38.14053221040234, -2.096644333817551, 0],
                            [38.110867722229216, -2.422699522478794, 0],
                            [38.825781887194296, -2.3456386236778854, 0],
                            [38.43124419449501, -1.9750967266667487, 0],
                            [38.14053221040234, -2.096644333817551, 0],
                        ],
                    ],
                ],
            });
            expect(result.success).toBe(false);
        });
        it('rejects 1d coord', () => {
            const result = MultiPolygonSchema.safeParse({
                type: 'MultiPolygon',
                coordinates: [
                    [
                        [
                            [38.14053221040234],
                            [38.110867722229216],
                            [38.825781887194296],
                            [38.43124419449501],
                            [38.14053221040234],
                        ],
                    ],
                ],
            });
            expect(result.success).toBe(false);
        });
        it('rejects different type', () => {
            const result = MultiPolygonSchema.safeParse({
                type: 'MultiShape',
                coordinates: [
                    [
                        [
                            [38.14053221040234, -2.096644333817551],
                            [38.110867722229216, -2.422699522478794],
                            [38.825781887194296, -2.3456386236778854],
                            [38.43124419449501, -1.9750967266667487],
                            [38.14053221040234, -2.096644333817551],
                        ],
                    ],
                ],
            });
            expect(result.success).toBe(false);
        });
    });
    describe('geometry', () => {
        it('Point', () => {
            const result = GeometrySchema.safeParse({ type: 'Point', coordinates: [151.2129036, -33.8848503] });
            expect(result.success).toBe(true);
        });
        it('MultiPoint', () => {
            const result = GeometrySchema.safeParse({
                type: 'MultiPoint',
                coordinates: [
                    [151.2129036, -33.8848503],
                    [151, -33],
                ],
            });
            expect(result.success).toBe(true);
        });
        it('LineString', () => {
            const result = GeometrySchema.safeParse({
                type: 'LineString',
                coordinates: [
                    [151.2129036, -33.8848503],
                    [151, -33],
                ],
            });
            expect(result.success).toBe(true);
        });
        it('MultiLineString', () => {
            const result = GeometrySchema.safeParse({
                type: 'MultiLineString',
                coordinates: [
                    [
                        [151.2129036, -33.8848503],
                        [151, -33],
                    ],
                ],
            });
            expect(result.success).toBe(true);
        });
        it('Polygon', () => {
            const result = GeometrySchema.safeParse({
                type: 'Polygon',
                coordinates: [
                    [
                        [38.14053221040234, -2.096644333817551],
                        [38.110867722229216, -2.422699522478794],
                        [38.825781887194296, -2.3456386236778854],
                        [38.43124419449501, -1.9750967266667487],
                        [38.14053221040234, -2.096644333817551],
                    ],
                ],
            });
            expect(result.success).toBe(true);
        });
        it('MultiPolygon', () => {
            const result = GeometrySchema.safeParse({
                type: 'MultiPolygon',
                coordinates: [
                    [
                        [
                            [38.14053221040234, -2.096644333817551],
                            [38.110867722229216, -2.422699522478794],
                            [38.825781887194296, -2.3456386236778854],
                            [38.43124419449501, -1.9750967266667487],
                            [38.14053221040234, -2.096644333817551],
                        ],
                    ],
                ],
            });
            expect(result.success).toBe(true);
        });
        it('GeometryCollection', () => {
            const result = GeometrySchema.safeParse({
                type: 'GeometryCollection',
                geometries: [
                    {
                        type: 'Polygon',
                        coordinates: [
                            [
                                [38.14053221040234, -2.096644333817551],
                                [38.110867722229216, -2.422699522478794],
                                [38.825781887194296, -2.3456386236778854],
                                [38.43124419449501, -1.9750967266667487],
                                [38.14053221040234, -2.096644333817551],
                            ],
                        ],
                    },
                ],
            });
            expect(result.success).toBe(true);
        });
    });
    describe('Feature', () => {
        it('parses', () => {
            const result = FeatureSchema.safeParse({
                type: 'Feature',
                properties: {},
                geometry: {
                    type: 'Polygon',
                    coordinates: [
                        [
                            [38.14053221040234, -2.096644333817551],
                            [38.110867722229216, -2.422699522478794],
                            [38.825781887194296, -2.3456386236778854],
                            [38.43124419449501, -1.9750967266667487],
                            [38.14053221040234, -2.096644333817551],
                        ],
                    ],
                },
            });
            expect(result.success).toBe(true);
        });
    });
    describe('FeatureCollection', () => {
        it('parses', () => {
            const result = FeatureCollectionSchema.safeParse({
                type: 'FeatureCollection',
                features: [
                    {
                        type: 'Feature',
                        properties: {},
                        geometry: {
                            type: 'Polygon',
                            coordinates: [
                                [
                                    [38.14053221040234, -2.096644333817551],
                                    [38.110867722229216, -2.422699522478794],
                                    [38.825781887194296, -2.3456386236778854],
                                    [38.43124419449501, -1.9750967266667487],
                                    [38.14053221040234, -2.096644333817551],
                                ],
                            ],
                        },
                    },
                ],
            });
            expect(result.success).toBe(true);
        });
    });
});

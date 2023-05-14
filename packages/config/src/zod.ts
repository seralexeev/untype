import { UnreachableError } from '@untype/core';
import { z } from 'zod';

const { ZodFirstPartyTypeKind: TypeName } = z;
type PreprocessType = (arg: string | undefined) => unknown;

export const getStringPreprocessor = (schema: z.ZodFirstPartySchemaTypes): PreprocessType => {
    const def = schema._def;
    const { typeName } = def;

    switch (typeName) {
        case TypeName.ZodString:
        case TypeName.ZodEnum:
        case TypeName.ZodUndefined:
            return (arg) => arg;

        case TypeName.ZodNumber:
            return (arg) => {
                if (arg === undefined) {
                    return arg;
                }

                return Number.parseFloat(arg);
            };

        case TypeName.ZodBigInt:
            return (arg = '') => {
                if (/^\d+$/.test(arg)) {
                    return BigInt(arg);
                }
                return arg;
            };

        case TypeName.ZodBoolean:
            return (arg) => {
                switch (arg) {
                    case 'true':
                    case 'yes':
                    case '1':
                        return true;
                    case 'false':
                    case 'no':
                    case '0':
                        return false;
                    default:
                        return arg;
                }
            };

        case TypeName.ZodEffects:
            return getStringPreprocessor(def.schema);

        case TypeName.ZodDefault:
            return getStringPreprocessor(def.innerType);

        case TypeName.ZodOptional: {
            const { innerType } = def;
            const pp = getStringPreprocessor(innerType);
            return (arg) => {
                if (arg === undefined) {
                    return arg;
                }

                return pp(arg);
            };
        }

        case TypeName.ZodNullable: {
            const { innerType } = def;
            const pp = getStringPreprocessor(innerType);
            return (arg) => {
                // coerce undefined to null.
                if (arg == null) {
                    return null;
                }
                return pp(arg);
            };
        }

        case TypeName.ZodDate:
            return (arg) => {
                if (arg == null) {
                    return arg;
                }
                return new Date(arg);
            };

        case TypeName.ZodLiteral:
            switch (typeof def.value) {
                case 'number':
                    return getStringPreprocessor({
                        _def: { typeName: TypeName.ZodNumber },
                    } as z.ZodFirstPartySchemaTypes);
                case 'string':
                    return getStringPreprocessor({
                        _def: { typeName: TypeName.ZodString },
                    } as z.ZodFirstPartySchemaTypes);
                case 'boolean':
                    return getStringPreprocessor({
                        _def: { typeName: TypeName.ZodBoolean },
                    } as z.ZodFirstPartySchemaTypes);
                default:
                    return (arg) => arg;
            }

        case TypeName.ZodNull:
            return (arg) => {
                if (arg == null) {
                    return null;
                }

                return arg;
            };

        case TypeName.ZodAny:
        case TypeName.ZodUnknown:
        case TypeName.ZodUnion:
        case TypeName.ZodNativeEnum:
        case TypeName.ZodVoid:
        case TypeName.ZodNever:
        case TypeName.ZodLazy:
        case TypeName.ZodFunction:
        case TypeName.ZodPromise:
        case TypeName.ZodMap:
        case TypeName.ZodSet:
        case TypeName.ZodNaN:
        case TypeName.ZodDiscriminatedUnion:
        case TypeName.ZodArray:
        case TypeName.ZodObject:
        case TypeName.ZodTuple:
        case TypeName.ZodRecord:
        case TypeName.ZodIntersection:
        case TypeName.ZodBranded:
        case TypeName.ZodCatch:
        case TypeName.ZodPipeline:
            throw new Error(`Zod type is not supported: ${typeName}`);

        default: {
            throw new UnreachableError(typeName);
        }
    }
};

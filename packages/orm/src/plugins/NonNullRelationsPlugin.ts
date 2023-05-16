import { getNullableType, GraphQLNonNull } from 'graphql';
import { SchemaBuilder } from 'postgraphile';

export const NonNullRelationsPlugin = (builder: SchemaBuilder) => {
    builder.hook('GraphQLObjectType:fields:field', (field, _, context) => {
        const { isPgForwardRelationField, pgFieldIntrospection } = context.scope;
        if (isPgForwardRelationField && pgFieldIntrospection) {
            const linkedAttributeNums = pgFieldIntrospection.keyAttributeNums;
            const relationIsNotNull = pgFieldIntrospection.class.attributes
                .filter((attr: any) => linkedAttributeNums.indexOf(attr.num) >= 0)
                .every((attr: any) => attr.isNotNull || attr.type.domainIsNotNull || attr.tags.notNull || attr.tags.nonNull);

            if (relationIsNotNull) {
                return { ...field, type: new GraphQLNonNull(getNullableType(field.type)) };
            }
        }

        return field;
    });
};

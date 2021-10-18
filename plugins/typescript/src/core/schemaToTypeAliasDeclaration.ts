import { findKey, get, merge, intersection } from "lodash";
import {
  ComponentsObject,
  DiscriminatorObject,
  isReferenceObject,
  isSchemaObject,
  OpenAPIObject,
  ReferenceObject,
  SchemaObject,
} from "openapi3-ts";
import ts, { factory as f } from "typescript";
import { isValidIdentifier } from "tsutils";

type RemoveIndex<T> = {
  [P in keyof T as string extends P
    ? never
    : number extends P
    ? never
    : P]: T[P];
};

type GeneratedComponents = Extract<
  keyof RemoveIndex<ComponentsObject>,
  "parameters" | "responses" | "schemas" | "requestBodies"
>;

export type RefPrefixes = Record<GeneratedComponents, string>;

export type Context = {
  openAPIDocument: Pick<OpenAPIObject, "components">;
  refPrefixes: RefPrefixes;
};

/**
 * Transform an OpenAPI Schema Object to Typescript Nodes (comment & declaration).
 *
 * @param name  Name of the schema
 * @param schema OpenAPI Schema object
 * @param context Context
 */
export const schemaToTypeAliasDeclaration = (
  name: string,
  schema: SchemaObject,
  context: Context
): ts.Node[] => {
  const jsDocNode = getJSDocComment(schema, context);
  const declarationNode = f.createTypeAliasDeclaration(
    undefined,
    [f.createModifier(ts.SyntaxKind.ExportKeyword)],
    name,
    undefined,
    getType(schema, context)
  );

  return jsDocNode ? [jsDocNode, declarationNode] : [declarationNode];
};

/**
 * Get the type.
 *
 * @param schema OpenAPI Schema
 * @returns ts.TypeNode
 */
const getType = (
  schema: SchemaObject | ReferenceObject,
  context: Context
): ts.TypeNode => {
  if (isReferenceObject(schema)) {
    const [hash, topLevel, namespace, name] = schema.$ref.split("/");
    if (hash !== "#" || topLevel !== "components") {
      throw new Error(
        "This library only resolve $ref that are include into `#/components/*` for now"
      );
    }
    if (namespace in context.refPrefixes) {
      return f.createTypeReferenceNode(
        f.createIdentifier(
          context.refPrefixes[namespace as keyof RefPrefixes] + name
        )
      );
    }
    return f.createKeywordTypeNode(ts.SyntaxKind.AnyKeyword);
  }

  if (schema["x-openapi-codegen"]?.type === "never") {
    return f.createKeywordTypeNode(ts.SyntaxKind.NeverKeyword);
  }

  if (schema.oneOf) {
    return f.createUnionTypeNode(
      schema.oneOf.map((i) =>
        withDiscriminator(getType(i, context), i, schema.discriminator, context)
      )
    );
  }

  if (schema.anyOf) {
    return f.createUnionTypeNode(
      schema.anyOf.map((i) =>
        withDiscriminator(getType(i, context), i, schema.discriminator, context)
      )
    );
  }

  if (schema.allOf) {
    return getAllOf(schema.allOf, context);
  }

  if (schema.enum) {
    return f.createUnionTypeNode(
      schema.enum.map((value) => {
        if (typeof value === "string") {
          return f.createLiteralTypeNode(f.createStringLiteral(value));
        }
        if (typeof value === "number") {
          return f.createLiteralTypeNode(f.createNumericLiteral(value));
        }
        if (typeof value === "boolean") {
          return f.createLiteralTypeNode(
            value ? f.createTrue() : f.createFalse()
          );
        }
        return f.createKeywordTypeNode(ts.SyntaxKind.AnyKeyword);
      })
    );
  }

  switch (schema.type) {
    case "null":
      return f.createLiteralTypeNode(f.createNull());
    case "integer":
    case "number":
      return withNullable(
        f.createKeywordTypeNode(ts.SyntaxKind.NumberKeyword),
        schema.nullable
      );
    case "string":
      return withNullable(
        f.createKeywordTypeNode(ts.SyntaxKind.StringKeyword),
        schema.nullable
      );
    case "boolean":
      return withNullable(
        f.createKeywordTypeNode(ts.SyntaxKind.BooleanKeyword),
        schema.nullable
      );
    case "object":
      if (!schema.properties /* free form object */) {
        return withNullable(
          f.createTypeReferenceNode(f.createIdentifier("Record"), [
            f.createKeywordTypeNode(ts.SyntaxKind.StringKeyword),
            f.createKeywordTypeNode(ts.SyntaxKind.AnyKeyword),
          ]),
          schema.nullable
        );
      }

      const members: ts.TypeElement[] = Object.entries(schema.properties).map(
        ([key, property]) => {
          const propertyNode = f.createPropertySignature(
            undefined,
            isValidIdentifier(key)
              ? f.createIdentifier(key)
              : f.createComputedPropertyName(f.createStringLiteral(key)),
            schema.required?.includes(key)
              ? undefined
              : f.createToken(ts.SyntaxKind.QuestionToken),
            getType(property, context)
          );
          const jsDocNode = getJSDocComment(property, context);
          if (jsDocNode) addJSDocToNode(propertyNode, jsDocNode);

          return propertyNode;
        }
      );

      const additionalPropertiesNode = getAdditionalProperties(schema, context);

      if (additionalPropertiesNode) members.push(additionalPropertiesNode);

      return withNullable(f.createTypeLiteralNode(members), schema.nullable);
    case "array":
      return withNullable(
        f.createArrayTypeNode(
          !schema.items
            ? f.createKeywordTypeNode(ts.SyntaxKind.AnyKeyword)
            : getType(schema.items, context)
        ),
        schema.nullable
      );
    default:
      return withNullable(
        f.createKeywordTypeNode(ts.SyntaxKind.AnyKeyword),
        schema.nullable
      );
  }
};

/**
 * Add nullable option if needed.
 *
 * @param node Any node
 * @param nullable Add nullable option if true
 * @returns Type with or without nullable option
 */
const withNullable = (
  node: ts.TypeNode,
  nullable: boolean | undefined
): ts.TypeNode => {
  return nullable
    ? f.createUnionTypeNode([node, f.createLiteralTypeNode(f.createNull())])
    : node;
};

/**
 * Combine the original type with the discriminator mapping value.
 *
 * @param node
 * @param discriminator
 * @returns
 */
const withDiscriminator = (
  node: ts.TypeNode,
  schema: SchemaObject | ReferenceObject,
  discriminator: DiscriminatorObject | undefined,
  context: Context
): ts.TypeNode => {
  if (!discriminator || !discriminator.propertyName || !discriminator.mapping) {
    return node;
  }

  const discriminatedValue = findKey(
    discriminator.mapping,
    (i) => i === schema.$ref
  );
  if (discriminatedValue) {
    const propertyNameAsLiteral = f.createTypeLiteralNode([
      f.createPropertySignature(
        undefined,
        f.createIdentifier(discriminator.propertyName),
        undefined,
        f.createLiteralTypeNode(f.createStringLiteral(discriminatedValue))
      ),
    ]);

    const spec = get<SchemaObject | ReferenceObject>(
      context.openAPIDocument,
      schema.$ref.slice(2).replace(/\//g, ".")
    );
    if (spec && isSchemaObject(spec) && spec.properties) {
      const property = spec.properties[discriminator.propertyName];
      if (
        property &&
        isSchemaObject(property) &&
        property.enum?.length === 1 &&
        property.enum[0] === discriminatedValue &&
        spec.required?.includes(discriminator.propertyName)
      ) {
        return node;
      }
      if (!property) {
        return f.createIntersectionTypeNode([node, propertyNameAsLiteral]);
      }
    }

    const baseTypeWithoutPropertyName = f.createTypeReferenceNode(
      f.createIdentifier("Omit"),
      [
        node,
        f.createLiteralTypeNode(
          f.createStringLiteral(discriminator.propertyName)
        ),
      ]
    );

    return f.createIntersectionTypeNode([
      baseTypeWithoutPropertyName,
      propertyNameAsLiteral,
    ]);
  }

  return node;
};

/**
 * Get `allOf` type.
 */
const getAllOf = (
  members: Required<SchemaObject>["allOf"],
  context: Context
): ts.TypeNode => {
  const initialValue = {
    isSchemaObjectOnly: true,
    isWritableWithIntersection: true,
    mergedSchema: {} as SchemaObject,
    intersectionMembers: [] as ts.TypeNode[],
  };

  const {
    mergedSchema,
    isSchemaObjectOnly,
    isWritableWithIntersection,
    intersectionMembers,
  } = members.reduce((acc, member, i) => {
    if (i === 0 && isSchemaObject(member)) {
      return {
        ...acc,
        mergedSchema: member,
        intersectionMembers: [getType(member, context)],
      };
    }

    if (isSchemaObject(member)) {
      const { mergedSchema, isColliding } = mergeSchemas(
        acc.mergedSchema,
        member
      );

      return {
        ...acc,
        mergedSchema,
        isWritableWithIntersection:
          acc.isWritableWithIntersection && !isColliding,
        intersectionMembers: [
          ...acc.intersectionMembers,
          getType(member, context),
        ],
      };
    }

    if (isReferenceObject(member)) {
      const referenceSchema = getReferenceSchema(member.$ref, context);
      const { mergedSchema, isColliding } = mergeSchemas(
        acc.mergedSchema,
        referenceSchema
      );

      return {
        ...acc,
        isWritableWithIntersection:
          acc.isWritableWithIntersection && !isColliding,
        isSchemaObjectOnly: false,
        mergedSchema,
        intersectionMembers: [
          ...acc.intersectionMembers,
          getType(member, context),
        ],
      };
    }

    return acc;
  }, initialValue);

  if (isSchemaObjectOnly) {
    return getType(mergedSchema, context);
  }

  if (isWritableWithIntersection) {
    return f.createIntersectionTypeNode(intersectionMembers);
  }

  return getType(mergedSchema, context);
};

/**
 * Get the SchemaObject from a $ref.
 *
 * @param $ref Path of the reference
 * @param context Context
 * @returns The resolved SchemaObject
 */
const getReferenceSchema = ($ref: string, context: Context): SchemaObject => {
  const [hash, ...refPath] = $ref.split("/");
  if (hash !== "#") {
    throw new Error("This library only resolve local $ref");
  }
  const referenceSchema = get(context.openAPIDocument, refPath.join("."));

  if (!referenceSchema) {
    throw new Error(`${$ref} not found!`);
  }

  if (isReferenceObject(referenceSchema)) {
    return getReferenceSchema(referenceSchema.$ref, context);
  }

  if (!isSchemaObject(referenceSchema)) {
    throw new Error(`${$ref} can’t be resolved`);
  }

  return referenceSchema;
};

/**
 * Merge two schema objects
 *
 * @param a
 * @param b
 * @returns the merged schema and a flag to know if the schema was colliding
 */
const mergeSchemas = (
  a: SchemaObject,
  b: SchemaObject
): { mergedSchema: SchemaObject; isColliding: boolean } => {
  if (Boolean(a.type) && Boolean(b.type) && a.type !== b.type) {
    return {
      mergedSchema: {
        ...merge(a, b),
        ["x-openapi-codegen"]: {
          type: "never",
        },
      },
      isColliding: true,
    };
  }

  if (a.properties && b.properties) {
    let isColliding = false;
    const properties = Object.entries(a.properties).reduce(
      (mergedProperties, [key, propertyA]) => {
        const propertyB = b.properties?.[key];
        if (propertyB) {
          isColliding = true;
        }
        if (
          propertyB &&
          isSchemaObject(propertyB) &&
          isSchemaObject(propertyA) &&
          Boolean(propertyB.type) &&
          Boolean(propertyA.type) &&
          propertyA.type !== propertyB.type
        ) {
          return {
            ...mergedProperties,
            [key]: {
              ...propertyA,
              ...propertyB,
              ["x-openapi-codegen"]: {
                type: "never",
              },
            },
          };
        }

        return { ...mergedProperties, [key]: propertyA };
      },
      {} as typeof a.properties
    );

    return {
      mergedSchema: {
        ...merge({}, a, b),
        properties: merge({}, properties, b.properties),
      },
      isColliding,
    };
  }

  let isColliding = false;
  if (
    a.required &&
    b.properties &&
    intersection(a.required, Object.keys(b.properties)).length > 0
  ) {
    isColliding = true;
  }
  if (
    a.properties &&
    b.required &&
    intersection(b.required, Object.keys(a.properties)).length > 0
  ) {
    isColliding = true;
  }

  return { mergedSchema: merge({}, a, b), isColliding };
};

const keysToExpressAsJsDocProperty: Array<keyof RemoveIndex<SchemaObject>> = [
  "minimum",
  "maximum",
  "default",
  "minLength",
  "maxLength",
  "format",
  "pattern",
  "example",
  "examples",
  "multipleOf",
  "exclusiveMaximum",
  "exclusiveMinimum",
  "maxLength",
  "maxItems",
  "minItems",
  "uniqueItems",
  "maxProperties",
  "minProperties",
  "deprecated",
];

/**
 * Get JSDocComment from an OpenAPI Schema.
 *
 * @param schema
 * @param context
 * @returns JSDoc node
 */
const getJSDocComment = (
  schema: SchemaObject,
  context: Context
): ts.JSDoc | undefined => {
  // `allOf` can add some documentation to the schema, let’s merge all items as first step
  const schemaWithAllOfResolved = schema.allOf
    ? schema.allOf.reduce<SchemaObject>((mem, allOfItem) => {
        if (isReferenceObject(allOfItem)) {
          const referenceSchema = getReferenceSchema(allOfItem.$ref, context);
          return mergeSchemas(mem, referenceSchema).mergedSchema;
        } else {
          return mergeSchemas(mem, allOfItem).mergedSchema;
        }
      }, schema)
    : schema;

  const propertyTags: ts.JSDocPropertyTag[] = [];
  Object.entries(schemaWithAllOfResolved)
    .filter(
      ([key, value]) =>
        keysToExpressAsJsDocProperty.includes(key as any) ||
        (/^x-/.exec(key) && typeof value !== "object")
    )
    .forEach(([key, value]) => {
      if (Array.isArray(value)) {
        value.forEach((v) =>
          propertyTags.push(
            f.createJSDocPropertyTag(
              f.createIdentifier(key.slice(0, -1)), // Remove the plural
              f.createIdentifier(v.toString()),
              false
            )
          )
        );
      } else if (typeof value !== "undefined") {
        propertyTags.push(
          f.createJSDocPropertyTag(
            f.createIdentifier(key),
            f.createIdentifier(value.toString()),
            false
          )
        );
      }
    });

  if (schemaWithAllOfResolved.description || propertyTags.length > 0) {
    return f.createJSDocComment(
      schemaWithAllOfResolved.description
        ? schemaWithAllOfResolved.description.trim() +
            (propertyTags.length ? "\n" : "")
        : undefined,
      propertyTags
    );
  }
  return undefined;
};

/**
 * Add js comment to a node (mutate the original node).
 *
 * We need to do this because JSDoc are not part of Typescript AST.
 *
 * @param node
 * @param jsDocComment
 */
const addJSDocToNode = (node: ts.Node, jsDocComment: ts.JSDoc) => {
  const sourceFile = ts.createSourceFile(
    "index.ts",
    "",
    ts.ScriptTarget.Latest
  );

  const printer = ts.createPrinter({
    newLine: ts.NewLineKind.LineFeed,
    removeComments: false,
  });

  const jsDocString = printer
    .printNode(ts.EmitHint.Unspecified, jsDocComment, sourceFile)
    .replace(/^( )*(\/\*)?\*?( *)/g, "") // Remove opening comment notations
    .replace("*/", ""); // Remove closing comment notation

  ts.addSyntheticLeadingComment(
    node,
    ts.SyntaxKind.MultiLineCommentTrivia,
    jsDocString,
    true
  );
};

/**
 * Get IndexSignatureDeclaration from `schema.additionalProperties`.
 *
 * @param schema
 * @param context
 * @returns Index signature node
 */
const getAdditionalProperties = (
  schema: SchemaObject,
  context: Context
): ts.IndexSignatureDeclaration | undefined => {
  if (!schema.additionalProperties) return undefined;

  return f.createIndexSignature(
    undefined,
    undefined,
    [
      f.createParameterDeclaration(
        undefined,
        undefined,
        undefined,
        f.createIdentifier("key"),
        undefined,
        f.createKeywordTypeNode(ts.SyntaxKind.StringKeyword),
        undefined
      ),
    ],
    schema.additionalProperties === true ||
      Object.keys(schema.additionalProperties).length === 0
      ? f.createKeywordTypeNode(ts.SyntaxKind.AnyKeyword)
      : getType(schema.additionalProperties, context)
  );
};
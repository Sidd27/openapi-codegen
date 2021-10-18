import { OpenAPIObject, ReferenceObject, SchemaObject } from "openapi3-ts";
import ts from "typescript";
import {
  RefPrefixes,
  schemaToTypeAliasDeclaration,
} from "./schemaToTypeAliasDeclaration";

const defaultRefPrefixes = {
  parameters: "",
  requestBodies: "",
  responses: "",
  schemas: "",
};

describe("schemaToTypeAliasDeclaration", () => {
  it("should generate null", () => {
    const schema: SchemaObject = {
      type: "null",
    };

    expect(printSchema(schema)).toBe("export type test = null;");
  });

  it("should generate integer", () => {
    const schema: SchemaObject = {
      type: "integer",
    };

    expect(printSchema(schema)).toBe("export type test = number;");
  });

  it("should generate string", () => {
    const schema: SchemaObject = {
      type: "string",
    };

    expect(printSchema(schema)).toBe("export type test = string;");
  });

  it("should generate boolean", () => {
    const schema: SchemaObject = {
      type: "boolean",
    };

    expect(printSchema(schema)).toBe("export type test = boolean;");
  });

  it("should generate a nullable value", () => {
    const schema: SchemaObject = {
      type: "integer",
      nullable: true,
    };

    expect(printSchema(schema)).toBe("export type test = number | null;");
  });

  it("should generate an array of numbers", () => {
    const schema: SchemaObject = {
      type: "array",
      items: {
        type: "integer",
      },
    };

    expect(printSchema(schema)).toBe("export type test = number[];");
  });

  it("should generate enums (strings)", () => {
    const schema: SchemaObject = {
      type: "string",
      enum: ["foo", "bar", "baz"],
    };

    expect(printSchema(schema)).toBe(
      `export type test = "foo" | "bar" | "baz";`
    );
  });

  it("should generate enums (numbers)", () => {
    const schema: SchemaObject = {
      type: "integer",
      enum: [1, 2, 3],
    };

    expect(printSchema(schema)).toBe(`export type test = 1 | 2 | 3;`);
  });

  it("should generate top-level documentation", () => {
    const schema: SchemaObject = {
      type: "null",
      description: "I’m null",
      maximum: 43,
      minimum: 42,
      default: "42",
      format: "int32",
      deprecated: true,
      exclusiveMaximum: true,
      exclusiveMinimum: false,
      example: "I’m an example",
      "x-test": "plop",
    };

    expect(printSchema(schema)).toMatchInlineSnapshot(`
      "/**
       * I’m null
       * 
       * @maximum 43
       * @minimum 42
       * @default 42
       * @format int32
       * @deprecated true
       * @exclusiveMaximum true
       * @exclusiveMinimum false
       * @example I’m an example
       * @x-test plop
       */
      export type test = null;"
    `);
  });

  it("should generate multiple examples", () => {
    const schema: SchemaObject = {
      type: "null",
      examples: ["first example", "second example"],
    };

    expect(printSchema(schema)).toMatchInlineSnapshot(`
      "/**
       * @example first example
       * @example second example
       */
      export type test = null;"
    `);
  });

  it("should generate an object", () => {
    const schema: SchemaObject = {
      type: "object",
      description: "An object",
      properties: {
        foo: {
          description: "I’m a foo",
          default: "boom",
          type: "string",
        },
        bar: {
          minimum: 0,
          maximum: 42,
          type: "number",
        },
        baz: {
          type: "boolean",
        },
      },
      required: ["foo"],
    };

    expect(printSchema(schema)).toMatchInlineSnapshot(`
      "/**
       * An object
       */
      export type test = {
          /*
           * I’m a foo
           *
           * @default boom
           */
          foo: string;
          /*
           * @minimum 0
           * @maximum 42
           */
          bar?: number;
          baz?: boolean;
      };"
    `);
  });

  it("should generate an object with escaped keys", () => {
    const schema: SchemaObject = {
      type: "object",
      properties: {
        ["foo.bar"]: {
          type: "string",
        },
      },
    };

    expect(printSchema(schema)).toMatchInlineSnapshot(`
      "export type test = {
          [\\"foo.bar\\"]?: string;
      };"
    `);
  });

  it("should generate a nested object", () => {
    const schema: SchemaObject = {
      type: "object",
      description: "An object",
      properties: {
        foo: {
          description: "I’m a foo",
          default: "boom",
          type: "object",
          properties: {
            bar: {
              minimum: 0,
              maximum: 42,
              type: "number",
            },
            baz: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  oh: {
                    default: "yeah",
                    type: "string",
                  },
                },
              },
            },
          },
        },
      },
      required: ["foo"],
    };

    expect(printSchema(schema)).toMatchInlineSnapshot(`
      "/**
       * An object
       */
      export type test = {
          /*
           * I’m a foo
           *
           * @default boom
           */
          foo: {
              /*
               * @minimum 0
               * @maximum 42
               */
              bar?: number;
              baz?: {
                  /*
                   * @default yeah
                   */
                  oh?: string;
              }[];
          };
      };"
    `);
  });

  it("should resolve ref", () => {
    const schema: ReferenceObject = {
      $ref: "#/components/schemas/User",
    };

    expect(printSchema(schema)).toMatchInlineSnapshot(
      `"export type test = User;"`
    );
  });

  it("should resolve ref (with custom prefix)", () => {
    const schema: ReferenceObject = {
      $ref: "#/components/schemas/User",
    };

    expect(
      printSchema(schema, {
        schemas: "Schemas.",
        parameters: "",
        requestBodies: "",
        responses: "",
      })
    ).toMatchInlineSnapshot(`"export type test = Schemas.User;"`);
  });

  it("should generate a free form object", () => {
    const schema: SchemaObject = {
      type: "object",
    };

    expect(printSchema(schema)).toMatchInlineSnapshot(
      `"export type test = Record<string, any>;"`
    );
  });

  it("should generate an object with additional properties", () => {
    const schema: SchemaObject = {
      type: "object",
      properties: {
        foo: { type: "string" },
        bar: { type: "number" },
      },
      required: ["bar"],
      additionalProperties: {
        type: "array",
        items: {
          $ref: "#/components/schemas/Foo",
        },
      },
    };

    expect(printSchema(schema)).toMatchInlineSnapshot(`
      "export type test = {
          foo?: string;
          bar: number;
          [key: string]: Foo[];
      };"
    `);
  });

  it("should generate an object with additional properties as true", () => {
    const schema: SchemaObject = {
      type: "object",
      properties: {
        foo: { type: "string" },
        bar: { type: "number" },
      },
      required: ["bar"],
      additionalProperties: true,
    };

    expect(printSchema(schema)).toMatchInlineSnapshot(`
      "export type test = {
          foo?: string;
          bar: number;
          [key: string]: any;
      };"
    `);
  });

  it("should generate an object with additional properties as empty object", () => {
    const schema: SchemaObject = {
      type: "object",
      properties: {
        foo: { type: "string" },
        bar: { type: "number" },
      },
      required: ["bar"],
      additionalProperties: {},
    };

    expect(printSchema(schema)).toMatchInlineSnapshot(`
      "export type test = {
          foo?: string;
          bar: number;
          [key: string]: any;
      };"
    `);
  });

  it("should generate a oneOf", () => {
    const schema: SchemaObject = {
      oneOf: [{ type: "string" }, { type: "number" }],
    };

    expect(printSchema(schema)).toMatchInlineSnapshot(
      `"export type test = string | number;"`
    );
  });

  it("should generate a anyOf", () => {
    const schema: SchemaObject = {
      anyOf: [{ type: "string" }, { type: "number" }],
    };

    expect(printSchema(schema)).toMatchInlineSnapshot(
      `"export type test = string | number;"`
    );
  });

  describe("discrimination", () => {
    const schema: SchemaObject = {
      oneOf: [
        { $ref: "#/components/schemas/Foo" },
        { $ref: "#/components/schemas/Bar" },
        { $ref: "#/components/schemas/Baz" },
      ],
      discriminator: {
        propertyName: "discriminatorPropertyName",
        mapping: {
          foo: "#/components/schemas/Foo",
          bar: "#/components/schemas/Bar",
          baz: "#/components/schemas/Baz",
        },
      },
    };

    it("should omit the base value if present", () => {
      expect(
        printSchema(schema, defaultRefPrefixes, {
          schemas: {
            Foo: {
              type: "object",
              properties: {
                foo: { type: "string" },
                discriminatorPropertyName: { type: "string" },
              },
            },
            Bar: {
              type: "object",
              properties: {
                bar: { type: "string" },
                discriminatorPropertyName: { type: "string" },
              },
            },
            Baz: {
              type: "object",
              properties: {
                baz: { type: "string" },
                discriminatorPropertyName: { type: "string" },
              },
            },
          },
        })
      ).toMatchInlineSnapshot(`
          "export type test = (Omit<Foo, \\"discriminatorPropertyName\\"> & {
              discriminatorPropertyName: \\"foo\\";
          }) | (Omit<Bar, \\"discriminatorPropertyName\\"> & {
              discriminatorPropertyName: \\"bar\\";
          }) | (Omit<Baz, \\"discriminatorPropertyName\\"> & {
              discriminatorPropertyName: \\"baz\\";
          });"
        `);
    });

    it("should not add the `Omit` if not necessary", () => {
      expect(
        printSchema(schema, defaultRefPrefixes, {
          schemas: {
            Foo: { type: "object", properties: { foo: { type: "string" } } },
            Bar: { type: "object", properties: { bar: { type: "string" } } },
            Baz: { type: "object", properties: { baz: { type: "string" } } },
          },
        })
      ).toMatchInlineSnapshot(`
        "export type test = (Foo & {
            discriminatorPropertyName: \\"foo\\";
        }) | (Bar & {
            discriminatorPropertyName: \\"bar\\";
        }) | (Baz & {
            discriminatorPropertyName: \\"baz\\";
        });"
      `);
    });

    it("should use the original type if compliant", () => {
      expect(
        printSchema(schema, defaultRefPrefixes, {
          schemas: {
            Foo: {
              type: "object",
              properties: {
                foo: { type: "string" },
                discriminatorPropertyName: { type: "string", enum: ["foo"] },
              },

              required: ["discriminatorPropertyName"],
            },

            Bar: {
              type: "object",
              properties: {
                bar: { type: "string" },
                discriminatorPropertyName: { type: "string", enum: ["bar"] },
              },

              required: ["discriminatorPropertyName"],
            },

            Baz: {
              type: "object",
              properties: {
                baz: { type: "string" },
                discriminatorPropertyName: { type: "string", enum: ["baz"] },
              },

              required: ["discriminatorPropertyName"],
            },
          },
        })
      ).toMatchInlineSnapshot(`"export type test = Foo | Bar | Baz;"`);
    });
  });

  describe("allOf", () => {
    it("should combine inline types", () => {
      const schema: SchemaObject = {
        allOf: [
          { type: "object", properties: { foo: { type: "string" } } },
          { type: "object", properties: { bar: { type: "number" } } },
        ],
      };

      expect(printSchema(schema)).toMatchInlineSnapshot(`
        "export type test = {
            foo?: string;
            bar?: number;
        };"
      `);
    });

    it("should combine ref and inline type", () => {
      const schema: SchemaObject = {
        allOf: [
          { $ref: "#/components/schemas/Foo" },
          { type: "object", properties: { bar: { type: "number" } } },
        ],
      };

      const components: OpenAPIObject["components"] = {
        schemas: {
          Foo: {
            type: "object",
            properties: {
              foo: { type: "string" },
            },
          },
        },
      };

      expect(printSchema(schema, undefined, components)).toMatchInlineSnapshot(`
        "export type test = Foo & {
            bar?: number;
        };"
      `);
    });

    it("should generate a new type when schemas intersect", () => {
      const schema: SchemaObject = {
        allOf: [{ $ref: "#/components/schemas/Foo" }, { required: ["bar"] }],
      };

      const components: OpenAPIObject["components"] = {
        schemas: {
          Foo: {
            type: "object",
            properties: {
              bar: { type: "string" },
            },
          },
        },
      };

      expect(printSchema(schema, undefined, components)).toMatchInlineSnapshot(`
        "export type test = {
            bar: string;
        };"
      `);
    });

    it("should generate a `never` if the combined type is broken", () => {
      const schema: SchemaObject = {
        allOf: [{ type: "string" }, { type: "number" }],
      };

      expect(printSchema(schema)).toMatchInlineSnapshot(
        `"export type test = never;"`
      );
    });

    it("should generate a `never` if the combined property type is broken", () => {
      const schema: SchemaObject = {
        allOf: [
          { type: "object", properties: { foo: { type: "string" } } },
          { type: "object", properties: { foo: { type: "number" } } },
        ],
      };

      expect(printSchema(schema)).toMatchInlineSnapshot(`
        "export type test = {
            foo?: never;
        };"
      `);
    });

    it("should generate documentation (object properties)", () => {
      const schema: SchemaObject = {
        allOf: [
          { type: "object", properties: { foo: { type: "string" } } },
          {
            type: "object",
            properties: { foo: { description: "A nice description for foo" } },
          },
          { description: "A nice top-level description" },
        ],
      };

      expect(printSchema(schema)).toMatchInlineSnapshot(`
        "/**
         * A nice top-level description
         */
        export type test = {
            /*
             * A nice description for foo
             */
            foo?: string;
        };"
      `);
    });

    it("should generate documentation (top level)", () => {
      const schema: SchemaObject = {
        allOf: [
          { type: "string" },
          {
            type: "string",
            maxLength: 255,
          },
          { description: "A nice top-level description" },
        ],
      };

      expect(printSchema(schema)).toMatchInlineSnapshot(`
        "/**
         * A nice top-level description
         * 
         * @maxLength 255
         */
        export type test = string;"
      `);
    });
  }); // end of allOf
});

const printSchema = (
  schema: SchemaObject,
  refPrefixes: RefPrefixes = defaultRefPrefixes,
  components?: OpenAPIObject["components"]
) => {
  const nodes = schemaToTypeAliasDeclaration("test", schema, {
    refPrefixes,
    openAPIDocument: { components },
  });

  const sourceFile = ts.createSourceFile(
    "index.ts",
    "",
    ts.ScriptTarget.Latest
  );

  const printer = ts.createPrinter({
    newLine: ts.NewLineKind.LineFeed,
    removeComments: false,
  });

  return nodes
    .map((node: ts.Node) =>
      printer.printNode(ts.EmitHint.Unspecified, node, sourceFile)
    )
    .join("\n");
};
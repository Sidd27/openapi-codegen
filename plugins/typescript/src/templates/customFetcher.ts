import ts, { factory } from "typescript";
import { camel, pascal } from "case";

/**
 * Get custom fetcher template
 */
export const getCustomFetcher = (prefix: string) => [
  factory.createImportDeclaration(
    undefined,
    undefined,
    factory.createImportClause(
      false,
      factory.createIdentifier("qs"),
      undefined
    ),
    factory.createStringLiteral("qs"),
    undefined
  ),
  factory.createTypeAliasDeclaration(
    undefined,
    [factory.createModifier(ts.SyntaxKind.ExportKeyword)],
    factory.createIdentifier(`${pascal(prefix)}FetcherOptions`),
    [
      factory.createTypeParameterDeclaration(
        factory.createIdentifier("TBody"),
        undefined,
        undefined
      ),
      factory.createTypeParameterDeclaration(
        factory.createIdentifier("THeaders"),
        undefined,
        undefined
      ),
      factory.createTypeParameterDeclaration(
        factory.createIdentifier("TQueryParams"),
        undefined,
        undefined
      ),
      factory.createTypeParameterDeclaration(
        factory.createIdentifier("TPathParams"),
        undefined,
        undefined
      ),
    ],
    factory.createTypeLiteralNode([
      factory.createPropertySignature(
        undefined,
        factory.createIdentifier("url"),
        undefined,
        factory.createKeywordTypeNode(ts.SyntaxKind.StringKeyword)
      ),
      factory.createPropertySignature(
        undefined,
        factory.createIdentifier("method"),
        undefined,
        factory.createKeywordTypeNode(ts.SyntaxKind.StringKeyword)
      ),
      factory.createPropertySignature(
        undefined,
        factory.createIdentifier("body"),
        factory.createToken(ts.SyntaxKind.QuestionToken),
        factory.createTypeReferenceNode(
          factory.createIdentifier("TBody"),
          undefined
        )
      ),
      factory.createPropertySignature(
        undefined,
        factory.createIdentifier("headers"),
        factory.createToken(ts.SyntaxKind.QuestionToken),
        factory.createTypeReferenceNode(
          factory.createIdentifier("THeaders"),
          undefined
        )
      ),
      factory.createPropertySignature(
        undefined,
        factory.createIdentifier("queryParams"),
        factory.createToken(ts.SyntaxKind.QuestionToken),
        factory.createTypeReferenceNode(
          factory.createIdentifier("TQueryParams"),
          undefined
        )
      ),
      factory.createPropertySignature(
        undefined,
        factory.createIdentifier("pathParams"),
        factory.createToken(ts.SyntaxKind.QuestionToken),
        factory.createTypeReferenceNode(
          factory.createIdentifier("TPathParams"),
          undefined
        )
      ),
    ])
  ),
  factory.createFunctionDeclaration(
    undefined,
    [
      factory.createModifier(ts.SyntaxKind.ExportKeyword),
      factory.createModifier(ts.SyntaxKind.DefaultKeyword),
      factory.createModifier(ts.SyntaxKind.AsyncKeyword),
    ],
    undefined,
    factory.createIdentifier(`${camel(prefix)}Fetch`),
    [
      factory.createTypeParameterDeclaration(
        factory.createIdentifier("TData"),
        undefined,
        undefined
      ),
      factory.createTypeParameterDeclaration(
        factory.createIdentifier("TBody"),
        factory.createUnionTypeNode([
          factory.createTypeLiteralNode([]),
          factory.createKeywordTypeNode(ts.SyntaxKind.UndefinedKeyword),
        ]),
        undefined
      ),
      factory.createTypeParameterDeclaration(
        factory.createIdentifier("THeaders"),
        factory.createUnionTypeNode([
          factory.createTypeLiteralNode([]),
          factory.createKeywordTypeNode(ts.SyntaxKind.UndefinedKeyword),
          factory.createLiteralTypeNode(factory.createNull()),
        ]),
        undefined
      ),
      factory.createTypeParameterDeclaration(
        factory.createIdentifier("TQueryParams"),
        factory.createUnionTypeNode([
          factory.createTypeLiteralNode([]),
          factory.createKeywordTypeNode(ts.SyntaxKind.UndefinedKeyword),
        ]),
        undefined
      ),
      factory.createTypeParameterDeclaration(
        factory.createIdentifier("TPathParams"),
        factory.createUnionTypeNode([
          factory.createTypeLiteralNode([]),
          factory.createKeywordTypeNode(ts.SyntaxKind.UndefinedKeyword),
        ]),
        undefined
      ),
    ],
    [
      factory.createParameterDeclaration(
        undefined,
        undefined,
        undefined,
        factory.createObjectBindingPattern([
          factory.createBindingElement(
            undefined,
            undefined,
            factory.createIdentifier("url"),
            undefined
          ),
          factory.createBindingElement(
            undefined,
            undefined,
            factory.createIdentifier("method"),
            undefined
          ),
          factory.createBindingElement(
            undefined,
            undefined,
            factory.createIdentifier("body"),
            undefined
          ),
          factory.createBindingElement(
            undefined,
            undefined,
            factory.createIdentifier("headers"),
            undefined
          ),
          factory.createBindingElement(
            undefined,
            undefined,
            factory.createIdentifier("pathParams"),
            undefined
          ),
          factory.createBindingElement(
            undefined,
            undefined,
            factory.createIdentifier("queryParams"),
            undefined
          ),
        ]),
        undefined,
        factory.createTypeReferenceNode(
          factory.createIdentifier(`${pascal(prefix)}FetcherOptions`),
          [
            factory.createTypeReferenceNode(
              factory.createIdentifier("TBody"),
              undefined
            ),
            factory.createTypeReferenceNode(
              factory.createIdentifier("THeaders"),
              undefined
            ),
            factory.createTypeReferenceNode(
              factory.createIdentifier("TQueryParams"),
              undefined
            ),
            factory.createTypeReferenceNode(
              factory.createIdentifier("TPathParams"),
              undefined
            ),
          ]
        ),
        undefined
      ),
    ],
    factory.createTypeReferenceNode(factory.createIdentifier("Promise"), [
      factory.createTypeReferenceNode(
        factory.createIdentifier("TData"),
        undefined
      ),
    ]),
    factory.createBlock(
      [
        factory.createVariableStatement(
          undefined,
          factory.createVariableDeclarationList(
            [
              factory.createVariableDeclaration(
                factory.createIdentifier("response"),
                undefined,
                undefined,
                factory.createAwaitExpression(
                  factory.createCallExpression(
                    factory.createPropertyAccessExpression(
                      factory.createIdentifier("window"),
                      factory.createIdentifier("fetch")
                    ),
                    undefined,
                    [
                      factory.createCallExpression(
                        factory.createIdentifier("resolveUrl"),
                        undefined,
                        [
                          factory.createIdentifier("url"),
                          factory.createIdentifier("queryParams"),
                          factory.createIdentifier("pathParams"),
                        ]
                      ),
                      factory.createObjectLiteralExpression(
                        [
                          factory.createShorthandPropertyAssignment(
                            factory.createIdentifier("method"),
                            undefined
                          ),
                          factory.createPropertyAssignment(
                            factory.createIdentifier("body"),
                            factory.createConditionalExpression(
                              factory.createIdentifier("body"),
                              factory.createToken(ts.SyntaxKind.QuestionToken),
                              factory.createCallExpression(
                                factory.createPropertyAccessExpression(
                                  factory.createIdentifier("JSON"),
                                  factory.createIdentifier("stringify")
                                ),
                                undefined,
                                [factory.createIdentifier("body")]
                              ),
                              factory.createToken(ts.SyntaxKind.ColonToken),
                              factory.createIdentifier("undefined")
                            )
                          ),
                          factory.createPropertyAssignment(
                            factory.createIdentifier("headers"),
                            factory.createObjectLiteralExpression(
                              [
                                factory.createPropertyAssignment(
                                  factory.createStringLiteral("Content-Type"),
                                  factory.createStringLiteral(
                                    "application/json"
                                  )
                                ),
                                factory.createSpreadAssignment(
                                  factory.createIdentifier("headers")
                                ),
                              ],
                              true
                            )
                          ),
                        ],
                        true
                      ),
                    ]
                  )
                )
              ),
            ],
            ts.NodeFlags.Const |
              ts.NodeFlags.AwaitContext |
              ts.NodeFlags.ContextFlags |
              ts.NodeFlags.TypeExcludesFlags
          )
        ),
        factory.createIfStatement(
          factory.createPrefixUnaryExpression(
            ts.SyntaxKind.ExclamationToken,
            factory.createPropertyAccessExpression(
              factory.createIdentifier("response"),
              factory.createIdentifier("ok")
            )
          ),
          factory.createBlock(
            [
              factory.createThrowStatement(
                factory.createNewExpression(
                  factory.createIdentifier("Error"),
                  undefined,
                  [factory.createStringLiteral("Network response was not ok")]
                )
              ),
            ],
            true
          ),
          undefined
        ),
        factory.createReturnStatement(
          factory.createAwaitExpression(
            factory.createCallExpression(
              factory.createPropertyAccessExpression(
                factory.createIdentifier("response"),
                factory.createIdentifier("json")
              ),
              undefined,
              []
            )
          )
        ),
      ],
      true
    )
  ),
  factory.createVariableStatement(
    undefined,
    factory.createVariableDeclarationList(
      [
        factory.createVariableDeclaration(
          factory.createIdentifier("resolveUrl"),
          undefined,
          undefined,
          factory.createArrowFunction(
            undefined,
            undefined,
            [
              factory.createParameterDeclaration(
                undefined,
                undefined,
                undefined,
                factory.createIdentifier("url"),
                undefined,
                factory.createKeywordTypeNode(ts.SyntaxKind.StringKeyword),
                undefined
              ),
              factory.createParameterDeclaration(
                undefined,
                undefined,
                undefined,
                factory.createIdentifier("queryParams"),
                undefined,
                factory.createTypeReferenceNode(
                  factory.createIdentifier("Record"),
                  [
                    factory.createKeywordTypeNode(ts.SyntaxKind.StringKeyword),
                    factory.createKeywordTypeNode(ts.SyntaxKind.UnknownKeyword),
                  ]
                ),
                factory.createObjectLiteralExpression([], false)
              ),
              factory.createParameterDeclaration(
                undefined,
                undefined,
                undefined,
                factory.createIdentifier("pathParams"),
                undefined,
                factory.createTypeReferenceNode(
                  factory.createIdentifier("Record"),
                  [
                    factory.createKeywordTypeNode(ts.SyntaxKind.StringKeyword),
                    factory.createKeywordTypeNode(ts.SyntaxKind.StringKeyword),
                  ]
                ),
                factory.createObjectLiteralExpression([], false)
              ),
            ],
            undefined,
            factory.createToken(ts.SyntaxKind.EqualsGreaterThanToken),
            factory.createBlock(
              [
                factory.createVariableStatement(
                  undefined,
                  factory.createVariableDeclarationList(
                    [
                      factory.createVariableDeclaration(
                        factory.createIdentifier("query"),
                        undefined,
                        undefined,
                        factory.createCallExpression(
                          factory.createPropertyAccessExpression(
                            factory.createIdentifier("qs"),
                            factory.createIdentifier("stringify")
                          ),
                          undefined,
                          [factory.createIdentifier("queryParams")]
                        )
                      ),
                    ],
                    ts.NodeFlags.Let
                  )
                ),
                factory.createIfStatement(
                  factory.createIdentifier("query"),
                  factory.createExpressionStatement(
                    factory.createBinaryExpression(
                      factory.createIdentifier("query"),
                      factory.createToken(ts.SyntaxKind.EqualsToken),
                      factory.createTemplateExpression(
                        factory.createTemplateHead("?", "?"),
                        [
                          factory.createTemplateSpan(
                            factory.createIdentifier("query"),
                            factory.createTemplateTail("", "")
                          ),
                        ]
                      )
                    )
                  ),
                  undefined
                ),
                factory.createReturnStatement(
                  factory.createBinaryExpression(
                    factory.createCallExpression(
                      factory.createPropertyAccessExpression(
                        factory.createIdentifier("url"),
                        factory.createIdentifier("replace")
                      ),
                      undefined,
                      [
                        factory.createRegularExpressionLiteral("/\\{\\w*\\}/g"),
                        factory.createArrowFunction(
                          undefined,
                          undefined,
                          [
                            factory.createParameterDeclaration(
                              undefined,
                              undefined,
                              undefined,
                              factory.createIdentifier("key"),
                              undefined,
                              undefined,
                              undefined
                            ),
                          ],
                          undefined,
                          factory.createToken(
                            ts.SyntaxKind.EqualsGreaterThanToken
                          ),
                          factory.createElementAccessExpression(
                            factory.createIdentifier("pathParams"),
                            factory.createCallExpression(
                              factory.createPropertyAccessExpression(
                                factory.createIdentifier("key"),
                                factory.createIdentifier("slice")
                              ),
                              undefined,
                              [
                                factory.createNumericLiteral("1"),
                                factory.createPrefixUnaryExpression(
                                  ts.SyntaxKind.MinusToken,
                                  factory.createNumericLiteral("1")
                                ),
                              ]
                            )
                          )
                        ),
                      ]
                    ),
                    factory.createToken(ts.SyntaxKind.PlusToken),
                    factory.createIdentifier("query")
                  )
                ),
              ],
              true
            )
          )
        ),
      ],
      ts.NodeFlags.Const
    )
  ),
];

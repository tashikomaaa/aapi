/**
 * Utilities for handling model relations
 */

/**
 * Relation types supported by AAPI
 */
export const RelationType = {
  ONE_TO_ONE: 'one-to-one',
  ONE_TO_MANY: 'one-to-many',
  MANY_TO_MANY: 'many-to-many',
};

/**
 * Parse relation string from CLI
 * @param {string} relationStr - Relation string (e.g., "author:User", "comments:[Comment]", "tags:[Tag]:many")
 * @returns {Object} Parsed relation object
 */
export function parseRelation(relationStr) {
  const parts = relationStr.split(':');

  if (parts.length < 2) {
    throw new Error(
      `Invalid relation format: ${relationStr}. Use "field:Model" or "field:[Model]"`
    );
  }

  const fieldName = parts[0].trim();
  let modelName = parts[1].trim();
  let relationType = null;
  let isArray = false;

  // Check for array syntax [Model]
  if (modelName.startsWith('[') && modelName.endsWith(']')) {
    isArray = true;
    modelName = modelName.slice(1, -1);
  }

  // Explicit type in third part
  if (parts.length === 3) {
    const typeStr = parts[2].trim().toLowerCase();
    if (typeStr === 'one' || typeStr === 'one-to-one') {
      relationType = RelationType.ONE_TO_ONE;
      isArray = false;
    } else if (typeStr === 'many' || typeStr === 'one-to-many') {
      relationType = RelationType.ONE_TO_MANY;
      isArray = true;
    } else if (typeStr === 'many-to-many' || typeStr === 'm2m') {
      relationType = RelationType.MANY_TO_MANY;
      isArray = true;
    }
  }

  // Infer type from array syntax if not explicit
  if (!relationType) {
    if (isArray) {
      relationType = RelationType.ONE_TO_MANY;
    } else {
      relationType = RelationType.ONE_TO_ONE;
    }
  }

  return {
    fieldName,
    modelName,
    relationType,
    isArray,
  };
}

/**
 * Parse multiple relations from comma-separated string
 * @param {string} relationsStr - Relations string (e.g., "author:User,comments:[Comment]")
 * @returns {Array} Array of parsed relations
 */
export function parseRelations(relationsStr) {
  if (!relationsStr || relationsStr.trim() === '') {
    return [];
  }

  return relationsStr
    .split(',')
    .map((r) => r.trim())
    .filter((r) => r.length > 0)
    .map(parseRelation);
}

/**
 * Generate Mongoose schema field for a relation
 * @param {Object} relation - Parsed relation object
 * @returns {string} Mongoose schema field definition
 */
export function generateMongooseRelationField(relation) {
  const { fieldName, modelName, relationType } = relation;

  switch (relationType) {
    case RelationType.ONE_TO_ONE:
      return `  ${fieldName}: { type: mongoose.Schema.Types.ObjectId, ref: '${modelName}' },`;

    case RelationType.ONE_TO_MANY:
      return `  ${fieldName}: [{ type: mongoose.Schema.Types.ObjectId, ref: '${modelName}' }],`;

    case RelationType.MANY_TO_MANY:
      return `  ${fieldName}: [{ type: mongoose.Schema.Types.ObjectId, ref: '${modelName}' }],`;

    default:
      throw new Error(`Unknown relation type: ${relationType}`);
  }
}

/**
 * Generate GraphQL type field for a relation
 * @param {Object} relation - Parsed relation object
 * @returns {string} GraphQL field definition
 */
export function generateGraphQLRelationField(relation) {
  const { fieldName, modelName, isArray } = relation;

  if (isArray) {
    return `  ${fieldName}: [${modelName}!]`;
  }
  return `  ${fieldName}: ${modelName}`;
}

/**
 * Generate GraphQL input field for a relation (just IDs)
 * @param {Object} relation - Parsed relation object
 * @returns {string} GraphQL input field definition
 */
export function generateGraphQLInputField(relation) {
  const { fieldName, isArray } = relation;

  if (isArray) {
    return `  ${fieldName}Ids: [ID!]`;
  }
  return `  ${fieldName}Id: ID`;
}

/**
 * Generate populate() calls for resolver
 * @param {Array} relations - Array of parsed relations
 * @returns {string} Populate chain for mongoose query
 */
export function generatePopulateChain(relations) {
  if (!relations || relations.length === 0) {
    return '';
  }

  const populateCalls = relations.map((rel) => `.populate('${rel.fieldName}')`).join('');

  return populateCalls;
}

/**
 * Generate resolver logic to handle relation IDs in create/update
 * @param {Array} relations - Array of parsed relations
 * @returns {string} Code snippet for handling relation IDs
 */
export function generateRelationInputHandling(relations) {
  if (!relations || relations.length === 0) {
    return '  const data = input;';
  }

  const conversions = relations
    .map((rel) => {
      const idField = rel.isArray ? `${rel.fieldName}Ids` : `${rel.fieldName}Id`;
      return `    ${rel.fieldName}: input.${idField}`;
    })
    .join(',\n');

  return `  const data = {
    ...input,
${conversions}
  };`;
}

/**
 * Validate relation model exists
 * @param {string} modelName - Name of the related model
 * @param {Array} existingModels - List of existing model names
 * @returns {boolean}
 */
export function validateRelationModel(modelName, existingModels) {
  return existingModels.includes(modelName);
}

/**
 * Generate reverse relation suggestion
 * @param {string} sourceModel - Source model name
 * @param {Object} relation - Relation object
 * @returns {string} Suggestion message
 */
export function generateReverseRelationSuggestion(sourceModel, relation) {
  const { modelName, relationType } = relation;

  switch (relationType) {
    case RelationType.ONE_TO_ONE:
      return `💡 Consider adding reverse relation to ${modelName}: ${sourceModel.toLowerCase()}:${sourceModel}:one`;

    case RelationType.ONE_TO_MANY:
      return `💡 Consider adding reverse relation to ${modelName}: ${sourceModel.toLowerCase()}s:[${sourceModel}]:many`;

    case RelationType.MANY_TO_MANY:
      return `💡 Consider adding reverse relation to ${modelName}: ${sourceModel.toLowerCase()}s:[${sourceModel}]:many-to-many`;

    default:
      return '';
  }
}

/**
 * Get cascade delete code snippet
 * @param {Array} relations - Array of relations
 * @param {boolean} enableCascade - Whether to enable cascade delete
 * @returns {string} Pre-remove hook code
 */
export function generateCascadeDeleteHook(relations, enableCascade = false) {
  if (!enableCascade || !relations || relations.length === 0) {
    return '';
  }

  const deleteOperations = relations
    .filter((rel) => rel.relationType === RelationType.ONE_TO_MANY)
    .map(
      (rel) => `  // Delete related ${rel.modelName} documents
  await mongoose.model('${rel.modelName}').deleteMany({ _id: { $in: this.${rel.fieldName} } });`
    )
    .join('\n');

  if (deleteOperations.length === 0) {
    return '';
  }

  // Use first relation for schema name
  const firstRelation = relations[0];

  return `
// Cascade delete related documents
${firstRelation.modelName.toLowerCase()}Schema.pre('remove', async function (next) {
${deleteOperations}
  next();
});
`;
}

/**
 * Generate example query with populated relations
 * @param {string} modelName - Model name
 * @param {Array} relations - Array of relations
 * @returns {string} Example GraphQL query
 */
export function generateExampleQueryWithRelations(modelName, relations) {
  if (!relations || relations.length === 0) {
    return '';
  }

  const modelNameLower = modelName.toLowerCase();
  const relationFields = relations
    .map((rel) => {
      if (rel.isArray) {
        return `    ${rel.fieldName} {
      _id
      # Add ${rel.modelName} fields here
    }`;
      }
      return `    ${rel.fieldName} {
      _id
      # Add ${rel.modelName} fields here
    }`;
    })
    .join('\n');

  return `
# Example query with populated relations:
# query {
#   ${modelNameLower}s {
#     _id
#     createdAt
${relationFields}
#   }
# }
`;
}

/**
 * JSON Schema Parser - Converts JSON objects/arrays to Mongoose schemas and GraphQL types
 * @module utils/schema-parser
 */

/**
 * Infers Mongoose type from a JavaScript value
 * @param {*} value - The value to analyze
 * @returns {string} Mongoose type
 */
function inferMongooseType(value) {
  if (value === null || value === undefined) {
    return 'Mixed';
  }

  const type = typeof value;

  switch (type) {
    case 'string':
      // Check if it looks like a date
      if (/^\d{4}-\d{2}-\d{2}/.test(value)) {
        return 'Date';
      }
      // Check if it looks like an ObjectId
      if (/^[0-9a-fA-F]{24}$/.test(value)) {
        return 'ObjectId';
      }
      return 'String';

    case 'number':
      return Number.isInteger(value) ? 'Number' : 'Number';

    case 'boolean':
      return 'Boolean';

    case 'object':
      if (Array.isArray(value)) {
        if (value.length === 0) {
          return '[Mixed]';
        }
        // Get type of first element
        const elementType = inferMongooseType(value[0]);
        return `[${elementType}]`;
      }
      return 'Mixed'; // Nested object

    default:
      return 'Mixed';
  }
}

/**
 * Infers GraphQL type from a JavaScript value
 * @param {*} value - The value to analyze
 * @returns {string} GraphQL type
 */
function inferGraphQLType(value) {
  if (value === null || value === undefined) {
    return 'String';
  }

  const type = typeof value;

  switch (type) {
    case 'string':
      // Check if it looks like a date
      if (/^\d{4}-\d{2}-\d{2}/.test(value)) {
        return 'Date';
      }
      return 'String';

    case 'number':
      return Number.isInteger(value) ? 'Int' : 'Float';

    case 'boolean':
      return 'Boolean';

    case 'object':
      if (Array.isArray(value)) {
        if (value.length === 0) {
          return '[String]';
        }
        const elementType = inferGraphQLType(value[0]);
        return `[${elementType}]`;
      }
      return 'JSON'; // Nested object (use custom JSON scalar)

    default:
      return 'String';
  }
}

/**
 * Analyzes a JSON object and extracts field types
 * @param {Object|Array} data - JSON data (object or array of objects)
 * @returns {Object} Field definitions with types
 */
export function analyzeSchema(data) {
  let samples = Array.isArray(data) ? data : [data];

  // Take up to 10 samples for analysis
  samples = samples.slice(0, 10);

  const fields = {};

  // Analyze each sample
  for (const sample of samples) {
    if (typeof sample !== 'object' || sample === null) {
      continue;
    }

    for (const [key, value] of Object.entries(sample)) {
      // Skip internal MongoDB fields
      if (key === '_id' || key === '__v') {
        continue;
      }

      if (!fields[key]) {
        fields[key] = {
          name: key,
          mongooseType: inferMongooseType(value),
          graphqlType: inferGraphQLType(value),
          required: false,
          samples: [],
        };
      }

      // Collect sample values
      if (fields[key].samples.length < 3) {
        fields[key].samples.push(value);
      }

      // Check if field appears in all samples (required)
      fields[key].count = (fields[key].count || 0) + 1;
    }
  }

  // Determine if fields are required (appear in >80% of samples)
  const sampleCount = samples.length;
  for (const field of Object.values(fields)) {
    field.required = field.count / sampleCount > 0.8;
    delete field.count;
  }

  return fields;
}

/**
 * Generates Mongoose schema code from field definitions
 * @param {Object} fields - Field definitions from analyzeSchema
 * @returns {string} Mongoose schema code
 */
export function generateMongooseSchema(fields) {
  const fieldLines = Object.entries(fields).map(([name, field]) => {
    const typeStr = field.mongooseType;
    const requiredStr = field.required ? ', required: true' : '';

    if (typeStr.startsWith('[')) {
      // Array type
      return `  ${name}: { type: ${typeStr}${requiredStr} }`;
    } else if (typeStr === 'Mixed') {
      return `  ${name}: { type: mongoose.Schema.Types.Mixed${requiredStr} }`;
    } else if (typeStr === 'ObjectId') {
      return `  ${name}: { type: mongoose.Schema.Types.ObjectId, ref: 'TODO'${requiredStr} }`;
    } else {
      return `  ${name}: { type: ${typeStr}${requiredStr} }`;
    }
  });

  return `{\n${fieldLines.join(',\n')}\n}`;
}

/**
 * Generates GraphQL type definition from field definitions
 * @param {string} typeName - Name of the GraphQL type
 * @param {Object} fields - Field definitions from analyzeSchema
 * @returns {string} GraphQL type definition
 */
export function generateGraphQLType(typeName, fields) {
  const fieldLines = Object.entries(fields).map(([name, field]) => {
    const typeStr = field.graphqlType;
    const requiredStr = field.required ? '!' : '';
    return `  ${name}: ${typeStr}${requiredStr}`;
  });

  return `type ${typeName} {\n  _id: ID!\n${fieldLines.join('\n')}\n  createdAt: Date\n  updatedAt: Date\n}`;
}

/**
 * Generates GraphQL input type for mutations
 * @param {string} typeName - Name of the GraphQL type
 * @param {Object} fields - Field definitions from analyzeSchema
 * @returns {string} GraphQL input type definition
 */
export function generateGraphQLInput(typeName, fields) {
  const fieldLines = Object.entries(fields)
    .filter(([name]) => name !== '_id' && name !== 'createdAt' && name !== 'updatedAt')
    .map(([name, field]) => {
      const typeStr = field.graphqlType;
      const requiredStr = field.required ? '!' : '';
      return `  ${name}: ${typeStr}${requiredStr}`;
    });

  return `input ${typeName}Input {\n${fieldLines.join('\n')}\n}`;
}

/**
 * Generates resolver functions for CRUD operations
 * @param {string} typeName - Name of the type (PascalCase)
 * @param {Object} _fields - Field definitions from analyzeSchema (reserved for future use)
 * @returns {string} Resolver code
 */
export function generateResolvers(typeName, _fields) {
  const varName = typeName.charAt(0).toLowerCase() + typeName.slice(1);
  const pluralName = `${varName}s`;

  return `import ${typeName} from '../../models/${typeName}.js';

export default {
  Query: {
    ${pluralName}: async () => ${typeName}.find().lean(),
    ${varName}: async (_, { id }) => {
      const result = await ${typeName}.findById(id).lean();
      if (!result) throw new Error('${typeName} not found');
      return result;
    },
  },
  Mutation: {
    create${typeName}: async (_, { input }) => ${typeName}.create(input),
    update${typeName}: async (_, { id, input }) => {
      const result = await ${typeName}.findByIdAndUpdate(
        id,
        input,
        { new: true, lean: true }
      );
      if (!result) throw new Error('${typeName} not found');
      return result;
    },
    delete${typeName}: async (_, { id }) => {
      const result = await ${typeName}.findByIdAndDelete(id);
      return !!result;
    },
  },
};
`;
}

/**
 * Generates complete GraphQL schema with queries and mutations
 * @param {string} typeName - Name of the type (PascalCase)
 * @param {Object} fields - Field definitions from analyzeSchema
 * @returns {string} Complete GraphQL schema
 */
export function generateCompleteGraphQLSchema(typeName, fields) {
  const varName = typeName.charAt(0).toLowerCase() + typeName.slice(1);
  const pluralName = `${varName}s`;

  const typeDefinition = generateGraphQLType(typeName, fields);
  const inputDefinition = generateGraphQLInput(typeName, fields);

  return `${typeDefinition}

${inputDefinition}

type Query {
  ${pluralName}: [${typeName}!]!
  ${varName}(id: ID!): ${typeName}
}

type Mutation {
  create${typeName}(input: ${typeName}Input!): ${typeName}
  update${typeName}(id: ID!, input: ${typeName}Input!): ${typeName}
  delete${typeName}(id: ID!): Boolean!
}
`;
}

/**
 * Parses JSON file and generates all necessary code
 * @param {Object|Array} data - JSON data
 * @param {string} modelName - Name for the model (PascalCase)
 * @returns {Object} Generated code for model, schema, and resolver
 */
export function parseAndGenerate(data, modelName) {
  const fields = analyzeSchema(data);
  const mongooseSchema = generateMongooseSchema(fields);
  const graphqlSchema = generateCompleteGraphQLSchema(modelName, fields);
  const resolvers = generateResolvers(modelName, fields);

  return {
    fields,
    mongooseSchema,
    graphqlSchema,
    resolvers,
    summary: {
      totalFields: Object.keys(fields).length,
      requiredFields: Object.values(fields).filter((f) => f.required).length,
      optionalFields: Object.values(fields).filter((f) => !f.required).length,
    },
  };
}

# AAPI Examples - JSON Schema Import

This folder contains example JSON files that can be imported using the `aapi import` command.

## Usage

```bash
# Preview what will be generated
aapi import examples/users.json --preview

# Import and create files
aapi import examples/users.json

# Import with custom model name
aapi import examples/products.json --name Product
```

## Examples

### users.json

Simple user schema with basic fields:

- `username` (String, required)
- `email` (String, required)
- `age` (Number, required)
- `isActive` (Boolean, required)
- `role` (String, required)
- `tags` (Array of Strings, required)
- `createdAt` (Date, required)

**Generated model:** `User.js`

### products.json

Complex product schema with nested objects and arrays:

- `name` (String, required)
- `description` (String, required)
- `price` (Number, required)
- `stock` (Number, required)
- `category` (String, required)
- `brand` (String, required)
- `isAvailable` (Boolean, required)
- `specifications` (Mixed object)
- `images` (Array of Strings)
- `ratings` (Array of Numbers)
- `tags` (Array of Strings)
- `releaseDate` (Date)
- `weight` (Number)

**Generated model:** `Product.js`

## Creating Your Own JSON Schema

### From MongoDB Export

```bash
# Export entire collection
mongoexport --collection=users --db=mydb --out=users.json --jsonArray

# Export with query
mongoexport --collection=products --db=mydb --query='{"category":"Electronics"}' --out=products.json --jsonArray

# Import into AAPI
aapi import users.json
aapi import products.json
```

### From Existing Data

Create a JSON file with an array of objects (or a single object):

```json
[
  {
    "field1": "string value",
    "field2": 123,
    "field3": true,
    "field4": ["array", "of", "strings"],
    "field5": {
      "nested": "object"
    }
  }
]
```

### Supported Data Types

AAPI automatically detects:

- **String**: `"text"` → Mongoose `String`, GraphQL `String`
- **Number**: `42` or `3.14` → Mongoose `Number`, GraphQL `Int` or `Float`
- **Boolean**: `true` or `false` → Mongoose `Boolean`, GraphQL `Boolean`
- **Date**: `"2024-01-15T10:30:00Z"` → Mongoose `Date`, GraphQL `Date`
- **Array**: `["a", "b"]` → Mongoose `[String]`, GraphQL `[String]`
- **Object**: `{"key": "value"}` → Mongoose `Mixed`, GraphQL `JSON`
- **ObjectId**: `"507f1f77bcf86cd799439011"` → Mongoose `ObjectId`, GraphQL `ID`

### Field Detection Logic

- **Required fields**: Fields present in >80% of samples are marked as required
- **Optional fields**: Fields present in <80% of samples are optional
- **Type inference**: Uses first 10 samples to determine field types
- **Arrays**: Detects element type from first array element

## Tips

1. **Multiple samples**: Provide multiple objects in your JSON array for better type detection
2. **Consistent data**: Ensure field types are consistent across samples
3. **Preview first**: Use `--preview` flag to see what will be generated before creating files
4. **Custom names**: Use `--name` flag to specify a custom model name instead of using the filename
5. **ObjectId references**: Fields with 24-character hex strings are detected as ObjectId (you'll need to manually set the `ref` property)

## Workflow Example

```bash
# 1. Export from MongoDB
mongoexport --collection=customers --db=prod --out=customers.json --jsonArray --limit=100

# 2. Preview the schema
aapi import customers.json --preview

# 3. Check the generated code
#    Review field types, required fields, etc.

# 4. Create the files
aapi import customers.json

# 5. Customize if needed
#    Edit src/models/Customer.js to add:
#    - Indexes
#    - Virtual properties
#    - Methods
#    - Hooks

# 6. Test
npm run dev
# Visit http://localhost:4000/graphql
```

## Limitations

- Nested objects are treated as `Mixed` (Mongoose) or `JSON` (GraphQL)
- Arrays must have consistent element types
- ObjectId references need manual `ref` property configuration
- Custom validation rules must be added manually
- Default values must be added manually

## Next Steps

After importing:

1. **Add indexes**: Edit the Mongoose model to add indexes for frequently queried fields
2. **Add validation**: Add custom validators for complex rules
3. **Add relationships**: Configure ObjectId `ref` properties for relationships
4. **Add methods**: Add custom instance and static methods
5. **Add hooks**: Add pre/post hooks for business logic
6. **Customize resolvers**: Add custom query logic, filtering, pagination

## Support

For issues or questions about the import feature, please open an issue on GitHub:
https://github.com/tashikomaaa/aapi/issues

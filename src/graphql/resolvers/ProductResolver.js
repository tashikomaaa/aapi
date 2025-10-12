import Product from '../../models/Product.js';

        export default {
        Query: {
        products: async () => Product.find().lean(),
                product: async (_, { id }) => Product
                        .findById(id).lean(),
                        },
                        Mutation: {
                        createProduct: async (_, { name }) => Product.create({ name }),
                                updateProduct: async (_, { id, name }) => Product.findByIdAndUpdate(id, { name
                                        }, { new: true, lean: true }),
                                        deleteProduct: async (_, { id }) => !!(await Product
                                                .findByIdAndDelete(id)),
                                                },
                                                };
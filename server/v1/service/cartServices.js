const Models = require('../models')
const cartModel = Models.carts
const cartService = {
    async addItem(userId, productId, quantity) {
        //finding item already exist for it or not
        const itemExist = await cartModel.findOne({ where: { user_id: userId, product_id: productId } })
        if (!itemExist) {
            return await cartModel.create({ user_id: userId, product_id: productId, quantity: quantity });
        } else {
            return await cartModel.update({ quantity: itemExist.quantity + quantity }, { where: { user_id: userId, product_id: productId } })
        }

    },

    async editItem(userId, productId, quantity) {
        const query = 'UPDATE cart SET quantity = ? WHERE userId = ? AND productId = ?';
        return new Promise((resolve, reject) => {
            cartModel.query(query, [quantity, userId, productId], (err, results) => {
                if (err) return reject(err);
                resolve(results);
            });
        });
    },
    async itemExist(userId, productId) {
        return await cartModel.findOne({ where: { user_id: userId, product_id: productId } })
    },
    async deleteItem(userId, productId) {
        return await cartModel.destroy({ where: { user_id: userId, product_id: productId } })
    }
};

module.exports = cartService;

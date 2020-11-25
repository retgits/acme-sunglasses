const EventSourced = require("cloudstate").EventSourced;

const entity = new EventSourced(
    "warehouse.proto",
    "com.acme.sunglasses.warehouse.Inventory",
    {
        persistenceId: "inventory",
        snapshotEvery: 5,
        includeDirs: ["./"],
        serializeFallbackToJson: true
    }
);

entity.setInitial(productID => ({}));

entity.setBehavior(inventory => {
    return {
        commandHandlers: {
            ReceiveProduct: receiveProduct,
            GetProductDetails: getProductDetails,
            UpdateStock: updateStock,
        },
        eventHandlers: {
            ProductReceived: productReceived,
            StockChanged: stockChanged,
        }
    };
});

/**
 * The commandHandlers respond to requests coming in from the gRPC gateway.
 * They are responsible to make sure events are created that can be handled
 * to update the actual status of the entity.
**/

/**
 * receiveProduct is the entry point for the API to create a new stock keeping unit (SKU)
 * it logs the product to be added to the inventory and emits a ProductReceived event
 * to add the product into the warehouse
 * @param {*} newProduct the product to add to the warehouse
 * @param {*} inventoryItem an empty placeholder
 * @param {*} ctx the Cloudstate context
 */ 
function receiveProduct(newProduct, inventoryItem, ctx) {
    console.log(`Creating a new product entry for ${newProduct.id}...`)
    ctx.emit({
        type: "ProductReceived",
        product: newProduct
    })
    return newProduct    
}

/**
 * getProductDetails is the entry point for the API to get product details and returns the current
 * stock (including additional details) of the product requested
 * @param {*} request contains the productID for which the request is made
 * @param {*} inventoryItem the stock keeping unit (the entity) that contains product details for this request
 */
function getProductDetails(request, inventoryItem) {
    console.log(`Getting inventory for ${request.id}...`)
    return inventoryItem
}

/**
 * updateStock is the entry point for the API to update the stock level of a product and returns
 * the new stock level after emitting an event to actually change the stock level in the entity.
 * @param {*} request contains the productID and change in stock
 * @param {*} inventoryItem the stock keeping unit (the entity) that contains product details for this request
 * @param {*} ctx the Cloudstate context
 */
function updateStock(request, inventoryItem, ctx) {
    console.log(`Updating inventory for ${request.id} from ${inventoryItem.stock} to ${inventoryItem.stock + request.stock}`)
    ctx.emit({
        type: "StockChanged",
        product: request
    })
    inventoryItem.stock = inventoryItem.stock + request.stock
    return inventoryItem
}

/** 
 * The eventHandlers respond to events emitted by the commandHandlers and manipulate
 * the actual state of the entities. The return items of these eventHandlers contain
 * the new state that subsequent messages will act on. 
**/

/**
 * productReceived reacts to the ProductReceived events emitted by the receiveProduct
 * function and adds the new product as an inventory item to the warehouse
 * @param {*} newProduct the product that is added to the warehouse
 * @param {*} inventoryItem the placeholder that will be filled with the new product
 */
function productReceived(newProduct, inventoryItem) {
    console.log(`Adding ${newProduct.product.id} to the warehouse...`)
    inventoryItem = newProduct.product
    return inventoryItem
}

/**
 * stockChanged reacts to the StockChanged events emitted by the updateStock function
 * and updates the stock level of the inventory item of the warehouse
 * @param {*} stockUpdate the new change in stock
 * @param {*} inventoryItem the product for which stock needs to be updated
 */
function stockChanged(stockUpdate, inventoryItem) {
    console.log(`Updating the current stock level of ${inventoryItem.id}`)
    inventoryItem.stock = inventoryItem.stock + stockUpdate.product.stock
    return inventoryItem
}

module.exports = entity;
const EventSourced = require("cloudstate").EventSourced;

const entity = new EventSourced(
    "orders.proto",
    "com.acme.sunglasses.orders.Orders",
    {
        persistenceId: "orders",
        snapshotEvery: 5,
        includeDirs: ["./"],
        serializeFallbackToJson: true
    }
);

entity.setInitial(userID => ({}));

entity.setBehavior(orders => {
    return {
        commandHandlers: {
            AddOrder: addOrder,
            GetOrderDetails: getOrderDetails,
            GetAllOrders: getOrderHistory,
        },
        eventHandlers: {
            OrderAdded: orderAdded,
        }
    };
});

/**
 * The commandHandlers respond to requests coming in from the gRPC gateway.
 * They are responsible to make sure events are created that can be handled
 * to update the actual status of the entity.
**/

/**
 * addOrder is the entry point for the API to add a new order to a user. It logs the user
 * and order data and emits an OrderAdded event to add the order into the orderhistory
 * @param {*} newOrder the order to be added
 * @param {*} orderHistory an empty placeholder
 * @param {*} ctx the Cloudstate context
 */
function addOrder(newOrder, orderHistory, ctx) {
    // AO >>>> {"userID":"1","orderID":"1234","items":[{"productID":"xyz","quantity":2,"price":10.399999618530273}]}
    console.log(`Adding order ${newOrder.orderID} to the history of user ${newOrder.userID}`)
    ctx.emit({
        type: "OrderAdded",
        order: newOrder
    })
    return newOrder
}

/**
 * getOrderDetails is the entry point for the API that returns a single order for
 * a given user. If the order is not found, an error is thrown.
 * @param {*} request the user to get the order history for and the orderID to find
 * @param {*} orderHistory the entire state for the user (the entity) from which to filter the order
 * @param {*} ctx the Cloudstate context
 */
function getOrderDetails(request, orderHistory, ctx) {
    console.log(`GOD >>>> ${JSON.stringify(request)}`)
    console.log(`GOD >>>> ${JSON.stringify(orderHistory)}`)

    let found = orderHistory.orders.find(order => {
        if(order.orderID == request.orderID) {
            return order
        }
    })

    if (!found) {
        ctx.fail(`Unable to find ${request.orderID} for user ${request.userID}`)
    }

    return found
}

/**
 * getOrderHistory is the entry point for the API that returns the entire order history for
 * a given user
 * @param {*} request the user to get the order history for
 * @param {*} orderHistory the entire state for the user (the entity)
 */
function getOrderHistory(request, orderHistory) {
    console.log(`Getting all orders for ${request.userID}`)
    return orderHistory
}

/** 
 * The eventHandlers respond to events emitted by the commandHandlers and manipulate
 * the actual state of the entities. The return items of these eventHandlers contain
 * the new state that subsequent messages will act on. 
**/

function orderAdded(orderInfo, orderHistory) {
    console.log(`Updating the order history for ${orderInfo.order.userID}`)

    if(orderHistory.orders) {
        orderHistory.orders.push(orderInfo.order)
    } else {
        orderHistory = {
            userID: orderInfo.order.userID,
            orders: new Array(orderInfo.order)
        }
    }

    return orderHistory
}

module.exports = entity;
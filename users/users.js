const EventSourced = require("cloudstate").EventSourced;

const entity = new EventSourced(
    "users.proto",
    "com.acme.sunglasses.users.Users",
    {
        persistenceId: "users",
        snapshotEvery: 5,
        includeDirs: ["./"],
        serializeFallbackToJson: true
    }
);

entity.setInitial(userID => ({}));

entity.setBehavior(users => {
    return {
        commandHandlers: {
            AddUser: addUser,
            GetUserDetails: getUserDetails,
            UpdateUserOrders: updateUserOrders,
        },
        eventHandlers: {
            UserCreated: userCreated,
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
 * addUser is the entry point for the API to create a new user. It logs the user
 * to be added to the system and emits a UserCreated event to add the user into
 * the system
 * @param {*} newUser the user to be added
 * @param {*} userInfo an empty placeholder
 * @param {*} ctx the Cloudstate context
 */
function addUser(newUser, userInfo, ctx) {
    console.log(`Creating a new user for ${newUser.id}`)
    ctx.emit({
        type: "UserCreated",
        user: newUser
    });
    return newUser
}

/**
 * getUserDetails is the entry point for the API to get user details and returns the current
 * user data
 * @param {*} request contains the userID for which the request is made
 * @param {*} userInfo the user details (the entity) that contains user information for this request
 */
function getUserDetails(request, userInfo) {
    console.log(`Getting details for ${request.id}`)
    return userInfo
}

/**
 * updateUserOrders is the entry point for the API to add a new order to a user. The message
 * contains the userID and orderID so that you can use that to get the order details from the order
 * service
 * @param {*} request  contains the userID and orderID
 * @param {*} userInfo  the user details (the entity) that contains user information for this request
 * @param {*} ctx the Cloudstate context
 */
function updateUserOrders(request, userInfo, ctx) {
    console.log(`Adding order ${request.orderID} to ${request.id}`)
    ctx.emit({
        type: "OrderAdded",
        orderDetails: request
    });

    if(userInfo.orderID){
        userInfo.orderID.push(request.orderID)
    } else {
        userInfo.orderID = new Array(request.orderID)
    }
    
    return request
}

/** 
 * The eventHandlers respond to events emitted by the commandHandlers and manipulate
 * the actual state of the entities. The return items of these eventHandlers contain
 * the new state that subsequent messages will act on. 
**/

/**
 * userCreated reacts to the UserCreated events emitted by the addUser function and
 * adds the new user to the system
 * @param {*} newUser the user that is added to the system
 * @param {*} userInfo the placeholder that will be filled with the new user
 */
function userCreated(newUser, userInfo) {
    console.log(`Adding ${newUser.user.id} (${newUser.user.name}) to the system`)
    userInfo = newUser.user
    return userInfo
}

/**
 * orderAdded reacts to the OrderAdded events emitted by the updateUserOrders function
 * and adds a new orderID to the user
 * @param {*} orderInfo the order details to be be added
 * @param {*} userInfo the user to which the order should be added
 */
function orderAdded(orderInfo, userInfo) {
    console.log(`Updating orders for ${userInfo.id} to add ${orderInfo.orderDetails.orderID}`)

    if(userInfo.orderID){
        userInfo.orderID.push(orderInfo.orderDetails.orderID)
    } else {
        userInfo.orderID = new Array(orderInfo.orderDetails.orderID)
    }

    return userInfo
}

module.exports = entity;
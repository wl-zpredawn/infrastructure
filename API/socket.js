"use strict";

const app = require('express')();
const server = require('http').Server(app);
const io = require('socket.io')(server);
const Web3 = require('web3');

//connect
const web3 = new Web3(new Web3.providers.WebsocketProvider('ws://34.194.93.255:8546'))

// install fs and save logs to txt file

let connected = [];
let queue = [];
let processing = [];
let taskInProgress = false;


// Implemented from...  https://github.com/swarmcity/sc-protocol-docs/issues/20

/**
 * Start
 */
(function(){
    // get time in miliseconds
    const timeNow = (new Date).getTime();
    //push get FX to the queue
    const getFx = {
        nextRun: timeNow,
        interval: 300000,
        toDo: _getFx,
        publicKey: 0,
    }
    _queue(getFx, 'add');
    //push get Hashtags to the queue
    const getHashtags = {
        nextRun: timeNow,
        interval: 300000,
        toDo: _getHashtags,
        publicKey: 0,
    }
    _queue(getHashtags, 'add');
    //push get Gas Price to the queue
    const getGasPrice = {
        nextRun: timeNow,
        interval: 300000,
        toDo: _getGasPrice,
        publicKey: 0,
    }
    _queue(getGasPrice, 'add');
    //push get Health to the queue
    const getHealth = {
        nextRun: timeNow,
        interval: 300000,
        toDo: _getHealth,
        publicKey: 0,
    }
    _queue(getHealth, 'add');
    // start the queue manager
    _queueManager();
    _blockWatcher();
})();

/**
 * Connect
 */
io.on('connection', function (socket) {
    const user = {socketId: socket.id, publicKey: socket.handshake.query.publicKey};
    connected.push(user);
    const getBalance = {
        nextRun: 0,
        interval: 0,
        toDo: _getBalance,
        publicKey: user.publicKey,
    }
    _queue(getBalance, 'add');
    /**
     * Disconnect
     */
    socket.on('disconnect', () => {
        connected = connected.filter(function(obj) {
            return (obj.socketId != user.socketId);
        });
        queue = queue.filter(function(obj) {
            return (obj.publicKey != user.publicKey);
        });
    });
    /**
     * One Time Requests
     */
    socket.on('requests', (data, response) => {
        console.log('requests', data);
        response({status: 200});
    });
    socket.on('broadcastTransaction', (data, response) => {
        console.log('broadcastTransaction', data);
        response({status: 200});
    });
    socket.on('saveAvatar', (data, response) => {
        console.log('saveAvatar', data);
        response({status: 200});
    });
    socket.on('getNoonce', (data, response) => {
        console.log('getNoonce', data);
        response({status: 200});
    });
    socket.on('saveError', (data, response) => {
        console.log('saveError', data);
        response({status: 200});
    });
});

/** 
* the queue will need add, remove and return, not update!
* direction is 'add' or 'remove'
* if the direction is remove then a public key and toDo must be provided
* ensure the queue does not have duplicates
*/
function _queue(task, direction) {
    if(task && direction == 'add'){
        var isDuplicate = queue.filter(function(obj) {
            return (obj.publicKey == task.publicKey && obj.toDo == task.toDo);
        }); 
        if(isDuplicate.length == 0){
            queue.push(task);
        }
        _eventLog(task, 'add to queue');
    } else if (task && direction == 'remove'){
        queue = queue.filter(function(obj) {
            return (obj.publicKey != task.publicKey || obj.toDo != task.toDo); // Double santiy check this the "||"" feels wrong, but works!!
        });
        _eventLog(task, 'remove from queue');
    } else {
        _errorLog(task, 'unhandled queue error')
    }
}

/** 
* Each second filter the queue for tasks that need tobe done and pass them to the task schedulree
*/
function _queueManager() {
    console.log('queueManager')
    setInterval(() => { 
        const timeNow = (new Date).getTime();
        let tasksToDo = queue.filter(function(obj) {
            return (obj.nextRun <= timeNow);
        });
        _taskSheduler(tasksToDo);
    }, 1000);
}

/** 
* Watch the blockchain for a new block
*/
function _blockWatcher() {
    var subscription = web3.eth.subscribe('newBlockHeaders', function(error, result){
        if (!error){
            connected.forEach(function(data){
                const getBalance = {
                    nextRun: 0,
                    interval: 0,
                    toDo: _getBalance,
                    publicKey: data.publicKey,
                }
                _queue(getBalance, 'add');
            });
        } else {
            _errorLog('_blockWatcher', 'unhandled subscription error')
        }
    })
}

/** 
* Inserts jobs into the job schedular array as they arrive
* he scheduled jobs are processed as fast as possible, one after another
* Once a job has been completed its removed from the queue or rescheduled
*/

function _taskSheduler(actions){
    console.log(actions)
    return actions.reduce((chain, action) => {
        return chain.then(() => action.toDo(action))
        .then(val => console.log(val));
    }, Promise.resolve());
}

/**
* Tasks
*/
function _getFx(data){
    return new Promise((resolve, reject) => {
        setTimeout(function(){  
        console.log(data); 
        resolve('resolvedFromOne');
        }, 200);
    })
}

function _getHashtags(task){
    return new Promise((resolve, reject) => {
        console.log('getHashtags', task);
    })
};
function _getGasPrice(task){
    return new Promise((resolve, reject) => {
        console.log('getGasPrice', task);
    })
};
function _getHealth(task){
    return new Promise((resolve, reject) => {
        console.log('getHealth', task);
    })
};
function _getBalance(task){
    return new Promise((resolve, reject) => {
        console.log('getBalance', task);
    })
};

/**
* Logs
*/
function _eventLog(item, type) {
    //console.log(item, type)
    // start checking for a new block
    // if you find a new block get the balance for each connected user
}
function _errorLog(item, type) {
    console.log(item, type)
    // start checking for a new block
    // if you find a new block get the balance for each connected user
}

const PORT = 8011;
const HOST = '0.0.0.0';
server.listen(PORT, HOST);

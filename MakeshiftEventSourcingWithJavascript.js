"use strict";

class Event {
    constructor(type, details){
        this.type = type;
        this.details = details;
        this.change = Event.calculateEventChange(type);
        this.time = new Date(Date.now());
        this.previous = null;
        this.next = null;
    }
    static calculateEventChange(type) {
        if(type === "ADDED_SIX_PACK") return 6;
        if(type === "REMOVED_SINGLE_BEER") return -1;
        if(type === "SHOTGUNNED_BEER") return -1;
        if(type === "ADDED_SINGLE_BEER") return 1;
    }
}

class SnapShot {
    constructor(state) {
        this.type = "SNAPSHOT";
        this.state = state;
        this.time = new Date(Date.now());
        this.previous = null;
        this.next = null;
    }
}


class MakeshiftEventStream {
    constructor() {
        this.head = null;
        this.tail = null;
        this.length = 0;

        this.accumulateState = (function () {
            let state = 0;
            return function (event, change) {
                if (event === "SNAPSHOT") {
                    if(state !== change) state = change;
                    return;
                }
                if(event !== "SNAPSHOT" && event !== "RETURN") {
                    state += change;
                    return;
                }
                if (event === "RETURN") {
                    let copy = state;
                    state = 0;
                    return copy;
                }
            }
        }());
    }



    addEvent(type, details) {
        this.saveToEventStream(new Event(type, details));
    }

    //it is append-only
    //no deleting events -- because you can't go back in time
    saveToEventStream(event) {
        if (!this.head) this.head = event;
        if (this.tail) {
            this.tail.next = event;
            event.previous = this.tail;
        }
        this.tail = event;
        this.length++;
    }


    createSnapShot() {
        if (this.length < 2) return null;
        let snapshot = new SnapShot(this.buildAndReturnCurrentState());
        this.saveToEventStream(snapshot);
    }

    buildAndReturnCurrentState() {
        if (!this.length) return null;
        //build state from the beginning of the
        //event stream time-line
        let head = this.head;
        while (head) {
            this.accumulateState(head.type, head.change || head.state);
            head = head.next;
        }
        return this.accumulateState("RETURN");
    }


    rebuildStateFromSnapshot() {
        if (this.length < 2) return this.buildAndReturnCurrentState();
        //starting from the end of the event stream time-line,
        //and going backwards in time
        let tail = this.tail,
            //we are going to push events into a stack
            //until we get the most recent snapshot
            stack = [],
            counter = this.length;
        while(counter) {
            if (tail.type === "SNAPSHOT")  {
                stack.push(tail);
                //breaking out of the while loop
                //when we reach a snapshot
                break;
            }
            stack.push(tail);
            tail = tail.previous;
            counter--;
        }
        while(stack.length) {
            let event = stack.pop();
            this.accumulateState(event.type, event.change || event.state);
        }
        return this.accumulateState("RETURN");
    }

    readEventStreamReverseChron() {
        let tail = this.tail;
        while (tail) {
            console.log(`${tail.type}: ${tail.details || tail.state}   ${tail.time}`);
            tail = tail.previous;
        }
    }

    readEventStreamChron() {
        let head = this.head;
        console.log("Reading events chronologically: \n");
        while (head) {
            console.log(`${head.type}: ${head.details || head.state}   ${head.time}`);
            head = head.next;
        }
    }
}

let fridge = new MakeshiftEventStream();
fridge.addEvent("ADDED_SIX_PACK", "DAVID_BROUGHT_IT_CHA-CHING");
fridge.addEvent("REMOVED_SINGLE_BEER", "DAVID_THIRSTY");
fridge.addEvent("REMOVED_SINGLE_BEER", "DAVID_BEER_TWO");
fridge.addEvent("REMOVED_SINGLE_BEER", "CHUG_CHUG_CHUG_DAVID");
fridge.createSnapShot();
fridge.addEvent("REMOVED_SINGLE_BEER", "GO_DAVID_GO");
fridge.addEvent("REMOVED_SINGLE_BEER", "DAVID_MAYBE_ILL_HAVE_ONE_MORE");
fridge.addEvent("REMOVED_SINGLE_BEER", "DAVID_OKAY_ONE_MORE_AFTER_THIS");

fridge.readEventStreamChron();

const TIME_BETWEEN_INVOCATIONS = 5000; // Time between invocations (ms)
const NUMBER_OF_INVOCATIONS = 5;       // Number of invocations

console.info("Checking time between invocations:", TIME_BETWEEN_INVOCATIONS, ", Number of invocations:", NUMBER_OF_INVOCATIONS);

let invocationNumber = 0;
for(var number = 0; number < NUMBER_OF_INVOCATIONS; number++) {
    setTimeout(function() {
        console.info("*****", ++invocationNumber, "******")
        console.info("Checking for service worker in navigator...");
        if ("serviceWorker" in navigator) {
            console.info("Service worker found in navigator. Checking for unsupported browser message...");
            if (document.querySelector("a[href='https://support.google.com/chrome/answer/95414']")) {
                console.info("Checking cache names from service worker...");
                caches.keys().then(function (cacheNames) {
                    console.info("CacheNames:", cacheNames);
                    cacheNames.forEach(function (cacheName) {
                        console.info("Deleting cache", cacheName, "...");
                        caches.delete(cacheName).then(function (result) {
                            console.info("Cache", cacheName, "deleted:", result);
                        });
                    });
                });

                console.info("Checking service worker registrations...");
                navigator.serviceWorker.getRegistrations().then(function(registrations) {
                    console.info("Registrations:", registrations);
                    registrations.forEach(function (registration) {
                        console.info("Unregistering registration", registration, "...");
                        registration.unregister().then(function(result) {
                            console.info("Registration", registration, "unregistered:", result);
                        });
                    });
                });

                setTimeout(function() {
                    document.location.reload();
                });
            } else {
                console.info("Unsupported browser message not found.");
            }
        } else {
            console.info("Service worker not found in navigator.");
        }
    }, number * TIME_BETWEEN_INVOCATIONS);
}

const getMessages = () => {
    if(!window.dbCache) {
        const dbsPromise = indexedDB.databases()
        dbsPromise.then((databases) => {
            for(let index in databases) {
                //Wait for model-storage db to be available before calling indexedDB.open(). This is to make sure whatsapp created the model-storage DB
                if(databases[index].name === "model-storage") {
                    const request = window.indexedDB.open("model-storage");
                    request.onsuccess = () => {
                        window.dbCache = request.result;
                        //This will be called when db.delete is triggered, we need to close and set dbCache to null to trigger lookup again
                        window.dbCache.onversionchange = () => {
                            window.dbCache.close()
                            window.dbCache = null
                        };
                    }
                    request.addEventListener('error', () => {
                        console.error("Opening model-storage database failed:", event);
                    })
                }
            }
        })
    } else {
        let unreadCount = 0;
        let unreadMutedCount = 0;

        const txn = window.dbCache.transaction('chat', 'readonly');
        const store = txn.objectStore('chat');
        const query = store.getAll();
        query.onsuccess = (event) => {
            for (const chat of event.target.result) {
                if (chat.unreadCount > 0) {
                    if (chat.muteExpiration === 0 && !chat.archive) {
                        unreadCount += chat.unreadCount;
                    } else {
                        unreadMutedCount += chat.unreadCount;
                    }
                }
            }

            document.title = `(${unreadCount}) WhatsApp`;
        };

        query.addEventListener('error', (event) => {
            console.error("Loading data from database failed:", event);
        })
    }
}

setInterval(getMessages, 1000);

const electron = require("electron");
const request = {
  property: "spellCheckerEnabled",
  propertyValue: true, //Set this property to false to deactivate spell checking
};
electron.ipcRenderer.send('session-interaction', request);

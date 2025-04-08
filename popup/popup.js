document.addEventListener("DOMContentLoaded", function () {
  // all event controlled components

  // home page
  const userRequest = document.getElementById("requestInput");
  const sendButton = document.getElementById("sendButton");
  const homeView = document.getElementById("homeView");
  const settingsButton = document.getElementById("settingsButton");
  const homeTitle = document.getElementById("homeTitle");
  const notice = document.getElementById("notice");

//  settings page
  const userAPI = document.getElementById("apiInput");
  const saveButton = document.getElementById("saveButton");
  const removeButton = document.getElementById("removeButton");
  const settingsView = document.getElementById("settingsView");
  const settingsTitle = document.getElementById("settingsTitle");
  const homeButton = document.getElementById("homeButton");


// default states
// By default home page should show with home title and settings button for navigation
  sendButton.disabled = true;
  saveButton.disabled = true;
  settingsView.classList.add("hidden");
  homeButton.classList.add("hidden");
  settingsTitle.classList.add("hidden");

  // If the user has no API key, open the settings page and show settings title and 
  // home button for navigation
  chrome.storage.local.get("apiKey", ({ apiKey }) => { 
    if (!apiKey) {
      settingsView.classList.remove("hidden");
      homeButton.classList.remove("hidden");
      settingsTitle.classList.remove("hidden");
      homeView.classList.add("hidden");
      homeTitle.classList.add("hidden");
      settingsButton.classList.add("hidden");
      removeButton.classList.add("hidden");
    }
  });

  // disable button if the input field is empty
  // send button
  userRequest.addEventListener("keyup", function () {
    const userMessage = userRequest.value.trim();
    sendButton.disabled = userMessage === "";
  });

  // save button
  userAPI.addEventListener("keyup", function () {
    const userKey = userAPI.value.trim();
    saveButton.disabled = userKey === "";
  });

  // If the user presses enter, click the button
  // send button
  userRequest.addEventListener("keyup", function (event) {
    if (event.code === "Enter" && !event.shiftKey) {
      event.preventDefault();
      sendButton.click();
    }
  });
  // save button
  userAPI.addEventListener('keydown', function (event) {
    if (event.key === 'Enter') {
      event.preventDefault();  // Prevents the default "Enter" action (new line)
    }
  });
  userAPI.addEventListener("keyup", function (event) {
    if (event.code === "Enter" && !event.shiftKey) {
      event.preventDefault();
      saveButton.click();
      userAPI.value = "";
    }
  });


  // View button events
  // view home page
  homeButton.addEventListener("click", function () {
    homeView.classList.remove("hidden");
    homeTitle.classList.remove("hidden");
    settingsButton.classList.remove("hidden");
    homeButton.classList.add("hidden");
    settingsView.classList.add("hidden");
    settingsTitle.classList.add("hidden");

    console.log("GO HOME");
  });

// view settings page
  settingsButton.addEventListener("click", function () {
    settingsView.classList.remove("hidden");
    settingsTitle.classList.remove("hidden");
    homeButton.classList.remove("hidden");
    settingsButton.classList.add("hidden");
    homeView.classList.add("hidden");
    homeTitle.classList.add("hidden");
    console.log("Go settings");

    chrome.storage.local.get("apiKey", ({ apiKey }) => {
      if (apiKey) {
        userAPI.disabled = true;
        userAPI.placeholder = "API Key saved";
        saveButton.classList.add("hidden");
      }
      else {
        
      }
    });
  });

  // button events
  // send request
  sendButton.addEventListener("click", function () {
    const userInput = userRequest.value.trim();
    userRequest.value = ""
    sendButton.disabled = true;
    // Send a message to background.js with the user's input
    console.log("your query:", userInput);

    if (userInput) {
        // Get the active tab
        chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
          const tabUrl = tabs[0].url;
          // Compare URL to find that the active tab is the aws console
          const pattern = /^https:\/\/.*\.console\.aws\.amazon\.com\//;
          if (pattern.test(tabUrl)) {
            chrome.runtime.sendMessage(
              { type: "fetchData", prompt: userInput },
              (response) => {
                if (chrome.runtime.lastError) {
                  console.error("Error sending message to background:", chrome.runtime.lastError.message);
                } else if (!response) {
                  console.error("Error from OpenAI:", response);
                } else {
                  console.log("OpenAI Responded:", response.data);
                }
              }
            );
          } else {
            const pElement = document.createElement("p");
            pElement.textContent = "This tab is not the aws dashboard. You can only make requests from there";
            pElement.style.color = "rgba(255, 0 ,0 , 0.5)";
            userRequest.style.outlineColor = "rgba(255, 0 ,0 , 0.5)";

            notice.appendChild(pElement);
            // remove notice after 5 seconds
            setTimeout(() => {
              notice.removeChild(pElement);
              
            userRequest.style.outlineColor = "unset";
            }, 5000);

              // testing overlay, remove when done, overlay must show even though query will fail
  chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
    const tabId = tabs[0].id;
    
    chrome.tabs.sendMessage(tabId, {
      type: "showOverlay",
      text: `Let's see the overlay`,
    });
  });
          }
        });

    } else return;
  });

  // save api key
  saveButton.addEventListener("click", function () {
    const apiKey = userAPI.value.trim();
    userAPI.value = "";

    if(apiKey !== ""){

      chrome.storage.local.set({ apiKey: apiKey }, function () {
        console.log("API key added");
      });
     
      // remove save button and enable delete button
      saveButton.classList.add("hidden");
      removeButton.classList.remove("hidden");
      userAPI.disabled = true;
      userAPI.placeholder = "API Key saved";
    }
    else {
      console.log("No key to add")
    }

  });
  
  // remove api key
  removeButton.addEventListener("click", function () {
    chrome.storage.local.get("apiKey", ({ apiKey }) => {
      if(apiKey) {
        chrome.storage.local.remove("apiKey", function () {
        userAPI.disabled = false;
        userAPI.placeholder = "Enter your API key";
        console.log("Removed Key");
        removeButton.classList.add("hidden");
        saveButton.classList.remove("hidden");

        })
      }
      else {
        console.log("No API Key")
      }
    });
  })



});

// On routing which causes scripts to be ejected check if a list should be persisting
chrome.storage.local.get(["message","completed", "stepReached"], ({ message, completed, stepReached }) => {
  console.log(completed)
  console.log(stepReached)
  if (message && !completed) {
    createOverlay(message);
  }else if(message && completed){
    chrome.storage.local.remove(["message", "completed", "stepReached"], () => {
      console.log("Overlay and state cleared")
    })
  }else if(message === "undefined"){
    chrome.storage.local.set({ stepReached: 0 });
  }
});





chrome.runtime.onMessage.addListener((message) => {
  if (message.type === "showOverlay") {
    chrome.storage.local.set({ message: message.text });
    createOverlay(message.text);
  }
});



let hideTimeout;

function createOverlay(message) {
  let overlayDiv = document.getElementById("aws-directions");
  console.log(message);
  if (message) {
    // Create the div if it doesn't exist
    if (!overlayDiv) {
      overlayDiv = document.createElement("div");
      overlayDiv.id = "aws-directions";
      overlayDiv.classList.add("steps-card");
      document.body.appendChild(overlayDiv);

      overlayDiv.innerHTML = `
        <div>
            <div class="close-button-container">
                <button class="close-button" aria-label="Close" id="close-button">
                <span class="close-icon"></span>
                </button>
            </div>
            <h2>Step-by-Step Guide</h2>
            <ol class="steps-list" id="steps-list">
                <!-- Steps will be dynamically added here -->
            </ol>
        </div>
        `;

      const closeButton = document.getElementById("close-button");
      closeButton.addEventListener("click", () => {
        chrome.storage.local.remove("message", () => {
          console.log("Message removed");
        });
        overlayDiv.remove();
        clearTimeout(hideTimeout);
      });
    } else {
      clearList();
    }

    appendList(message);
  }

  // Auto-hide after 120 seconds, 2 minutes
  hideTimeout = setTimeout(() => {
    overlayDiv.remove();
  }, 120000);
}





function appendList(message) {
  const stepsList = document.getElementById("steps-list");
  const stepsArray = message.split(/\d+\.\s+/).filter(Boolean);

  if (stepsArray.length > 1) {
    stepsArray
      .filter(
        (step) => step.trim() !== "You are already in the correct section."
      )
      .forEach((step, index) => {
        const listItem = document.createElement("li");

        // Add the step number
        const stepNumber = document.createElement("span");
        stepNumber.classList.add("step-number");
        stepNumber.textContent = index + 1;
        listItem.appendChild(stepNumber);

        // Add the step content
        const stepContent = document.createElement("span");
        stepContent.classList.add("step-content");
        stepContent.textContent = step;
        listItem.appendChild(stepContent);

        stepsList.appendChild(listItem);
      });
  } else {
    const Item = document.createElement("li");
    // Add the content
    const stepContent = document.createElement("span");
    stepContent.classList.add("content");
    stepContent.textContent = stepsArray[0];
    Item.appendChild(stepContent);
    stepsList.appendChild(Item);
  }

  navigatingSteps(stepsArray);
}











function clearList() {
  const stepsList = document.getElementById("steps-list");
  const highlightedSteps = document.querySelectorAll(".pulse-border");

  // Remove 'pulse-border' class from all highlighted steps
  highlightedSteps.forEach((step) => {
    step.classList.remove("pulse-border");
  });

  if (stepsList) {
    stepsList.innerHTML = ""; // Clear the list content
    console.log("List cleared successfully");
  } 
  else {
    console.error("Steps list not found, can't clear!");
  }
}




async function getCurrentStepIndex(){
  const {stepReached} = await chrome.storage.local.get("stepReached");
  return stepReached || 0;
}




async function navigatingSteps(stepsArray) {
  
  let currentStepIndex = await getCurrentStepIndex();


  const highlightNextStep = () => {
    const filtered = stepsArray.filter(
      (step) => step.trim() !== "You are already in the correct section."
    );
    
    if (currentStepIndex >= stepsArray.length) {
      console.log("All steps completed!");
      return;
    }


    
    let isServiceNav = filtered[0]?.includes("Services") &&
                      (filtered[0]?.includes("dropdown") ||
                        filtered[0]?.includes("top") ||
                        filtered[0]?.includes("button"));

    let keyword = filtered[currentStepIndex]?.match(/['"]([^'"]+)['"]/);
    keyword = keyword ? keyword[1] : null;
    console.log("active keyword:", keyword);
    const lowerCaseKeyword = keyword?.toLowerCase();










    const findStepElement = () => {
      // if we're navigating the services menu
      if (isServiceNav) {

        if (currentStepIndex === 0) {
          const headerComponent = document.getElementById("awsc-nav-header");
          return headerComponent?.querySelector(`[title="${keyword}"]`);
        } else if (currentStepIndex === 1) {
          const leftPanel = document.querySelector(
            `[data-testid="awsc-nav-services-menu-left-panel"]`
          );

          return leftPanel?.querySelector(`[href*="${lowerCaseKeyword}"]`);
        } else if (currentStepIndex === 2) {
          const rightPanel = document.querySelector(
            `[data-testid="awsc-nav-services-menu-right-panel"]`
          );
          return rightPanel?.querySelector(`[href*="${lowerCaseKeyword}"]`);
        }
      }

      const hrefMatch = document.querySelector(`[href*="${lowerCaseKeyword}"]`)

      if (hrefMatch) return hrefMatch;
      let replacement = document.querySelector(
        `[href*="${keyword?.replace(" ", "")}"]`
      );
      if (replacement) return replacement;

      return [...document.querySelectorAll("span")].find(
        (span) => span.textContent.trim() === keyword)
        
    }
   



    
    const waitForStepElement = () => {
      const observer = new MutationObserver(() => {
        const stepElement = findStepElement();

        if(stepElement){
          observer.disconnect();
          handleStep(stepElement);
        }
      });
      observer.observe(document.body, { childList: true, subtree: true });
    }



    if (
      isServiceNav &&
      currentStepIndex === 2
    ) {
      waitForStepElement(); // observe BEFORE finding
    } else {
      const stepElement = findStepElement();
      if (stepElement) {
        handleStep(stepElement);
      } else {
        waitForStepElement(); // fallback observe AFTER fail
      }
    }
   

  };





  const handleStep = (stepElement) => {

    if (!stepElement.classList.contains("pulse-border")) {

      console.log("Step element found:", stepElement);
      stepElement.classList.add("pulse-border");
      
      const onClickHandler = () => {
        // After the step is clicked, move to the next step
        if (currentStepIndex < stepsArray.length - 1){
          if(currentStepIndex+1 > stepsArray.length - 1){
            chrome.storage.local.set({ completed: true });
            console.log("All steps completed!");
          }
          
          currentStepIndex++;
          chrome.storage.local.set({ stepReached: currentStepIndex });
 
          highlightNextStep(); // Move to the next step
        }
  
        // Remove the event listener once the step is completed
        stepElement.removeEventListener("click", onClickHandler);
      };
  
      // Add the click event listener to the step element
      stepElement.addEventListener("click", onClickHandler);
    };
  }

  highlightNextStep();
}

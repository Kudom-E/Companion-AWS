// On routing which causes scripts to be ejected check if a list should be persisting
chrome.storage.local.get("message", ({ message }) => {
  if (message) {
    createOverlay(message);
  }
});

chrome.runtime.onMessage.addListener((message) => {
  if (message.type === "showOverlay") {
    chrome.storage.local.set({ message: message.text });
    createOverlay(message.text);
  }
});

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
      });
    } else {
      clearList();
    }

    appendList(message);
  }

  // Auto-hide after 120 seconds, 2 minutes
  setTimeout(() => {
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
  if (stepsList) {
    stepsList.innerHTML = ""; // Clear the list content
    console.log("List cleared successfully");
  } else {
    console.error("Steps list not found, can't clear!");
  }
}

function navigatingSteps(stepsArray) {
  let currentStepIndex = 0;

  const highlightNextStep = () => {
    if (currentStepIndex >= stepsArray.length) {
      console.log("All steps completed!");
      return;
    }

    let filtered = stepsArray.filter(
      (step) => step.trim() !== "You are already in the correct section."
    );

    let keyword = filtered[currentStepIndex].match(/['"]([^'"]+)['"]/);
    keyword = keyword ? keyword[1] : null;
    console.log("active keyword:", keyword);
    const lowerCaseKeyword = keyword.toLowerCase();

    const findStepElement = () => {
      // if we're navigating the services menu
      if (
        stepsArray[0].includes("Services") &&
        (stepsArray[0].includes("dropdown") ||
          stepsArray[0].includes("top") ||
          stepsArray[0].includes("button"))
      ) {
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
      if (!document.querySelector(`[href*="${lowerCaseKeyword}"]`)) {
        let replacement = document.querySelector(
          `[href*="${keyword.replace(" ", "")}"]`
        );
        if (replacement) {
          return replacement;
        } else {
          const element = [...document.querySelectorAll("span")].find(
            (span) => span.textContent.trim() === keyword
          );
          return element;
        }
      }
      return document.querySelector(`[href*="${lowerCaseKeyword}"]`);
    };

    const observer = new MutationObserver(() => {
      let stepElement = findStepElement();

      if (stepElement && !stepElement.classList.contains("pulse-border")) {
        console.log("Step element found:", stepElement);
        stepElement.classList.add("pulse-border");

        // When the step element is clicked, moving to the next step
        const handleClick = () => {
          if (currentStepIndex < stepsArray.length - 1) {
            console.log(`Moving to step ${currentStepIndex + 1}`);
            currentStepIndex++;
            highlightNextStep(); // Call for the next step
          } else {
            console.log("All steps completed!");
          }

          // Remove the click event to clean up
          stepElement.removeEventListener("click", handleClick);
        };

        stepElement.addEventListener("click", handleClick);

        // Stop observing once the element is found and processed
        observer.disconnect();
      }
    });

    // Start observing the DOM for changes
    observer.observe(document.body, { childList: true, subtree: true });
  };

  highlightNextStep();
}

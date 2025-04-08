export function getActiveTabUrl() {
    return new Promise((resolve, reject) => {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        const activeTab = tabs[0];
        if (activeTab && activeTab.url) {
          resolve({ tab: activeTab, url: activeTab.url });
        } else {
          reject(new Error("Unable to retrieve the active tab URL."));
        }
      });
    });
  }
  
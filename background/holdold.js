// ideal example steps to use to improve prompt,gotten from user query, "find ec2"
// 1.Click on the "Services" dropdown menu at the top left corner of the page.
// 2.Select "Compute" from the dropdown menu.
// 3.Click on "EC2" to access EC2 instances.

chrome.runtime.onInstalled.addListener(function (details) {
    if (details.reason === "install") {
      chrome.storage.local.set({ isInstalled: true });
    }
  });
  
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === "fetchData") {
      const prompt = message.prompt;
      let defaultModel = "gpt-4o";
  
      // Fetch data from OpenAI
      chrome.storage.local.get("apiKey", async ({ apiKey }) => {
        if (!apiKey) {
          sendResponse({
            error: "API key not found. Please add it in settings.",
          });
          return;
        }
        chrome.tabs.query(
          { active: true, currentWindow: true },
          async function (tabs) {
            const activeTab = tabs[0];
            if (!activeTab || !activeTab.url) {
              sendResponse({ error: "Unable to retrieve the active tab URL." });
              return;
            }
            const activeTabUrl = activeTab.url;
  
            try {
              const response = await fetch(
                "https://api.openai.com/v1/chat/completions",
                {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${apiKey}`,
                  },
                  body: JSON.stringify({
                    model: defaultModel,
                    messages: [
                      {
                        role: "system",
                        content:
                          "You are an assistant for AWS services. Your task is to provide concise, actionable, and step-by-step instructions to help users perform tasks in the AWS Console or AWS CLI, based on the user's current location (URL).\n\nFollow these strict guidelines:\n\n1. **Console vs Terminal**: If the action can be performed in the AWS Console, provide console instructions only. If the action requires the CLI, provide terminal instructions only. Never mix both.\n\n2. **User's Current Location (URL)**: Base your instructions on the user's current URL. You may choose one of the following navigation paths:\n   - If the service is not already in view, start with: `Click 'Services' button at the top left.`\n   - If a relevant link (e.g., a recently visited service) is visible, begin from that link.\n\n3. **No Search Field**: Never instruct the user to type into the AWS Console search bar.\n\n4. **One Action per Instruction**: Each step must describe only one action. Do not combine actions with 'and' or similar phrasing.\n\n5. **Be Specific**: Avoid vague instructions like 'go to EC2'. Instead, use precise steps: `Click 'Services', then click 'Compute', then click 'EC2'.`\n\n6. **Current Section Awareness**: If the user is already in the correct section (as determined by the URL), **do not include a message like 'You are already in the correct section.'** Proceed directly with the next action, such as 'Click 'Launch Instance'.\n\n7. **AWS Documentation Style**: Present instructions as a numbered list with precise wording and AWS's official tone.\n\n8. **No Titles**: Begin directly from Step 1.\n\n9. **Reference Documentation**: If relevant, include a URL to the appropriate AWS documentation at the end of the instructions.\n\n10. **Limit User Guidance**: After step 3 or a similar initial action, if further user interaction is required (e.g., configuring options), do not provide excessive instructions. Allow the user to complete remaining steps manually unless further clarification is needed.",
                      },
                      {
                        role: "user",
                        content: `Transform the following query into precise, actionable instructions. Use numbered, step-by-step instructions that follow AWS documentation standards. The user is already logged in and currently viewing a specific page in the AWS Console. The current page is provided via the URL below.\n\nApply these rules when generating instructions:\n\n1. Determine if the user is already on the correct page to perform the task based on the current URL. If so, respond with: You are already in the correct section. Do not include any further navigation steps.\n\n2. If navigation is required, you may only choose one of two starting paths:\n   - If navigating from the top, begin with: Click 'Services' button at the top left.\n   - If a visible link on the page (e.g., from 'Recently visited') leads to the target location, start directly from that link.\n\n3. Never use the AWS Console search input. Do not instruct the user to type into any search bar.\n\n4. Each instruction must describe only one action. Do not combine actions or use words like 'and'.\n\n5. Focus entirely on either Console or Terminal instructions — never mix them.\n\n6. If Terminal instructions are necessary, provide CLI steps only.\n\nNow apply these rules to the following query:\n\nQuery: "${prompt}"\nCurrent URL: "${activeTabUrl}"\n\nOnly respond with step-by-step instructions or a message confirming the user is already at the correct location.`,
                      },
                    ],
                    max_tokens: 250,
                  }),
                }
              );
  
              if (!response.ok) {
                const errorText = await response.text();
                console.error("API Error Details:", errorText); // Log the full error message
                sendResponse({
                  error: `API Error: ${response.statusText}. Details: ${errorText}`,
                });
                return;
              }
  
              const data = await response.json();
              if (
                data &&
                data.choices &&
                data.choices[0] &&
                data.choices[0].message
              ) {
                sendResponse({ data: data.choices[0].message.content.trim() });
  
                chrome.tabs.sendMessage(activeTab.id, {
                  type: "showOverlay",
                  text: data.choices[0].message.content.trim(),
                });
              } else {
                sendResponse({ error: "No valid response from OpenAI." });
              }
            } catch (error) {
              console.error("Error fetching from OpenAI:", error);
              sendResponse({ error: "Failed to fetch data from OpenAI." });
            }
          }
        );
      });
  
      // Return true to indicate the response will be sent asynchronously
      return true;
    }
  });
  
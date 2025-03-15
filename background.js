// ideal example steps to use to improve prompt,gotten from user query, "find ec2"
// 1.Click on the "Services" dropdown menu at the top left corner of the page.
// 2.Select "Compute" from the dropdown menu.
// 3.Click on "EC2" to access EC2 instances.


chrome.runtime.onInstalled.addListener(function (details) {
  let defaultModel = "gpt-4";

  if (details.reason === "install") {
    chrome.storage.local.set({ isInstalled: true });
  }
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "fetchData") {
    const prompt = message.prompt;

    // Fetch data from OpenAI
    chrome.storage.local.get("apiKey", async ({ apiKey }) => {
      if (!apiKey) {
        sendResponse({
          error: "API key not found. Please add it in settings.",
        });
        return;
      }
      chrome.tabs.query({ active: true, currentWindow: true }, async function (tabs) {
        const activeTab = tabs[0];
        if (!activeTab || !activeTab.url) {
          sendResponse({ error: "Unable to retrieve the active tab URL." });
          return;
        }
        const activeTabUrl = activeTab.url;

      try {
        const response = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model: "gpt-3.5-turbo",
            messages: 
            [
              {
                "role": "system",
                "content": "You are an assistant for AWS services. Your task is to provide concise, actionable, and step-by-step instructions for users to navigate the AWS Console and perform tasks based on their current location (URL provided). \n\n**Key Guidelines:**\n1. When the action can be performed in the AWS Console, provide only console-based instructions. If the action requires using the terminal, provide terminal steps with CLI commands only.\n2. Reference AWS official documentation (when relevant) to guide users using precise steps similar to AWS documentation standards.\n3. Avoid general or vague instructions like 'Navigate to the EC2 page.' Instead, provide direct and detailed steps, e.g., 'Click the Services dropdown at the top left, select Compute, and click EC2.'\n4. Tailor the instructions based on the provided URL to minimize redundant steps. Skip service navigation steps if the user is already in the correct service section.\n5. If complex multi-step navigation is required in the Console, clearly separate each navigation or interaction as distinct steps.\n6.  Remember, do not provide a title, the response should start right away from the first step."
              },
              {
                "role": "user",
                "content": `Transform the following query into precise, actionable instructions. Use step-by-step instructions similar to the format in AWS official documentation. Assume the user is already logged in to AWS and is on a page within the console (URL provided). Do **not** include steps to log in or go to the home console. Use the user's current URL to determine their location on the AWS dashboard and only provide steps that follow from their current location. Each instruction must involve only one action.\n\n### Example for a query: **Find EC2**\n1. Click the "Services" dropdown at the top left.\n2. Select "Compute" from the dropdown menu.\n3. Click "EC2" to access the EC2 service page.\n\n### Example query when already in the service: **Modify EC2 Instance Settings** (URL: https://us-east-2.console.aws.amazon.com/ec2/home?region=us-east-2#Instances:)\n1. You are already in the EC2 instance section.\n2. Click the checkbox next to the desired instance.\n3. Select 'Actions' from the top menu.\n4. Click 'Security' and then 'Modify Security Groups.'\n\nNow apply this approach to the following query: \"${prompt}\", Current URL: \"${activeTabUrl}\". Provide only Console or Terminal instructions, based on what is required to perform the task. If terminal instructions are necessary, provide only those, and if Console instructions are required, focus entirely on those. Always reference AWS documentation URLs if available, for more detailed instructions.`
              }
            ],
            "max_tokens": 250
          })
          ,
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error("API Error Details:", errorText); // Log the full error message        
          sendResponse({ error: `API Error: ${response.statusText}. Details: ${errorText}` });
          return;
        }

        const data = await response.json();
        if (data && data.choices && data.choices[0] && data.choices[0].message) {
          sendResponse({ data: data.choices[0].message.content.trim() });

          chrome.tabs.sendMessage(activeTab.id, {
            type: "showOverlay",
            text: data.choices[0].message.content.trim()
          });

        } else {
          sendResponse({ error: "No valid response from OpenAI." });
        }
      } catch (error) {
        console.error("Error fetching from OpenAI:", error);
        sendResponse({ error: "Failed to fetch data from OpenAI." });
      }
      })
    });

    // Return true to indicate the response will be sent asynchronously
    return true;
  }
});

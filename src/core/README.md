# Auto Outfit System

The `AutoOutfitSystem` is a core module of the Outfit Tracker extension responsible for automatically detecting and applying outfit changes based on the roleplay conversation.

## Purpose

The main goal of this system is to keep the character's outfit, as tracked by the extension, synchronized with the narrative. It listens to the AI character's messages, and when it detects that the character is putting on, taking off, or changing clothes, it automatically updates the outfit data.

## How It Works

1.  **Event Listening**: When enabled, the `AutoOutfitSystem` listens for new messages from the AI character.

2.  **Conversation Analysis**: Upon receiving a new message, the system takes the last few messages from the conversation and sends them to a Large Language Model (LLM) for analysis.

3.  **LLM Prompting**: A specialized system prompt is sent along with the conversation history. This prompt instructs the LLM to act as an "outfit change detection system" and to respond with specific commands if it identifies any clothing changes.

4.  **Command Generation**: The LLM is expected to generate commands in a specific format, such as:
    -   `outfit-system_wear_topwear("a red shirt")`
    -   `outfit-system_remove_headwear()`
    -   `outfit-system_change_bottomwear("jeans (torn)")`

5.  **Command Parsing and Execution**: The `AutoOutfitSystem` parses these commands from the LLM's response. For each valid command, it calls the appropriate method on the `outfitManager` to update the character's outfit.

6.  **Feedback**: The system provides feedback to the user through pop-up notifications (toasts) to indicate that an outfit check is in progress, has completed successfully, or has failed.

## Key Components

-   **`AutoOutfitSystem` class**: The main class that orchestrates the entire process.
-   **`outfitManager`**: An instance of an outfit manager class (e.g., `NewBotOutfitManager`) that is used to apply the outfit changes.
-   **`LLMUtility`**: A utility that provides a standardized way to interact with the LLM, including handling different generation methods and connection profiles.
-   **Event Listeners**: The system uses SillyTavern's event system to listen for new messages.

### Main Methods

-   **`enable()` / `disable()`**: Start and stop the auto-outfit system.
-   **`processOutfitCommands()`**: The core method that triggers the LLM analysis and processes the results.
-   **`executeGenCommand()`**: Prepares the prompt and sends it to the LLM.
-   **`parseGeneratedText(text)`**: Extracts the `outfit-system` commands from the LLM's response.
-   **`processCommandBatch(commands)`**: Executes a series of parsed commands.
-   **`manualTrigger()`**: Allows the user to force an outfit check at any time.
-   **`setPrompt(prompt)`**: Allows for customization of the system prompt sent to the LLM.

## Error Handling

The system includes a retry mechanism for LLM calls. If the LLM fails to generate a valid response multiple times in a row, the auto-outfit system will automatically disable itself to prevent further errors and notify the user.
